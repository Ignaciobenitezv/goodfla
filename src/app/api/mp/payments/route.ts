import { NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

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
      binary_mode: true, // en sandbox simplifica los estados
    }

    const resp = await payment.create({ body: payload })
    return NextResponse.json(resp)
  } catch (err: any) {
    console.error("🔥 MP payment error:", err?.message || err, err?.cause)
    return NextResponse.json(
      { error: "payment_failed", details: err?.message ?? err },
      { status: 500 }
    )
  }
}
