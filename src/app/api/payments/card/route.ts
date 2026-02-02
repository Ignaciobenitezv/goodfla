// app/api/payments/card/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@sanity/client"

type BrickItem = {
  productId?: string
  _id?: string
  talle?: string | null
  cantidad?: number
}

type BrickPayload = {
  token: string
  issuer_id?: string | number
  payment_method_id?: string // "visa", "master", etc.
  paymentMethodId?: string // a veces viene así
  installments?: number | string // cuotas
  email?: string
  identification?: { type: string; number: string }

  // ✅ para idempotencia
  orderId?: string

  // ✅ NUEVO: carrito real para calcular monto + stock
  items?: BrickItem[]
}

type CompactCartItem = { productId: string; talle?: string | null; cantidad: number }

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!, // solo lectura también sirve, pero ya tenés este
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

async function getProductSnapshot(productId: string) {
  return sanity.fetch(
    `*[_type=="producto" && _id==$id][0]{_id, nombre, precioActual, stock, talles}`,
    { id: productId }
  )
}

function getAvailable(prod: any, talle: string | null | undefined) {
  if (!prod) return 0

  if (Array.isArray(prod.talles) && talle) {
    const t = prod.talles.find((x: any) => x?.label === talle)
    return Number(t?.stock ?? 0)
  }

  return Number(prod.stock ?? 0)
}

function getUnitPrice(prod: any) {
  // Ajustá si tu campo se llama distinto.
  // Por lo que venís usando: "precioActual" es lo correcto.
  return Number(prod?.precioActual ?? 0)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload

    // 1) Normalizar datos mínimos
    const token = String(body.token || "")
    const payment_method_id = String(body.payment_method_id || body.paymentMethodId || "")
    const issuer_id = body.issuer_id != null ? String(body.issuer_id) : undefined
    const installments = Number(body.installments ?? 1)

    if (!token || !payment_method_id) {
      return NextResponse.json(
        { ok: false, error: "missing_card_data", message: "Faltan datos de la tarjeta (token o método de pago)." },
        { status: 400 }
      )
    }

    // 2) Normalizar carrito
    const items = Array.isArray(body.items) ? body.items : []
    const compactCart: CompactCartItem[] = items.map((i: any) => ({
      productId: i._id ?? i.productId,
      talle: i.talle ?? null,
      cantidad: Number(i.cantidad ?? 1),
    }))

    if (!compactCart.length) {
      return NextResponse.json(
        { ok: false, error: "empty_cart", message: "El carrito está vacío." },
        { status: 400 }
      )
    }

    const invalid = compactCart.find((x) => !x.productId)
    if (invalid) {
      return NextResponse.json(
        { ok: false, error: "invalid_item", message: "Item sin productId (Sanity _id).", details: invalid },
        { status: 400 }
      )
    }

    // 3) Chequear stock + calcular monto real desde Sanity
    const stockChecks = await Promise.all(
      compactCart.map(async (it) => {
        const prod = await getProductSnapshot(it.productId)
        const available = getAvailable(prod, it.talle)
        const unit_price = getUnitPrice(prod)
        return {
          productId: it.productId,
          talle: it.talle ?? null,
          requested: it.cantidad,
          available,
          ok: available >= it.cantidad,
          unit_price,
          nombre: prod?.nombre ?? "Producto",
        }
      })
    )

    const outOfStock = stockChecks.filter((x) => !x.ok)
    if (outOfStock.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "out_of_stock",
          message: "No hay stock suficiente para uno o más productos.",
          details: outOfStock,
        },
        { status: 409 }
      )
    }

    const amount = stockChecks.reduce((acc, x) => acc + x.unit_price * x.requested, 0)
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_amount", message: "Monto inválido calculado." },
        { status: 400 }
      )
    }

    // 4) orderId + idempotencia (clave)
    const orderId = String(body.orderId || crypto.randomUUID())
    const idemKey = orderId

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "missing_access_token", message: "MP_ACCESS_TOKEN no está definido." },
        { status: 500 }
      )
    }

    // 5) Payload MP (NO confiamos en amount del front)
    const mpPayload: any = {
      token,
      transaction_amount: amount,
      description: "Compra en la tienda",
      installments,
      payment_method_id,
      issuer_id,
      payer: {
        email: body.email,
        identification: body.identification,
      },
      capture: true,

      // ✅ Trazabilidad para el webhook
      external_reference: orderId,
      metadata: {
        orderId,
        cart: JSON.stringify(compactCart),
      },
    }

    // 6) Crear pago en MercadoPago
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify(mpPayload),
    })

    const data = await res.json().catch(() => ({}))

    // 7) Error MP → lo devolvemos claro
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.message || "payment_failed",
          status_detail: data?.cause?.[0]?.code || data?.status_detail,
          mp: data,
        },
        { status: res.status }
      )
    }

    // 8) OK (stock se descuenta por webhook)
    return NextResponse.json({
      ok: true,
      id: data.id,
      status: data.status, // approved | in_process | rejected
      status_detail: data.status_detail,
      orderId,
      amount,
    })
  } catch (err: any) {
    console.error("❌ Error en /api/payments/card:", err?.message || err, err?.cause)
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Error interno" },
      { status: 500 }
    )
  }
}
