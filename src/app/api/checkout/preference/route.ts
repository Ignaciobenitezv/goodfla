// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📦 Items recibidos:", body.items);

    // Armamos un carrito compacto para metadata (como string)
    const compactCart = (body.items || []).map((i: any) => {
      const productId =
        i.talle && typeof i.id === "string"
          ? i.id.replace(new RegExp(`-${i.talle}$`), "")
          : i.id;
      return {
        id: i.id,
        productId,
        talle: i.talle || null,
        cantidad: i.cantidad || 1,
      };
    });

    // 👇 Aca agregás el log para debug
    console.log("🚀 compactCart enviado a MP:", compactCart);

    const orderId = crypto.randomUUID();

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items:
          body.items?.map((i: any) => ({
            title: i.nombre || "Producto",
            quantity: i.cantidad || 1,
            unit_price: i.precio || 0,
            currency_id: "ARS",
          })) ?? [],
        back_urls: {
          success: `${process.env.PUBLIC_BASE_URL}/checkout/success`,
          failure: `${process.env.PUBLIC_BASE_URL}/checkout/failure`,
          pending: `${process.env.PUBLIC_BASE_URL}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${process.env.PUBLIC_BASE_URL}/api/mp/webhook`,
        metadata: {
          orderId,
          cart: JSON.stringify(compactCart),
        },
      }),
    });

    const data = await res.json();
    console.log("📥 Respuesta MP:", data);

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
    });
  } catch (error) {
    console.error("❌ Error en servidor:", error);
    return NextResponse.json(
      { error: "Error al crear preferencia" },
      { status: 500 }
    );
  }
}
