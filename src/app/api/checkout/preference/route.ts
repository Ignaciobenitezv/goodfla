// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export const runtime = "nodejs" // asegura Node.js runtime (no Edge)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log("📦 Items recibidos:", body?.items)

    // ✅ Carrito compacto para metadata (lo que usa el webhook para descontar stock)
    // Debe contener productId = _id real de Sanity
    const compactCart = (body?.items || []).map((i: any) => ({
      productId: i.productId,
      talle: i.talle || null,
      cantidad: Number(i.cantidad || 1),
    }))

    console.log("🚀 compactCart enviado a MP (metadata.cart):", compactCart)

    // ✅ Validación crítica: sin productId real, el webhook NO puede descontar stock
    const invalid = compactCart.find((x: any) => !x.productId)
    if (invalid) {
      console.error("❌ Item sin productId (Sanity _id). No se crea preferencia:", invalid)
      return NextResponse.json(
        { error: "Item sin productId (Sanity _id)", details: invalid },
        { status: 400 }
      )
    }

    // Base URL: SITE_URL (prod) o origin de la request
    const { origin } = new URL(req.url)
    const baseUrl = process.env.SITE_URL || origin || "http://localhost:3000"

    // Token server-side obligatorio
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) {
      console.error("❌ Falta MP_ACCESS_TOKEN en variables de entorno")
      return NextResponse.json({ error: "Missing MP_ACCESS_TOKEN" }, { status: 500 })
    }

    const orderId = randomUUID()

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items:
          (body?.items || []).map((i: any) => ({
            // ✅ Sumar talle al título ayuda a debuggear / identificar ventas
            title: `${i?.nombre || "Producto"}${i?.talle ? ` - Talle ${i.talle}` : ""}`,
            quantity: Number(i?.cantidad || 1),
            unit_price: Number(i?.precio || 0),
            currency_id: "ARS",
          })) ?? [],
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`,
        },
        auto_return: "approved",

        // ✅ webhook en producción (Vercel). MP lo llama server-to-server.
        notification_url: `${baseUrl}/api/mp/webhook`,

        // ✅ metadata para que el webhook recupere el carrito y descuente stock
        metadata: {
          orderId,
          cart: JSON.stringify(compactCart),
        },
      }),
      cache: "no-store",
    })

    const data = await res.json()
    console.log("📥 Respuesta MP:", data)

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    return NextResponse.json({
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
    })
  } catch (error) {
    console.error("❌ Error en servidor:", error)
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 })
  }
}
