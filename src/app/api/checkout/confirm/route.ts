// src/app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

async function mpGetSoft(url: string) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) return { __error: true, __message: "Missing MP_ACCESS_TOKEN" }

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!r.ok) {
      const t = await r.text().catch(() => "")
      return { __error: true, __message: `MP ${r.status}: ${t || "request_failed"}` }
    }
    return await r.json()
  } catch (e: any) {
    return { __error: true, __message: String(e?.message || e) }
  }
}

async function findLatestMarkerByOrderId(orderId: string) {
  if (!orderId) return null
  // Tu webhook guarda: _type:"mpWebhook", orderId, paymentId, status, createdAt
  return sanity.fetch(
    `*[_type=="mpWebhook" && orderId==$orderId] | order(createdAt desc)[0]{
      _id, status, paymentId, preferenceId, orderId, createdAt, processedAt, detailsJson
    }`,
    { orderId }
  )
}

function normalizeState(status: any): string {
  const st = String(status || "").trim()
  return st || "processing"
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
        { ok: false, error: "missing_params", message: "Enviar merchant_order_id o payment_id o orderId" },
        { status: 400 }
      )
    }

    // =========================================================
    // 1) Resolver paymentId "real"
    // =========================================================
    let paymentId: string | null = paymentIdParam ? String(paymentIdParam) : null
    let resolvedMerchantOrderId: string | null = merchantOrderId ? String(merchantOrderId) : null
    let preferenceId: string | null = null

    // Si viene merchant_order, buscamos payment approved ahí
    if (merchantOrderId) {
      const mo = await mpGetSoft(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`)
      if (!(mo as any)?.__error) {
        preferenceId = mo?.preference_id ? String(mo.preference_id) : null

        const payments: any[] = Array.isArray(mo?.payments) ? mo.payments : []
        const approved = [...payments].reverse().find((p: any) => String(p?.status || "").toLowerCase() === "approved")
        if (approved?.id) paymentId = String(approved.id)
      }
    }

    // Si viene topic payment, a veces payment_id no es resolvible todavía; no rompemos.
    if (!paymentId && paymentIdParam) {
      const pay = await mpGetSoft(`https://api.mercadopago.com/v1/payments/${paymentIdParam}`)
      if (!(pay as any)?.__error) {
        // si esto es realmente un payment
        if (pay?.id) paymentId = String(pay.id)
        if (!resolvedMerchantOrderId && pay?.order?.id) resolvedMerchantOrderId = String(pay.order.id)
      }
    }

    // =========================================================
    // 2) Fuente de verdad: SANITY marker
    // =========================================================
    let marker: any = null
    let markerId: string | null = null

    if (paymentId) {
      markerId = `mp_payment_${paymentId}`
      marker = await sanity.getDocument(markerId)
    }

    // fallback por orderId (si todavía no hay paymentId o marker)
    if (!marker && orderIdParam) {
      marker = await findLatestMarkerByOrderId(orderIdParam)
      if (marker?._id) markerId = String(marker._id)
    }

    // Si todavía no hay marker, seguimos esperando (NO es error)
    if (!marker) {
      return NextResponse.json({
        ok: true,
        state: "processing",
        processed: false,
        approved: null,
        mpStatus: null,
        paymentId: paymentId || null,
        merchantOrderId: resolvedMerchantOrderId,
        preferenceId,
        orderId: orderIdParam || null,
        markerId: null,
        reason: "marker_not_found_yet",
      })
    }

    const state = normalizeState(marker?.status)
    const processed = state === "processed"
    const failed = state === "failed_stock" || state === "stock_insufficient"

    // =========================================================
    // 3) Respuesta estable para el front
    // =========================================================
    return NextResponse.json({
      ok: true,

      // ✅ Esto es lo que tu UI tiene que mirar
      state,                // "processed" | "processing" | "failed_stock" | ...
      processed,            // boolean
      failed,               // boolean

      // ids útiles
      paymentId: marker?.paymentId ? String(marker.paymentId) : (paymentId || null),
      merchantOrderId: marker?.orderId ? String(marker.orderId) : resolvedMerchantOrderId,
      preferenceId: marker?.preferenceId ? String(marker.preferenceId) : preferenceId,
      orderId: orderIdParam || (marker?.orderId ? String(marker.orderId) : null),

      markerId: markerId,
      createdAt: marker?.createdAt || null,
      processedAt: marker?.processedAt || null,

      // debug opcional
      detailsJson: marker?.detailsJson || null,
    })
  } catch (err: any) {
    console.error("❌ /api/checkout/confirm error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "confirm_failed", message: err?.message || "confirm_failed" },
      { status: 500 }
    )
  }
}
