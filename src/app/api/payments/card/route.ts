// app/api/payments/card/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@sanity/client"

type CompactItem = {
  _id?: string
  productId?: string
  talle?: string | null
  cantidad: number
}

type BrickPayload = {
  token: string
  issuer_id?: string | number
  payment_method_id?: string
  paymentMethodId?: string
  installments?: number | string
  email?: string
  identification?: { type: string; number: string }

  // 👇 nuevo
  items?: CompactItem[]
  amount?: number
  orderId?: string
  shipping?: { type: "domicilio" | "sucursal"; cp?: string }
}

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

function toMoney(n: any) {
  const v = Number(n || 0)
  // MP acepta decimales, pero en ARS normalmente trabajás entero
  // igual dejamos 2 decimales por seguridad
  return Math.round(v * 100) / 100
}

async function getProductsSnapshot(ids: string[]) {
  // Traemos lo mínimo para calcular precio + stock
  // Ajustá campos si tu schema usa otros nombres.
  return sanity.fetch(
    `*[_type=="producto" && _id in $ids]{
      _id,
      nombre,
      stock,
      talles[]{label, stock},
      // precios comunes:
      precio,
      precioActual
    }`,
    { ids }
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
  // Prioridad: precioActual > precio
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

async function getShippingPrice(origin: string, cp?: string) {
  if (!cp) return 0
  // Reutilizamos tu endpoint existente
  const url = `${origin}/api/shipping?cp=${encodeURIComponent(cp)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return 0
  const data = await res.json().catch(() => null)
  return toMoney(data?.price ?? 0)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload

    // 1) Normalizar datos mínimos del pago
    const token = body.token
    const payment_method_id = body.payment_method_id || body.paymentMethodId
    const issuer_id = body.issuer_id != null ? String(body.issuer_id) : undefined
    const installments = Number(body.installments ?? 1)

    if (!token || !payment_method_id) {
      return NextResponse.json(
        { ok: false, error: "missing_payment_data", message: "Faltan datos de la tarjeta (token o método de pago)." },
        { status: 400 }
      )
    }

    // 2) Validar items
    const items = Array.isArray(body.items) ? body.items : []
    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "empty_cart", message: "Carrito vacío." },
        { status: 400 }
      )
    }

    // ids reales
    const ids = items
      .map((i) => String(i._id ?? i.productId ?? ""))
      .filter(Boolean)

    if (!ids.length) {
      return NextResponse.json(
        { ok: false, error: "invalid_cart", message: "Items inválidos (sin productId)." },
        { status: 400 }
      )
    }

    // 3) Traer productos y calcular subtotal + validar stock
    const prods = await getProductsSnapshot(ids)
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    let subtotal = 0
    const stockErrors: any[] = []

    for (const it of items) {
      const id = String(it._id ?? it.productId ?? "")
      const qty = Number(it.cantidad ?? 1)
      const talle = it.talle ?? null

      if (!id || !qty || qty <= 0) continue

      const prod = byId.get(id)
      if (!prod) {
        stockErrors.push({ productId: id, talle, requested: qty, available: 0, ok: false })
        continue
      }

      const available = getAvailable(prod, talle)
      if (available < qty) {
        stockErrors.push({ productId: id, talle, requested: qty, available, ok: false })
        continue
      }

      const unit = getUnitPrice(prod)
      subtotal += unit * qty
    }

    if (stockErrors.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "out_of_stock",
          message: "No hay stock suficiente para uno o más productos.",
          details: stockErrors,
        },
        { status: 409 }
      )
    }

    subtotal = toMoney(subtotal)

    // 4) Calcular envío server-side (si corresponde)
    const { origin } = new URL(req.url)
    const shippingType = body.shipping?.type === "domicilio" ? "domicilio" : "sucursal"
    const shippingPrice =
      shippingType === "domicilio" ? await getShippingPrice(origin, body.shipping?.cp) : 0

    const computedTotal = toMoney(subtotal + shippingPrice)

    if (!computedTotal || computedTotal <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_amount", message: "Monto inválido calculado." },
        { status: 400 }
      )
    }

    // (Opcional) Si querés comparar con el front para detectar diferencias:
    const clientAmount = toMoney(body.amount ?? 0)
    const diff = Math.abs(computedTotal - clientAmount)
    // tolerancia chica por redondeo
    if (clientAmount > 0 && diff > 1) {
      // no bloqueamos; cobramos el calculado real
      console.warn("Amount mismatch", { clientAmount, computedTotal, diff })
    }

    // 5) Idempotencia (orderId preferente)
    const orderId =
      body.orderId ||
      crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            ids,
            computedTotal,
            minute: Math.floor(Date.now() / 60000),
          })
        )
        .digest("hex")

    // 6) Armar payload MercadoPago
    const mpPayload: any = {
      token,
      transaction_amount: computedTotal,
      description: "Compra en la tienda",
      installments,
      payment_method_id,
      issuer_id,
      payer: {
        email: body.email,
        identification: body.identification,
      },
      capture: true,
      metadata: {
        orderId,
        shippingType,
        shippingPrice,
        subtotal,
        cart: items,
      },
    }

    // 7) Crear pago
    const mpToken = process.env.MP_ACCESS_TOKEN
    if (!mpToken) {
      return NextResponse.json(
        { ok: false, error: "missing_mp_token", message: "Falta MP_ACCESS_TOKEN" },
        { status: 500 }
      )
    }

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": String(orderId),
      },
      body: JSON.stringify(mpPayload),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "mp_error",
          message: data?.message || "Error procesando el pago",
          status_detail: data?.cause?.[0]?.code || data?.status_detail,
          mp: data,
        },
        { status: res.status }
      )
    }

    // 8) OK
    return NextResponse.json({
      ok: true,
      id: data.id,
      status: data.status, // approved | in_process | rejected
      status_detail: data.status_detail,
      orderId,
      computedTotal,
      subtotal,
      shippingPrice,
      shippingType,
    })
  } catch (err: any) {
    console.error("❌ Error en /api/payments/card:", err)
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Error interno" },
      { status: 500 }
    )
  }
}
