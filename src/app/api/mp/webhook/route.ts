import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type CartItem = { productId: string; talle?: string | null; cantidad: number };

async function mpGet(url: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
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
  let body: any = null;
  try {
    body = await req.json();
    console.log("📩 Webhook POST body:", body);
  } catch {}

  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || body?.topic;

  // Procesamos SOLO merchant_order
  if (topic === "merchant_order") {
    const id = url.searchParams.get("id") || body?.resource?.split("/").pop();
    if (!id) return NextResponse.json({ ok: false, msg: "Sin id" });

    const order = await mpGet(`https://api.mercadopago.com/merchant_orders/${id}`);
    console.log("🧾 merchant_order:", { id: order.id, preference_id: order.preference_id });

    const pref = await mpGet(
      `https://api.mercadopago.com/checkout/preferences/${order.preference_id}`
    );

    let cart: CartItem[] = [];
    try {
      if (pref?.metadata?.cart) cart = JSON.parse(pref.metadata.cart);
    } catch {}
    if (!cart.length) return NextResponse.json({ ok: true, msg: "Sin cart" });

    await descontarStock(cart);
    return NextResponse.json({ ok: true, from: "merchant_order" });
  }

  return NextResponse.json({ ok: true, ignored: true });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
