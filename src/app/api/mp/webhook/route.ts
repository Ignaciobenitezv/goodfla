// src/app/api/mp/webhook/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

type CartItem = { productId: string; talle?: string | null; cantidad: number }

function respond200(payload: Record<string, any>, startedAt: number) {
  console.log("✅ webhook_responding_200", { ms: Date.now() - startedAt, ...payload })
  return NextResponse.json({ ok: true, ...payload }, { status: 200 })
}

async function mpGet(url: string) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("Missing MP_ACCESS_TOKEN")

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

function pickTopicAndId(req: Request, body: any) {
  const url = new URL(req.url)

  const topic =
    url.searchParams.get("topic") ||
    url.searchParams.get("type") ||
    body?.topic ||
    body?.type

  const id =
    url.searchParams.get("id") ||
    body?.id ||
    body?.data?.id ||
    body?.resource?.split("/")?.pop()

  return { topic, id }
}

async function reserveStockAtomic(cart: CartItem[], lockId: string) {
  // Idempotencia por lockId (usa markerId)
  const existing = await sanity.getDocument(lockId)
  if ((existing as any)?.status === "processed") return { ok: true, already: true }

  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = cart.map((x) => x.productId)

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{
        _id,_rev,stock,talles[]{_key,label,stock}
      }`,
      { ids }
    )

    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const out: any[] = []
    for (const it of cart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        out.push({
          productId: it.productId,
          talle: it.talle ?? null,
          ok: false,
          reason: "product_not_found",
        })
        continue
      }

      const available =
        Array.isArray(prod.talles) && it.talle
          ? Number((prod.talles.find((t: any) => t?.label === it.talle)?.stock) ?? 0)
          : Number(prod.stock ?? 0)

      if (available < it.cantidad) {
        out.push({
          productId: it.productId,
          talle: it.talle ?? null,
          ok: false,
          requested: it.cantidad,
          available,
        })
      }
    }

    if (out.length) return { ok: false, reason: "out_of_stock", details: out }

    try {
      for (const it of cart) {
        const prod = byId.get(it.productId)

        if (Array.isArray(prod.talles) && it.talle) {
          const newTalles = (prod.talles || []).map((t: any) =>
            t?.label === it.talle
              ? { ...t, stock: Math.max(0, Number(t.stock || 0) - it.cantidad) }
              : t
          )

          await sanity.patch(prod._id).ifRevisionId(prod._rev).set({ talles: newTalles }).commit()
        } else {
          await sanity.patch(prod._id).ifRevisionId(prod._rev).dec({ stock: it.cantidad }).commit()
        }
      }

      return { ok: true }
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase()
      if (msg.includes("revision") || msg.includes("_rev") || msg.includes("conflict")) continue
      throw e
    }
  }

  return { ok: false, reason: "conflict" }
}

async function handle(req: Request) {
  const startedAt = Date.now()

  try {
    let body: any = null
    try {
      body = await req.json()
    } catch {
      // GET o body inválido
    }

    const { topic, id } = pickTopicAndId(req, body)

    console.log("📩 webhook_received", {
      method: req.method,
      topic,
      id,
      hasBody: !!body,
    })

    // Solo procesamos merchant_order
    if (topic !== "merchant_order") {
      return respond200({ ignored: true, topic }, startedAt)
    }

    if (!id) {
      console.warn("⚠️ merchant_order sin id")
      return respond200({ msg: "merchant_order_without_id" }, startedAt)
    }

    // 1) Traemos merchant order
    const order = await mpGet(`https://api.mercadopago.com/merchant_orders/${id}`)

    const payments = Array.isArray(order.payments) ? order.payments : []
    console.log("🧾 merchant_order", {
      id: order.id,
      preference_id: order.preference_id,
      payments: payments.map((p: any) => ({ id: p.id, status: p.status })),
    })

    // ✅ pago aprobado
    const approvedPayment = payments.length
      ? [...payments].reverse().find((p: any) => p.status === "approved")
      : null

    if (!approvedPayment?.id) {
      return respond200({ msg: "not_approved_yet", orderId: order.id }, startedAt)
    }

    const paymentId = String(approvedPayment.id)
    const markerId = `mp_payment_${paymentId}`

    // 2) Candado atómico (no duplica)
    const marker = await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook",
      paymentId,
      orderId: order.id,
      preferenceId: order.preference_id || null,
      createdAt: new Date().toISOString(),
      status: "processing",
    })

    // Si ya existía y no está en processing => ya se procesó o quedó en terminal
    if ((marker as any)?.status && (marker as any).status !== "processing") {
      return respond200(
        { msg: "already_processed", markerId, paymentId, status: (marker as any).status },
        startedAt
      )
    }

    // 3) Traemos preferencia (metadata)
    if (!order.preference_id) {
      await sanity.patch(markerId).set({ status: "no_preference_id" }).commit().catch(() => {})
      return respond200({ msg: "no_preference_id", orderId: order.id, markerId, paymentId }, startedAt)
    }

    const pref = await mpGet(`https://api.mercadopago.com/checkout/preferences/${order.preference_id}`)

    // ✅ si viene de card_inline, se procesa en /api/payments/card (acá se ignora)
    const source = pref?.metadata?.source
    if (source === "card_inline") {
      await sanity.patch(markerId).set({ status: "ignored_card_inline" }).commit().catch(() => {})
      return respond200({ msg: "ignored_card_inline", markerId, paymentId }, startedAt)
    }

 let cart: CartItem[] = []

const rawCart = pref?.metadata?.cart

if (Array.isArray(rawCart)) {
  // ✅ NUEVO: metadata.cart ya viene como array
  cart = rawCart as CartItem[]
} else if (typeof rawCart === "string") {
  // ✅ VIEJO: metadata.cart venía como string
  try {
    const parsed = JSON.parse(rawCart)
    if (Array.isArray(parsed)) cart = parsed as CartItem[]
  } catch (e) {
    console.warn("⚠️ No se pudo parsear metadata.cart (string)", e)
  }
} else if (rawCart && typeof rawCart === "object") {
  // ✅ por si MP devuelve objeto raro pero iterable
  const maybe = rawCart as any
  if (Array.isArray(maybe)) cart = maybe as CartItem[]
}

// (opcional pero recomendado) normalizar/validar shape mínimo
cart = (cart || [])
  .map((x: any) => ({
    productId: String(x?.productId ?? x?._id ?? "").trim(),
    talle: x?.talle ?? null,
    cantidad: Number(x?.cantidad ?? 1),
  }))
  .filter((x: any) => x.productId && x.cantidad > 0)


    if (!cart.length) {
      await sanity.patch(markerId).set({ status: "no_cart_metadata" }).commit().catch(() => {})
      return respond200(
        { msg: "no_cart_metadata", orderId: order.id, preferenceId: order.preference_id, markerId, paymentId },
        startedAt
      )
    }

    // 4) Reservar stock atómico (idempotente)
    const r = await reserveStockAtomic(cart, markerId)

    if (!r.ok) {
      await sanity
        .patch(markerId)
        .set({
          status: "stock_insufficient",
          detailsJson: JSON.stringify((r as any).details ?? []),
        })
        .commit()
        .catch(() => {})

      return respond200(
        { msg: "stock_insufficient", orderId: order.id, preferenceId: order.preference_id, markerId, paymentId },
        startedAt
      )
    }

    // 5) Procesado
    await sanity
      .patch(markerId)
      .set({ status: "processed", processedAt: new Date().toISOString() })
      .commit()
      .catch(() => {})

    return respond200(
      {
        msg: "processed_merchant_order",
        orderId: order.id,
        preferenceId: order.preference_id,
        markerId,
        paymentId,
      },
      startedAt
    )
  } catch (err: any) {
    console.error("🔥 webhook_fatal_error", { message: err?.message, stack: err?.stack })
    return respond200({ msg: "fatal_error" }, startedAt)
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
