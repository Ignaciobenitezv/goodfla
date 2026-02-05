// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server"
import crypto from "crypto"
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

function toMoney(n: any) {
  const v = Number(n || 0)
  return Math.round(v * 100) / 100
}

async function getProductsSnapshot(ids: string[]) {
  return sanity.fetch(
    `*[_type=="producto" && _id in $ids]{
      _id,
      nombre,
      stock,
      talles[]{label, stock},
      precio,
      precioActual
    }`,
    { ids }
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
  // ✅ precioActual primero
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1) Compact cart (solo ids / talle / cantidad)
    const compactCart: CompactCartItem[] = (Array.isArray(body?.items) ? body.items : [])
      .map((i: any) => ({
        productId: String(i?._id ?? i?.productId ?? "").trim(),
        talle: i?.talle ?? null,
        cantidad: Number(i?.cantidad ?? 1),
      }))
      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

    const ids = compactCart.map((x) => x.productId)

    // 2) Snapshot productos (stock + precio)
    const prods = await getProductsSnapshot(ids)
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    // 3) Validar stock + construir items MP con precio server-side
    const stockErrors: any[] = []
    const mpItems = compactCart.map((it) => {
      const prod = byId.get(it.productId)
      if (!prod) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available: 0 })
        return null
      }

      const available = getAvailable(prod, it.talle)
      if (available < it.cantidad) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available })
        return null
      }

      const unit_price = getUnitPrice(prod)
      const title = `${prod?.nombre || "Producto"}${it.talle ? ` - Talle ${it.talle}` : ""}`

      return {
        title,
        quantity: it.cantidad,
        unit_price, // ✅ nunca más $3 por precio mal parseado del front
        currency_id: "ARS",
      }
    }).filter(Boolean)

    if (stockErrors.length) {
      return NextResponse.json(
        { ok: false, error: "out_of_stock", message: "No hay stock suficiente.", details: stockErrors },
        { status: 409 }
      )
    }

    // 4) Base URL
    const { origin } = new URL(req.url)
    const baseUrl = (process.env.SITE_URL || origin).replace(/\/$/, "")

    // 5) Token MP
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) return NextResponse.json({ ok: false, error: "missing_mp_token" }, { status: 500 })

    // 6) orderId estable
    const orderId = crypto.randomUUID()

    // (Opcional pero útil) idempotencia en preferencia para no duplicar si reintenta
    const idemKey = orderId

    // 7) Crear preferencia
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify({
        items: mpItems,
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,
        // ✅ CLAVE: metadata.cart como ARRAY (no string) y orderId disponible
        metadata: {
          orderId,
          cart: compactCart,
          source: "mp_redirect",
        },
      }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "mp_pref_error", mp: data }, { status: res.status })
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
      orderId,
    })
  } catch (error) {
    console.error("❌ Error en /api/checkout/preference:", error)
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 })
  }
}
