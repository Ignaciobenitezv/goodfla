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
  return Math.round(v * 100) / 100
}

async function getProductsSnapshot(ids: string[]) {
  return sanity.fetch(
    `*[_type=="producto" && _id in $ids]{
      _id,
      nombre,
      stock,
      talles[]{label, stock},
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
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

async function getShippingPrice(origin: string, cp?: string) {
  if (!cp) return 0
  const url = `${origin}/api/shipping?cp=${encodeURIComponent(cp)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return 0
  const data = await res.json().catch(() => null)
  return toMoney(data?.price ?? 0)
}

type CartItem = { productId: string; talle?: string | null; cantidad: number }

async function checkStock(cart: CartItem[]) {
  const checks: any[] = []

  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles[]{label, stock}}`,
      { id: it.productId }
    )

    if (!prod) {
      checks.push({
        productId: it.productId,
        talle: it.talle ?? null,
        requested: it.cantidad,
        available: 0,
        ok: false,
        reason: "product_not_found",
      })
      continue
    }

    if (Array.isArray(prod.talles) && it.talle) {
      const t = prod.talles.find((x: any) => x?.label === it.talle)
      const available = Number(t?.stock ?? 0)
      checks.push({
        productId: it.productId,
        talle: it.talle,
        requested: it.cantidad,
        available,
        ok: available >= it.cantidad,
      })
      continue
    }

    const available = Number(prod.stock ?? 0)
    checks.push({
      productId: it.productId,
      talle: it.talle ?? null,
      requested: it.cantidad,
      available,
      ok: available >= it.cantidad,
    })
  }

  return checks
}

async function descontarStock(cart: CartItem[]) {
  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles[]{label, stock}}`,
      { id: it.productId }
    )
    if (!prod) continue

    // Talles
    if (Array.isArray(prod.talles) && it.talle) {
      const newTalles = prod.talles.map((t: any) =>
        t.label === it.talle
          ? { ...t, stock: Math.max(0, Number(t.stock || 0) - it.cantidad) }
          : t
      )
      await sanity.patch(prod._id).set({ talles: newTalles }).commit()
      console.log(`✅ [card] Stock actualizado talle ${it.talle} (${it.productId})`)
      continue
    }

    // Stock global
    if (typeof prod.stock === "number") {
      await sanity.patch(prod._id).dec({ stock: it.cantidad }).commit()
      console.log(`✅ [card] Stock global actualizado (${it.productId})`)
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload

    // 1) Datos mínimos del pago
    const token = body.token
    const payment_method_id = body.payment_method_id || body.paymentMethodId
    const issuer_id = body.issuer_id != null ? String(body.issuer_id) : undefined
    const installments = Number(body.installments ?? 1)

    if (!token || !payment_method_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_payment_data",
          message: "Faltan datos de la tarjeta (token o método de pago).",
        },
        { status: 400 }
      )
    }

    // 2) Validar items
    const rawItems = Array.isArray(body.items) ? body.items : []
    if (!rawItems.length) {
      return NextResponse.json(
        { ok: false, error: "empty_cart", message: "Carrito vacío." },
        { status: 400 }
      )
    }

    const cart: CartItem[] = rawItems
      .map((i) => ({
        productId: String(i._id ?? i.productId ?? "").trim(),
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad ?? 1),
      }))
      .filter((x) => x.productId && x.cantidad > 0)

    if (!cart.length) {
      return NextResponse.json(
        { ok: false, error: "invalid_cart", message: "Items inválidos (sin productId)." },
        { status: 400 }
      )
    }

    const ids = cart.map((x) => x.productId)

    // 3) Traer snapshot para subtotal + validar stock (pre-check)
    const prods = await getProductsSnapshot(ids)
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    let subtotal = 0
    const stockErrors: any[] = []

    for (const it of cart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available: 0, ok: false })
        continue
      }

      const available = getAvailable(prod, it.talle)
      if (available < it.cantidad) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available, ok: false })
        continue
      }

      const unit = getUnitPrice(prod)
      subtotal += unit * it.cantidad
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

    // 4) Envío server-side
    const { origin } = new URL(req.url)
    const shippingType = body.shipping?.type === "domicilio" ? "domicilio" : "sucursal"
    const shippingPrice = shippingType === "domicilio"
      ? await getShippingPrice(origin, body.shipping?.cp)
      : 0

    const computedTotal = toMoney(subtotal + shippingPrice)
    if (!computedTotal || computedTotal <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_amount", message: "Monto inválido calculado." },
        { status: 400 }
      )
    }

    const clientAmount = toMoney(body.amount ?? 0)
    const diff = Math.abs(computedTotal - clientAmount)
    if (clientAmount > 0 && diff > 1) {
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

    // 6) Payload MP
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
        source: "card_inline",
        shippingType,
        shippingPrice,
        subtotal,
        cart,
      },
    }

    const mpToken = process.env.MP_ACCESS_TOKEN
    if (!mpToken) {
      return NextResponse.json(
        { ok: false, error: "missing_mp_token", message: "Falta MP_ACCESS_TOKEN" },
        { status: 500 }
      )
    }

    // 7) Crear pago en MP
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

    // 8) Si approved -> descontar stock + marker idempotente (anti doble descuento)
    const status = String(data?.status || "").toLowerCase()
    const paymentId = data?.id != null ? String(data.id) : ""
    const statusDetail = data?.status_detail != null ? String(data.status_detail) : ""

    if (status === "approved" && paymentId) {
      const markerId = `mp_payment_${paymentId}`

      const already = await sanity.getDocument(markerId)
      if (already) {
        console.log("↩️ [card] ya procesado (idempotencia):", markerId)
      } else {
        // Re-check de stock justo antes de descontar (blindaje)
        const recheck = await checkStock(cart)
        const out = recheck.filter((x: any) => !x.ok)

        if (out.length) {
          await sanity.createIfNotExists({
            _id: markerId,
            _type: "mpWebhook",
            paymentId,
            orderId,
            createdAt: new Date().toISOString(),
            status: "stock_insufficient",
            source: "card_inline",
            detailsJson: JSON.stringify(out),
          })

          // OJO: pago ya está aprobado, así que esto es para revisión manual
          console.warn("⚠️ [card] pago aprobado pero sin stock al descontar", out)
        } else {
          await descontarStock(cart)

          await sanity.createIfNotExists({
            _id: markerId,
            _type: "mpWebhook",
            paymentId,
            orderId,
            createdAt: new Date().toISOString(),
            status: "processed",
            source: "card_inline",
          })
        }
      }
    }

    // 9) OK
    return NextResponse.json({
      ok: true,
      id: paymentId,
      status, // approved | in_process | rejected
      status_detail: statusDetail,
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
