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

async function checkStock(cart: CartItem[]) {
  const checks: any[] = []

  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
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

    // talle
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

    // stock global
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
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
      { id: it.productId }
    )
    if (!prod) continue

    if (Array.isArray(prod.talles) && it.talle) {
      const newTalles = prod.talles.map((t: any) =>
        t.label === it.talle
          ? { ...t, stock: Math.max(0, (t.stock || 0) - it.cantidad) }
          : t
      )

      await sanity.patch(prod._id).set({ talles: newTalles }).commit()
      console.log(`✅ Stock actualizado talle ${it.talle} (${it.productId})`)
      continue
    }

    if (typeof prod.stock === "number") {
      await sanity.patch(prod._id).dec({ stock: it.cantidad }).commit()
      console.log(`✅ Stock global actualizado (${it.productId})`)
    }
  }
}

function pickTopicAndId(req: Request, body: any) {
  const url = new URL(req.url)

  // MercadoPago a veces usa topic o type
  const topic =
    url.searchParams.get("topic") ||
    url.searchParams.get("type") ||
    body?.topic ||
    body?.type

  // id puede venir de varias formas según el evento
  const id =
    url.searchParams.get("id") ||
    body?.id ||
    body?.data?.id ||
    body?.resource?.split("/")?.pop()

  return { topic, id }
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

    // Solo procesamos merchant_order (tu estrategia actual)
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

    // ✅ pago aprobado (último approved por las dudas)
    const approvedPayment = payments.length
      ? [...payments].reverse().find((p: any) => p.status === "approved")
      : null

    if (!approvedPayment?.id) {
      return respond200({ msg: "not_approved_yet", orderId: order.id }, startedAt)
    }

    const paymentId = String(approvedPayment.id)
    const markerId = `mp_payment_${paymentId}`

    // ✅ 2) Candado atómico: creamos marker "processing" ANTES de descontar
    // createIfNotExists es atómico por _id: evita doble descuento en concurrencia
    let marker: any
    try {
      marker = await sanity.createIfNotExists({
        _id: markerId,
        _type: "mpWebhook",
        paymentId,
        orderId: order.id,
        preferenceId: order.preference_id || null,
        createdAt: new Date().toISOString(),
        status: "processing",
      })
    } catch (e: any) {
      console.error("🔥 marker_create_error", e?.message)
      // igual 200
      return respond200({ msg: "marker_create_error", markerId, paymentId }, startedAt)
    }

    // Si ya existía y no está en processing, ya fue tratado
    if (marker?.status && marker.status !== "processing") {
      return respond200(
        { msg: "already_processed", markerId, paymentId, status: marker.status },
        startedAt
      )
    }

    // 3) Traemos preferencia (para metadata.cart)
    if (!order.preference_id) {
      // sin preference_id no podemos obtener el cart
      await sanity.patch(markerId).set({ status: "no_preference_id" }).commit().catch(() => {})
      return respond200({ msg: "no_preference_id", orderId: order.id, markerId, paymentId }, startedAt)
    }

    const pref = await mpGet(
      `https://api.mercadopago.com/checkout/preferences/${order.preference_id}`
    )

    let cart: CartItem[] = []
    try {
      if (pref?.metadata?.cart) cart = JSON.parse(pref.metadata.cart)
    } catch (e) {
      console.warn("⚠️ No se pudo parsear metadata.cart", e)
    }

    if (!cart.length) {
      await sanity.patch(markerId).set({ status: "no_cart_metadata" }).commit().catch(() => {})
      return respond200(
        { msg: "no_cart_metadata", orderId: order.id, preferenceId: order.preference_id, markerId, paymentId },
        startedAt
      )
    }

    // 4) Re-check stock (blindaje)
    const stockChecks = await checkStock(cart)
    const outOfStock = stockChecks.filter((x: any) => !x.ok)

    if (outOfStock.length) {
      await sanity
        .patch(markerId)
        .set({
          status: "stock_insufficient",
          detailsJson: JSON.stringify(outOfStock),
        })
        .commit()
        .catch(() => {})

      return respond200(
        {
          msg: "stock_insufficient",
          orderId: order.id,
          preferenceId: order.preference_id,
          markerId,
          paymentId,
        },
        startedAt
      )
    }

    // 5) Descontar stock
    await descontarStock(cart)

    // 6) Marcar como procesado
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
