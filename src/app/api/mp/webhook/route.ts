// app/api/mp/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export const dynamic = "force-dynamic"; // 👈 evita cache en Vercel/Edge

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type CartItem = { productId: string; talle?: string | null; cantidad: number };

async function mpGet(url: string) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MP_ACCESS_TOKEN");
  }
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function descontarStock(cart: CartItem[]) {
  for (const it of cart) {
    const prod = await sanity.fetch(
      `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
      { id: it.productId }
    );

    if (!prod) continue;

    if (Array.isArray(prod.talles) && it.talle) {
      const newTalles = prod.talles.map((t: any) =>
        t.label === it.talle
          ? { ...t, stock: Math.max(0, (t.stock || 0) - it.cantidad) }
          : t
      );
      await sanity.patch(prod._id).set({ talles: newTalles }).commit();
      console.log(`✅ Stock actualizado talle ${it.talle}`);
    } else if (typeof prod.stock === "number") {
      await sanity.patch(prod._id).dec({ stock: it.cantidad }).commit();
      console.log(`✅ Stock global actualizado`);
    }
  }
}

async function handle(req: Request) {
  // Intentamos leer body (si viene POST con JSON)
  let body: any = null;
  try {
    body = await req.json();
    console.log("📩 Webhook POST body:", body);
  } catch {
    // Si es GET o no trae JSON, no pasa nada
  }

  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || body?.topic;

  // Solo procesamos merchant_order (tal como ya hacías)
  if (topic === "merchant_order") {
    const id =
      url.searchParams.get("id") ||
      body?.id ||
      body?.resource?.split("/")?.pop();
    if (!id) {
      console.warn("⚠️ merchant_order sin id");
      return NextResponse.json({ ok: false, msg: "Sin id" });
    }

    // Traemos merchant order
    const order = await mpGet(
      `https://api.mercadopago.com/merchant_orders/${id}`
    );
    console.log("🧾 merchant_order:", {
      id: order.id,
      preference_id: order.preference_id,
    });

    // Traemos la preferencia para recuperar el metadata.cart
    const pref = await mpGet(
      `https://api.mercadopago.com/checkout/preferences/${order.preference_id}`
    );

    let cart: CartItem[] = [];
    try {
      if (pref?.metadata?.cart) cart = JSON.parse(pref.metadata.cart);
    } catch (e) {
      console.warn("⚠️ No se pudo parsear metadata.cart", e);
    }

    if (!cart.length) {
  console.log("ℹ️ merchant_order sin cart en metadata");
  return NextResponse.json({ ok: true, msg: "Sin cart" });
}

// ✅ PASO A: verificar que exista un pago aprobado
const approved = Array.isArray(order.payments)
  ? order.payments.some((p: any) => p.status === "approved")
  : false;

if (!approved) {
  console.log("ℹ️ merchant_order sin pago aprobado todavía. No se descuenta stock.", {
    orderId: order.id,
    payments: order.payments?.map((p: any) => ({
      id: p.id,
      status: p.status,
    })),
  });
  return NextResponse.json({ ok: true, msg: "Not approved yet" });
}

// ✅ PASO B: idempotencia (evitar doble descuento)
const markerId = `mp_order_${order.id}`;
const alreadyProcessed = await sanity.getDocument(markerId);

if (alreadyProcessed) {
  console.log("↩️ Webhook repetido. Orden ya procesada:", markerId);
  return NextResponse.json({ ok: true, msg: "Already processed" });
}




// ⬇️ SOLO SI ESTÁ APPROVED LLEGAMOS ACÁ
await descontarStock(cart);
return NextResponse.json({ ok: true, from: "merchant_order" });
}

// Marcamos la orden como procesada ANTES de descontar
await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  orderId: order.id,
  preferenceId: order.preference_id,
  createdAt: new Date().toISOString(),
});

  // Si no es merchant_order, lo ignoramos (como antes)
  return NextResponse.json({ ok: true, ignored: true });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
