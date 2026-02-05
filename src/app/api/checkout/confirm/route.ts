// src/app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

async function mpGet(url: string) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("Missing MP_ACCESS_TOKEN")

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`MP ${r.status}: ${t || "request_failed"}`)
  }

  return r.json()
}

async function findSanityByOrderId(orderId: string) {
  if (!orderId) return null

  // Busca cualquier registro de webhook/marker relacionado a ese orderId
  // (tu webhook crea _type: "mpWebhook" con campos orderId, paymentId, status, etc.)
  const doc = await sanity.fetch(
    `*[_type=="mpWebhook" && orderId==$orderId] | order(createdAt desc)[0]{
      _id, status, paymentId, preferenceId, orderId, createdAt
    }`,
    { orderId }
  )

  return doc || null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    const merchantOrderId =
      url.searchParams.get("merchant_order_id") ||
      url.searchParams.get("merchantOrderId") ||
      ""

    const paymentIdParam =
      url.searchParams.get("payment_id") ||
      url.searchParams.get("collection_id") ||
      ""

    const orderIdParam = url.searchParams.get("orderId") || ""

    if (!merchantOrderId && !paymentIdParam && !orderIdParam) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          message: "Enviar merchant_order_id o payment_id o orderId",
        },
        { status: 400 }
      )
    }

    // 1) Resolver el pago y estado desde MP
    let approvedPaymentId: string | null = null
    let mpStatus: string | null = null
    let preferenceId: string | null = null
    let resolvedMerchantOrderId: string | null = merchantOrderId || null

    if (merchantOrderId) {
      const order = await mpGet(
        `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`
      )

      preferenceId = order?.preference_id ? String(order.preference_id) : null

      const payments: any[] = Array.isArray(order?.payments) ? order.payments : []

      // 1) Si existe alguno aprobado, listo
      const approvedPayment = [...payments].reverse().find((p: any) => String(p?.status || "").toLowerCase() === "approved")

      if (approvedPayment?.id) {
        approvedPaymentId = String(approvedPayment.id)
        mpStatus = "approved"
      } else {
        // 2) Si no hay aprobado, NO digas "not_approved" si aún no hay pagos
        if (!payments.length) {
          mpStatus = "pending" // o "unknown" — pero pending es mejor para UX
        } else {
          // 3) Tomamos el último estado conocido (pending/in_process/rejected/etc.)
          const last = payments[payments.length - 1]
          mpStatus = last?.status ? String(last.status).toLowerCase() : "pending"
        }
      }
    }
    else if (paymentIdParam) {
      // confirmar por payment_id directo (ideal para tarjeta inline)
      const pay = await mpGet(`https://api.mercadopago.com/v1/payments/${paymentIdParam}`)
      mpStatus = pay?.status ? String(pay.status) : "unknown"
      if (mpStatus === "approved") approvedPaymentId = String(pay.id)

      // a veces MP devuelve merchant_order_id dentro del pago
      if (!resolvedMerchantOrderId && pay?.order?.id) {
        resolvedMerchantOrderId = String(pay.order.id)
      }
    } else {
      // no tenemos MP id, solo orderId (fallback)
      mpStatus = "unknown"
    }

    const approved = mpStatus === "approved" && !!approvedPaymentId

    // 2) processed = marker (por paymentId) O doc por orderId (fallback)
    let processed = false
    let markerId: string | null = null
    let webhookStatus: string | null = null

    // 2.A) Marker por paymentId (lo que ya funcionaba)
    if (approvedPaymentId) {
      markerId = `mp_payment_${approvedPaymentId}`
      const marker = await sanity.getDocument(markerId)

      if (marker) {
        const st = String((marker as any)?.status || "")
        webhookStatus = st || "unknown"
        processed = st === "processed"
      }
    }

    // 2.B) Fallback por orderId (si todavía no hay marker o no hubo paymentId)
    // Esto no rompe nada: solo completa el caso “tarjeta inline” / “sin merchant_order_id”.
    let orderDoc: any = null
    if (!processed && orderIdParam) {
      orderDoc = await findSanityByOrderId(orderIdParam)
      if (orderDoc?._id) {
        processed = true
        webhookStatus = orderDoc?.status ? String(orderDoc.status) : "processed"
        // Si el doc tiene paymentId, lo devolvemos como ayuda:
        if (!approvedPaymentId && orderDoc?.paymentId) {
          approvedPaymentId = String(orderDoc.paymentId)
        }
        if (!preferenceId && orderDoc?.preferenceId) {
          preferenceId = String(orderDoc.preferenceId)
        }
        // markerId en este caso puede ser el _id que encontró:
        if (!markerId) markerId = String(orderDoc._id)
      }
    }

    return NextResponse.json({
      ok: true,
      approved,
      mpStatus,
      paymentId: approvedPaymentId || (paymentIdParam ? String(paymentIdParam) : null),
      merchantOrderId: resolvedMerchantOrderId,
      preferenceId,
      orderId: orderIdParam || null,

      processed,
      markerId,
      webhookStatus,
      // extra útil para debug
      processedSource: processed ? (markerId?.startsWith("mp_payment_") ? "marker" : "orderId_lookup") : null,
    })
  } catch (err: any) {
    console.error("❌ /api/checkout/confirm error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "confirm_failed", message: err?.message || "confirm_failed" },
      { status: 500 }
    )
  }
}
