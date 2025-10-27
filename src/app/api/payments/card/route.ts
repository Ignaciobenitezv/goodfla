// app/api/payments/card/route.ts
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
  // Opcionalmente podrías mandar un orderId del cliente para idempotencia
  orderId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload;

    // 1) Normalizar/validar mínimos
    const token = body.token;
    const payment_method_id = body.payment_method_id || body.paymentMethodId;
    const issuer_id = body.issuer_id ? String(body.issuer_id) : undefined;
    const installments = Number(body.installments ?? 1);

    if (!token || !payment_method_id) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la tarjeta (token o método de pago)." },
        { status: 400 }
      );
    }

    // 2) Calcular el monto en el servidor (ejemplo estático; reemplazá por tu cálculo real)
    //    Ej: leer carrito de la sesión/DB y sumar total
    const amount = await getServerAmount(); // <- implementá tu lógica
    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Monto inválido." },
        { status: 400 }
      );
    }

    // 3) Construir payload para MP
    const mpPayload = {
      token,
      transaction_amount: Number(amount),
      description: "Compra en la tienda",
      installments,
      payment_method_id,
      issuer_id,
      payer: {
        email: body.email,
        identification: body.identification, // { type: "DNI", number: "12345678" }
      },
      capture: true,
    };

    // 4) Idempotencia (recomendado)
    const idemKey =
      body.orderId ||
      crypto.createHash("sha256").update(JSON.stringify({ mpPayload, ts: Date.now() / (1000 * 60) | 0 })).digest("hex");

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

    if (!res.ok) {
      // Devolvé mensaje claro al front
      return NextResponse.json(
        {
          ok: false,
          error: data?.message || "Error procesando el pago",
          status_detail: data?.cause?.[0]?.code || data?.status_detail,
        },
        { status: res.status }
      );
    }

    // Respuesta minimal y útil
    return NextResponse.json({
      ok: true,
      id: data.id,
      status: data.status,                // approved | in_process | rejected
      status_detail: data.status_detail,  // accredited | cc_rejected_insufficient_amount | etc.
    });
  } catch (err: any) {
    console.error("❌ Error en /api/payments/card:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

// Ejemplo de cálculo del total en servidor
async function getServerAmount(): Promise<number> {
  // TODO: Traer carrito/orden desde DB o sesión y sumar precios + envío + descuentos
  // Por ahora, fijo para pruebas:
  return 19999;
}
