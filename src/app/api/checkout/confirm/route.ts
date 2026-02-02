// src/app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!, // para leer marker (y si querés escribir)
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
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

    if (!merchantOrderId && !paymentIdParam) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          message: "Enviar merchant_order_id o payment_id",
        },
        { status: 400 }
      )
    }

    // 1) Resolver el pago y estado desde MP
    let approvedPaymentId: string | null = null
    let mpStatus: string | null = null
    let preferenceId: string | null = null

    if (merchantOrderId) {
      const order = await mpGet(
        `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`
      )

      preferenceId = order?.preference_id ? String(order.preference_id) : null

      // Tomamos el último approved si hubiese más de uno
      const approvedPayment = Array.isArray(order?.payments)
        ? [...order.payments].reverse().find((p: any) => p?.status === "approved")
        : null

      if (approvedPayment?.id) {
        approvedPaymentId = String(approvedPayment.id)
        mpStatus = "approved"
      } else {
        // Si no hay approved, devolvemos el "status" más útil que encontremos
        const last = Array.isArray(order?.payments) ? order.payments[order.payments.length - 1] : null
        mpStatus = last?.status ? String(last.status) : "not_approved"
      }
    } else {
      // fallback: confirmar por payment_id directo
      const pay = await mpGet(`https://api.mercadopago.com/v1/payments/${paymentIdParam}`)
      mpStatus = pay?.status ? String(pay.status) : "unknown"
      if (mpStatus === "approved") approvedPaymentId = String(pay.id)
    }

    const approved = mpStatus === "approved" && !!approvedPaymentId

    // 2) Chequear si tu webhook ya lo procesó (marker en Sanity)
    let processed = false
    let markerId: string | null = null
    let webhookStatus: string | null = null

    if (approvedPaymentId) {
      markerId = `mp_payment_${approvedPaymentId}`
      const marker = await sanity.getDocument(markerId)

      if (marker) {
        processed = true
        webhookStatus = (marker as any)?.status ? String((marker as any).status) : "processed"
      }
    }

    return NextResponse.json({
      ok: true,
      approved,
      mpStatus,
      paymentId: approvedPaymentId || (paymentIdParam ? String(paymentIdParam) : null),
      merchantOrderId: merchantOrderId || null,
      preferenceId,
      processed,
      markerId,
      webhookStatus,
    })
  } catch (err: any) {
    console.error("❌ /api/checkout/confirm error:", err?.message || err)
    return NextResponse.json(
      { ok: false, error: "confirm_failed", message: err?.message || "confirm_failed" },
      { status: 500 }
    )
  }
}
