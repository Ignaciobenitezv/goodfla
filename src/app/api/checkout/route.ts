import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // 👈 recibimos items desde el front
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron productos para crear la preferencia" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, // ⚡ tu Access Token
      },
      body: JSON.stringify({
        items: items.map((i: any) => ({
          title: i.nombre,
          quantity: i.cantidad,
          unit_price: i.precio,
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${process.env.PUBLIC_BASE_URL}/success`,
          failure: `${process.env.PUBLIC_BASE_URL}/failure`,
          pending: `${process.env.PUBLIC_BASE_URL}/pending`,
        },
        auto_return: "approved",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Error al crear preferencia:", data);
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ id: data.id }); // devolvemos el ID de la preferencia
  } catch (error) {
    console.error("❌ Error en servidor:", error);
    return NextResponse.json(
      { error: "Error al crear preferencia" },
      { status: 500 }
    );
  }
}
