// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📦 Items recibidos:", body.items);

    // Carrito compacto para metadata
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

    console.log("🚀 compactCart enviado a MP:", compactCart);

    // ✅ Base URL sin ngrok: SITE_URL (prod) o origin desde req.url
    const { origin } = new URL(req.url);
    const baseUrl = process.env.SITE_URL || origin || "http://localhost:3000";

    // ✅ Token server-side obligatorio
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error("❌ Falta MP_ACCESS_TOKEN en variables de entorno");
      return NextResponse.json(
        { error: "Missing MP_ACCESS_TOKEN" },
        { status: 500 }
      );
    }

    const orderId = crypto.randomUUID();

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,
        metadata: {
          orderId,
          cart: JSON.stringify(compactCart),
        },
      }),
      cache: "no-store",
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
