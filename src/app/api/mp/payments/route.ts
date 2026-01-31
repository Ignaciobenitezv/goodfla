// app/api/mp/payments/route.ts
import { NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

export const runtime = "nodejs"

type CartItem = { productId: string; talle?: string | null; cantidad: number }

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

    // Validación mínima (no afecta stock; solo para trazabilidad)
    if (!cart.length) {
      console.warn("⚠️ /api/mp/payments: viene sin cart.")
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

      // ✅ metadata para trazabilidad (el webhook lee cart desde preference en tu otro flujo,
      // acá queda por auditoría si lo necesitás)
      metadata: {
        orderId,
        cart: JSON.stringify(cart),
      },
    }

    const resp: any = await payment.create({ body: payload })

    const status = String(resp?.status || "").toLowerCase()
    const paymentId = resp?.id ? String(resp.id) : null

    // ✅ Si NO está aprobado, NO descuenta stock (y tampoco lo hará hasta que webhook confirme)
    if (status !== "approved") {
      return NextResponse.json({
        ok: true,
        status,
        paymentId,
        stockDiscounted: false,
        mp: resp,
      })
    }

    // ✅ APPROVED: NO descontamos stock acá.
    // El stock se descuenta en el webhook merchant_order (fuente de verdad).
    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "missing_payment_id", details: resp },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      status,
      paymentId,
      stockDiscounted: false,
      note: "Stock will be discounted via webhook",
      mp: resp,
    })
  } catch (err: any) {
    console.error("🔥 MP payment error:", err?.message || err, err?.cause)
    return NextResponse.json(
      { error: "payment_failed", details: err?.message ?? err },
      { status: 500 }
    )
  }
}
