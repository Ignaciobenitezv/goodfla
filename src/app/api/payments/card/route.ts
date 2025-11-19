// app/api/payments/card/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

type BrickPayload = {
  token: string;
  issuer_id?: string | number;
  payment_method_id?: string;     // "visa", "master", etc.
  paymentMethodId?: string;       // a veces viene así
  installments?: number | string; // cuotas
  email?: string;
  identification?: { type: string; number: string };
  orderId?: string;
  amount?: number;                 // 👈 monto total enviado por el front
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload;

    // 1) Normalizar datos mínimos
    const token = body.token;
    const payment_method_id =
      body.payment_method_id || body.paymentMethodId;

    const issuer_id = body.issuer_id
      ? String(body.issuer_id)
      : undefined;

    const installments = Number(body.installments ?? 1);
    const amount = Number(body.amount ?? 0);

    if (!token || !payment_method_id) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la tarjeta (token o método de pago)." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Monto inválido." },
        { status: 400 }
      );
    }

    // 2) Construir payload para Mercado Pago
    const mpPayload = {
      token,
      transaction_amount: amount,
      description: "Compra en la tienda",
      installments,
      payment_method_id,
      issuer_id,
      payer: {
        email: body.email,
        identification: body.identification,
      },
      capture: true,
    };

    // 3) Idempotencia (recomendado)
    const idemKey =
      body.orderId ||
      crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            mpPayload,
            minute: Math.floor(Date.now() / 60000),
          })
        )
        .digest("hex");

    // 4) Crear pago en Mercado Pago
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN!}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const data = await res.json();

    // 5) Si Mercado Pago devuelve error → lo devolvemos claro
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.message || "Error procesando el pago",
          status_detail: data?.cause?.[0]?.code || data?.status_detail,
        },
        { status: res.status }
      );
    }

    // 6) ÉXITO
    return NextResponse.json({
      ok: true,
      id: data.id,
      status: data.status,               // approved | in_process | rejected
      status_detail: data.status_detail, // accredited | cc_rejected_... etc.
    });
  } catch (err: any) {
    console.error("❌ Error en /api/payments/card:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
