// app/api/mp/payments/route.ts
import { NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
})

type CartItem = { productId: string; talle?: string | null; cantidad: number }

async function descontarStock(cart: CartItem[]) {
  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
      { id: it.productId }
    )

    if (!prod) continue

    // stock por talle
    if (Array.isArray(prod.talles) && it.talle) {
      const newTalles = prod.talles.map((t: any) =>
        t.label === it.talle
          ? { ...t, stock: Math.max(0, (t.stock || 0) - it.cantidad) }
          : t
      )
      await sanity.patch(prod._id).set({ talles: newTalles }).commit()
      continue
    }

    // stock global
    if (typeof prod.stock === "number") {
      await sanity.patch(prod._id).dec({ stock: it.cantidad }).commit()
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "missing_access_token", message: "MP_ACCESS_TOKEN no está definido" },
        { status: 500 }
      )
    }

    // ✅ carrito compacto (lo manda el front)
    const cart: CartItem[] = Array.isArray(body.cart) ? body.cart : []
    const orderId = body.orderId || null

    // Validación mínima para que no te “descuente cualquier cosa”
    if (!cart.length) {
      console.warn("⚠️ /api/mp/payments: viene sin cart. No se podrá descontar stock.")
    }

    const client = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(client)

    // Mapeo desde el front (tokenizado por el SDK)
    const payload = {
      transaction_amount: Number(body.transaction_amount),
      token: body.token,
      description: body.description ?? "Compra en Goodfla",
      installments: Number(body.installments ?? 1),
      payment_method_id: body.payment_method_id,
      issuer_id: body.issuer_id ? Number(body.issuer_id) : undefined,
      payer: {
        email: body.payer?.email,
        identification: {
          type: body.payer?.identification?.type,
          number: body.payer?.identification?.number,
        },
      },

      // ❌ NO binary_mode => así podés probar pending (CONT)
      // binary_mode: true,

      // ✅ metadata para trazabilidad (y futura auditoría)
      metadata: {
        orderId,
        cart: JSON.stringify(cart),
      },
    }

    const resp: any = await payment.create({ body: payload })

    const status = String(resp?.status || "").toLowerCase()
    const paymentId = resp?.id ? String(resp.id) : null

    // ✅ Si NO está aprobado, NO descuenta stock
    if (status !== "approved") {
      return NextResponse.json({
        ok: true,
        status,
        paymentId,
        stockDiscounted: false,
        mp: resp,
      })
    }

    // ✅ APPROVED: idempotencia (evitar doble descuento)
    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "missing_payment_id", details: resp },
        { status: 500 }
      )
    }

    const markerId = `mp_payment_${paymentId}`
    const alreadyProcessed = await sanity.getDocument(markerId)

    if (alreadyProcessed) {
      return NextResponse.json({
        ok: true,
        status,
        paymentId,
        stockDiscounted: false,
        msg: "Already processed",
      })
    }

    // Marcamos antes de descontar
    await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook", // reutilizás el mismo tipo que venías usando
      paymentId,
      orderId,
      createdAt: new Date().toISOString(),
    })

    // Descontamos stock
    if (cart.length) await descontarStock(cart)

    return NextResponse.json({
      ok: true,
      status,
      paymentId,
      stockDiscounted: true,
    })
  } catch (err: any) {
    console.error("🔥 MP payment error:", err?.message || err, err?.cause)
    return NextResponse.json(
      { error: "payment_failed", details: err?.message ?? err },
      { status: 500 }
    )
  }
}
