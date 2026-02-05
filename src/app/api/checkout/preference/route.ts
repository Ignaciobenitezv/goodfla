// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

type CompactCartItem = { productId: string; talle?: string | null; cantidad: number }

async function getProductSnapshot(productId: string) {
  return sanity.fetch(
    `*[_type=="producto" && _id==$id][0]{_id, nombre, stock, talles[]{label, stock}, precio, precioActual}`,
    { id: productId }
  )
}

function getAvailable(prod: any, talle: string | null | undefined) {
  if (!prod) return 0
  if (Array.isArray(prod.talles) && talle) {
    const t = prod.talles.find((x: any) => x?.label === talle)
    return Number(t?.stock ?? 0)
  }
  return Number(prod.stock ?? 0)
}

function getUnitPrice(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return Number(p) || 0
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const compactCart: CompactCartItem[] = (body?.items || [])
      .map((i: any) => ({
        productId: String(i._id ?? i.productId ?? "").trim(),
        talle: i.talle || null,
        cantidad: Number(i.cantidad || 1),
      }))
      .filter((x: CompactCartItem) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

    // ✅ validar stock + traer snapshot para armar items seguros
    const snaps = await Promise.all(
      compactCart.map(async (it) => {
        const prod = await getProductSnapshot(it.productId)
        const available = getAvailable(prod, it.talle)
        return { it, prod, available }
      })
    )

    const outOfStock = snaps
      .filter((x) => (x.available ?? 0) < x.it.cantidad)
      .map((x) => ({
        productId: x.it.productId,
        talle: x.it.talle ?? null,
        requested: x.it.cantidad,
        available: x.available ?? 0,
        ok: false,
      }))

    if (outOfStock.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "out_of_stock",
          message: "No hay stock suficiente para uno o más productos.",
          details: outOfStock,
        },
        { status: 409 }
      )
    }

    const { origin } = new URL(req.url)
    const baseUrl = process.env.SITE_URL || process.env.PUBLIC_BASE_URL || origin || "http://localhost:3000"

    const token = process.env.MP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_mp_token", message: "Missing MP_ACCESS_TOKEN" }, { status: 500 })
    }

    // ✅ orderId estable (útil para external_reference + idempotencia)
    const orderId = randomUUID()

    // ✅ items armados desde Sanity (no confiamos en precio del front)
    const mpItems = snaps.map(({ it, prod }) => ({
      title: `${prod?.nombre || "Producto"}${it.talle ? ` - Talle ${it.talle}` : ""}`,
      quantity: Number(it.cantidad || 1),
      unit_price: getUnitPrice(prod),
      currency_id: "ARS",
    }))

    const payload = {
      items: mpItems,
      back_urls: {
        success: `${baseUrl}/checkout/success`,
        failure: `${baseUrl}/checkout/failure`,
        pending: `${baseUrl}/checkout/pending`,
      },
      auto_return: "approved",

      // ✅ IMPORTANTÍSIMO
      notification_url: `${baseUrl}/api/mp/webhook`,
      external_reference: orderId,

      // ✅ metadata en JSON (NO string)
      metadata: {
        orderId,
        cart: compactCart, // <- array directo
        source: "mp_redirect",
      },
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        // ✅ evita crear 2 preferences si reintentan
        "X-Idempotency-Key": orderId,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "mp_error", mp: data }, { status: res.status })
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
      orderId,
    })
  } catch (error) {
    console.error("❌ Error en /api/checkout/preference:", error)
    return NextResponse.json({ ok: false, error: "internal_error", message: "Error al crear preferencia" }, { status: 500 })
  }
}
