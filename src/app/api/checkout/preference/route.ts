import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Debug para ver qué llega
    console.log("📦 Items recibidos:", body.items);

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: body.items?.map((i: any) => ({
          title: i.nombre || "Producto de prueba",
          quantity: i.cantidad || 1,
          unit_price: i.precio || 100,
          currency_id: "ARS",
        })) || [
          {
            title: "Producto de fallback",
            quantity: 1,
            unit_price: 100,
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: `${process.env.PUBLIC_BASE_URL}/success`,
          failure: `${process.env.PUBLIC_BASE_URL}/failure`,
          pending: `${process.env.PUBLIC_BASE_URL}/pending`,
        },
        auto_return: "approved",
      }),
    });

    const data = await res.json();
    console.log("📥 Respuesta MP:", data);

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ id: data.id, init_point: data.init_point });
  } catch (error) {
    console.error("❌ Error en servidor:", error);
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 });
  }
}
