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

async function getComboSnapshot(comboId: string) {
  return sanity.fetch(
    `*[_type=="combo" && _id==$id][0]{ _id, nombre, precio }`,
    { id: comboId }
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

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ✅ Este endpoint es "checkout de combo"
    const comboId = String(body?.comboId || "").trim()
    if (!comboId) {
      return NextResponse.json(
        { ok: false, error: "missing_comboId", message: "Falta comboId (id del documento combo en Sanity)." },
        { status: 400 }
      )
    }

    // 1) Cart de productos reales (para stock). El front suele mandar items = productos elegidos dentro del combo.
    const compactCart: CompactCartItem[] = (Array.isArray(body?.items) ? body.items : [])
      .map((i: any) => ({
        productId: String(i?._id ?? i?.productId ?? "").trim(),
        talle: i?.talle ?? null,
        cantidad: Number(i?.cantidad || 1),
      }))
      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json(
        { ok: false, error: "empty_cart", message: "El combo no trae productos en items (cart vacío)." },
        { status: 400 }
      )
    }

    // 2) Validar stock con datos del server
    const ids = compactCart.map((x) => x.productId)
    const prods = await getProductsSnapshot(ids)
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const stockErrors: any[] = []
    for (const it of compactCart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available: 0 })
        continue
      }
      const available = getAvailable(prod, it.talle)
      if (available < it.cantidad) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available })
      }
    }

    if (stockErrors.length) {
      return NextResponse.json(
        { ok: false, error: "out_of_stock", message: "No hay stock suficiente.", details: stockErrors },
        { status: 409 }
      )
    }

    // 3) Traer combo desde Sanity y usar SU precio para MP
    const combo = await getComboSnapshot(comboId)
    if (!combo?._id) {
      return NextResponse.json(
        { ok: false, error: "combo_not_found", message: "No existe el combo en Sanity.", comboId },
        { status: 404 }
      )
    }

    const comboPrice = toMoney(combo?.precio)
    if (!comboPrice || comboPrice <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_combo_price", message: "El combo tiene precio inválido.", comboId, comboPrice },
        { status: 400 }
      )
    }

    // ✅ ACÁ ESTÁ LA CLAVE: 1 solo item para MP con precio del combo
    const mpItems = [
      {
        title: String(combo?.nombre || "Combo"),
        quantity: 1,
        unit_price: comboPrice,
        currency_id: "ARS",
      },
    ]

    // 4) URLs base
    const { origin } = new URL(req.url)
    const baseUrl = process.env.SITE_URL || process.env.PUBLIC_BASE_URL || origin || "http://localhost:3000"

    const token = process.env.MP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_mp_token", message: "Missing MP_ACCESS_TOKEN" }, { status: 500 })
    }

    const orderId = randomUUID()

    const successUrl = `${baseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`
    const failureUrl = `${baseUrl}/checkout/failure?orderId=${encodeURIComponent(orderId)}`
    const pendingUrl = `${baseUrl}/checkout/pending?orderId=${encodeURIComponent(orderId)}`

    // 5) Crear preferencia
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: mpItems,
        external_reference: orderId,
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,
        metadata: {
          source: "preference_redirect",
          orderId,
          comboId,
          comboPrice,
          // 👉 esto lo usa tu webhook para descontar stock de productos
          cart: JSON.stringify(compactCart),
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
      comboId,
      comboPrice,
    })
  } catch (error) {
    console.error("❌ Error en /api/checkout/preference:", error)
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 })
  }
}
