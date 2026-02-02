// src/app/api/mp/webhook/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"

export const dynamic = "force-dynamic" // evita cache

const sanity = createClient({
  // Nota: estos NEXT_PUBLIC no son secretos; más adelante en "Seguridad"
  // conviene moverlos a SANITY_PROJECT_ID / SANITY_DATASET para server-only.
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
})

type CartItem = { productId: string; talle?: string | null; cantidad: number }

function respond200(payload: Record<string, any>, startedAt: number) {
  console.log("✅ webhook_responding_200", {
    ms: Date.now() - startedAt,
    ...payload,
  })
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
  const checks = []

  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
      { id: it.productId }
    )

    // si no existe producto, lo tratamos como sin stock (bloquea)
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

    // Talles
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

    // Stock global
    if (typeof prod.stock === "number") {
      await sanity.patch(prod._id).dec({ stock: it.cantidad }).commit()
      console.log(`✅ Stock global actualizado (${it.productId})`)
    }
  }
}

async function handle(req: Request) {
  const startedAt = Date.now()

  try {
    // Parse body (si viene)
    let body: any = null
    try {
      body = await req.json()
    } catch {
      // GET o body inválido
    }

    const url = new URL(req.url)
    const topic = url.searchParams.get("topic") || body?.topic
    const id =
      url.searchParams.get("id") || body?.id || body?.resource?.split("/")?.pop()

    // Log de entrada (minimalista, sin volcar todo el body)
    console.log("📩 webhook_received", {
      method: req.method,
      topic,
      id,
      hasBody: !!body,
    })

    // Procesamos solo merchant_order
    if (topic === "merchant_order") {
      if (!id) {
        console.warn("⚠️ merchant_order sin id")
        return respond200({ msg: "merchant_order_without_id" }, startedAt)
      }

      // 1) Traemos merchant order
      const order = await mpGet(`https://api.mercadopago.com/merchant_orders/${id}`)
      console.log("🧾 merchant_order:", {
        id: order.id,
        preference_id: order.preference_id,
        payments: Array.isArray(order.payments)
          ? order.payments.map((p: any) => ({ id: p.id, status: p.status }))
          : [],
      })

      // ✅ Obtener el pago aprobado (idempotencia por payment.id)
      const approvedPayment = Array.isArray(order.payments)
  ? [...order.payments].reverse().find((p: any) => p.status === "approved")
  : null


      if (!approvedPayment?.id) {
        console.log("ℹ️ Sin pago aprobado todavía. No se descuenta stock.", {
          orderId: order.id,
        })
        return respond200({ msg: "not_approved_yet", orderId: order.id }, startedAt)
      }

      const paymentId = String(approvedPayment.id)
      const markerId = `mp_payment_${paymentId}`

      const alreadyProcessed = await sanity.getDocument(markerId)
      if (alreadyProcessed) {
        console.log("↩️ Webhook repetido. Pago ya procesado:", markerId)
        return respond200({ msg: "already_processed", markerId, paymentId }, startedAt)
      }

      // 2) Traemos preferencia para obtener metadata.cart
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
        console.log("ℹ️ merchant_order sin cart en metadata", {
          orderId: order.id,
          preferenceId: order.preference_id,
        })
        return respond200({ msg: "no_cart_metadata", orderId: order.id }, startedAt)
      }

// ✅ 3) Re-check de stock justo antes de descontar (blindaje)
const stockChecks = await checkStock(cart)
const outOfStock = stockChecks.filter((x: any) => !x.ok)
const detailsJson = JSON.stringify(outOfStock)

if (outOfStock.length) {
  // Marcamos igual para no reintentar infinito
  await sanity.createIfNotExists({
    _id: markerId,
    _type: "mpWebhook",
    paymentId,
    orderId: order.id,
    preferenceId: order.preference_id,
    createdAt: new Date().toISOString(),
    status: "stock_insufficient",
    detailsJson,
  })

  return respond200(
    {
      msg: "stock_insufficient",
      orderId: order.id,
      preferenceId: order.preference_id,
      markerId,
      paymentId,
      detailsJson,
    },
    startedAt
  )
}

// ✅ 4) Stock OK → descontamos
await descontarStock(cart)

// ✅ 5) Marcamos como procesado (después de descontar)
await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  paymentId,
  orderId: order.id,
  preferenceId: order.preference_id,
  createdAt: new Date().toISOString(),
  status: "processed",
})


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
    }

    // Otros topics: ignorar
    return respond200({ ignored: true, topic }, startedAt)
  } catch (err: any) {
    // 🚑 CUALQUIER error termina acá (pero respondemos 200 igual)
    console.error("🔥 webhook_fatal_error", {
      message: err?.message,
      stack: err?.stack,
    })
    return respond200({ msg: "fatal_error" }, startedAt)
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
