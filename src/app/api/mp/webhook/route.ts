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
  const existing = await sanity.getDocument(lockId)
  if ((existing as any)?.status === "processed") return { ok: true, already: true }

  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = cart.map((x) => x.productId)

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{ _id,_rev,stock,talles[]{_key,label,stock} }`,
      { ids }
    )

    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const out: any[] = []
    for (const it of cart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        out.push({ productId: it.productId, talle: it.talle ?? null, ok: false, reason: "product_not_found" })
        continue
      }

      const available =
        Array.isArray(prod.talles) && it.talle
          ? Number((prod.talles.find((t: any) => t?.label === it.talle)?.stock) ?? 0)
          : Number(prod.stock ?? 0)

      if (available < it.cantidad) {
        out.push({ productId: it.productId, talle: it.talle ?? null, ok: false, requested: it.cantidad, available })
      }
    }

    if (out.length) return { ok: false, reason: "out_of_stock", details: out }

    try {
      for (const it of cart) {
        const prod = byId.get(it.productId)

        if (Array.isArray(prod.talles) && it.talle) {
          const newTalles = (prod.talles || []).map((t: any) =>
            t?.label === it.talle ? { ...t, stock: Math.max(0, Number(t.stock || 0) - it.cantidad) } : t
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

function parseCartFromPref(pref: any): CartItem[] {
  let cart: CartItem[] = []
  const rawCart = pref?.metadata?.cart

  if (Array.isArray(rawCart)) {
    cart = rawCart as CartItem[]
  } else if (typeof rawCart === "string") {
    try {
      const parsed = JSON.parse(rawCart)
      if (Array.isArray(parsed)) cart = parsed as CartItem[]
    } catch (e) {
      console.warn("⚠️ No se pudo parsear metadata.cart (string)", e)
    }
  }

  cart = (cart || [])
    .map((x: any) => ({
      productId: String(x?.productId ?? x?._id ?? "").trim(),
      talle: x?.talle ?? null,
      cantidad: Number(x?.cantidad ?? 1),
    }))
    .filter((x: any) => x.productId && x.cantidad > 0)

  return cart
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
      qs: new URL(req.url).search,
    })

    if (!topic || !id) {
      return respond200({ msg: "missing_topic_or_id", topic, id }, startedAt)
    }

    // =========================
    // 1) Resolver merchant_order + paymentId
    // =========================
    let merchantOrder: any = null
    let paymentId: string | null = null

    if (topic === "payment") {
      const payment = await mpGet(`https://api.mercadopago.com/v1/payments/${id}`)
      console.log("💳 payment", { id: payment?.id, status: payment?.status, order: payment?.order })

      if (String(payment?.status || "").toLowerCase() !== "approved") {
        return respond200({ msg: "payment_not_approved_yet", paymentId: payment?.id, status: payment?.status }, startedAt)
      }

      paymentId = String(payment?.id || "")
      const merchantOrderId =
        payment?.order?.id || payment?.order_id || payment?.merchant_order_id

      if (!merchantOrderId) {
        return respond200({ msg: "payment_without_merchant_order_id", paymentId }, startedAt)
      }

      merchantOrder = await mpGet(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`)
    } else if (topic === "merchant_order") {
      merchantOrder = await mpGet(`https://api.mercadopago.com/merchant_orders/${id}`)
    } else {
      // otros topics: ignorar pero 200
      return respond200({ ignored: true, topic }, startedAt)
    }

    const payments = Array.isArray(merchantOrder?.payments) ? merchantOrder.payments : []
    const approvedPayment = payments.length ? [...payments].reverse().find((p: any) => p.status === "approved") : null

    // Si veníamos por payment aprobado, paymentId ya lo tenemos. Sino, lo buscamos en la merchant order.
    if (!paymentId) paymentId = approvedPayment?.id ? String(approvedPayment.id) : null

    console.log("🧾 merchant_order", {
      id: merchantOrder?.id,
      preference_id: merchantOrder?.preference_id,
      payments: payments.map((p: any) => ({ id: p.id, status: p.status })),
      chosenPaymentId: paymentId,
    })

    if (!paymentId) {
      return respond200({ msg: "not_approved_yet", orderId: merchantOrder?.id }, startedAt)
    }

    const markerId = `mp_payment_${paymentId}`

    // =========================
    // 2) Candado idempotente
    // =========================
    const marker = await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook",
      paymentId,
      orderId: merchantOrder?.id,
      preferenceId: merchantOrder?.preference_id || merchantOrder?.preference_id || null,
      createdAt: new Date().toISOString(),
      status: "processing",
    })

    if ((marker as any)?.status && (marker as any).status !== "processing") {
      return respond200(
        { msg: "already_processed", markerId, paymentId, status: (marker as any).status },
        startedAt
      )
    }

    // =========================
    // 3) Traer preferencia + cart
    // =========================
    const prefId = merchantOrder?.preference_id
    if (!prefId) {
      await sanity.patch(markerId).set({ status: "no_preference_id" }).commit().catch(() => {})
      return respond200({ msg: "no_preference_id", markerId, paymentId }, startedAt)
    }

    const pref = await mpGet(`https://api.mercadopago.com/checkout/preferences/${prefId}`)

    const source = pref?.metadata?.source
    if (source === "card_inline") {
      await sanity.patch(markerId).set({ status: "ignored_card_inline" }).commit().catch(() => {})
      return respond200({ msg: "ignored_card_inline", markerId, paymentId }, startedAt)
    }

    const cart = parseCartFromPref(pref)

    if (!cart.length) {
      await sanity.patch(markerId).set({ status: "no_cart_metadata" }).commit().catch(() => {})
      return respond200({ msg: "no_cart_metadata", markerId, paymentId, preferenceId: prefId }, startedAt)
    }

    // =========================
    // 4) Reservar stock
    // =========================
    const r = await reserveStockAtomic(cart, markerId)

    if (!r.ok) {
      await sanity
        .patch(markerId)
        .set({ status: "stock_insufficient", detailsJson: JSON.stringify((r as any).details ?? []) })
        .commit()
        .catch(() => {})

      return respond200({ msg: "stock_insufficient", markerId, paymentId, preferenceId: prefId }, startedAt)
    }

    // =========================
    // 5) Procesado
    // =========================
    await sanity.patch(markerId).set({ status: "processed", processedAt: new Date().toISOString() }).commit().catch(() => {})

    return respond200({ msg: "processed", markerId, paymentId, preferenceId: prefId }, startedAt)
  } catch (err: any) {
    console.error("🔥 webhook_fatal_error", { message: err?.message, stack: err?.stack })
    return respond200({ msg: "fatal_error" }, Date.now())
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
