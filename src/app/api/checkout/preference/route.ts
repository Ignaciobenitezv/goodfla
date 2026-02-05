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
  // ⚠️ Ajustá campos si tu schema usa otros nombres.
  // Esto intenta leer precioActual/precio desde el documento combo.
  return sanity.fetch(
    `*[_type=="combo" && _id==$id][0]{
      _id,
      nombre,
      precio,
      precioActual
    }`,
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

function getUnitPrice(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

function getComboPrice(combo: any) {
  const p = combo?.precioActual ?? combo?.precio ?? 0
  return toMoney(p)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // --------- 1) Detectar comboId (si corresponde) ----------
    // Recomendado: body.comboId
    // Alternativa: items[0] viene como combo y su _id es el id del combo
    const rawItems = Array.isArray(body?.items) ? body.items : []
    const first = rawItems?.[0] || null

    const comboIdFromBody = body?.comboId ? String(body.comboId) : ""
    const comboIdFromItem =
      first && (first?._type === "combo" || first?.type === "combo") && (first?._id || first?.comboId)
        ? String(first._id || first.comboId)
        : ""

    const comboId = (comboIdFromBody || comboIdFromItem || "").trim()
    const isComboCheckout = !!comboId

    // --------- 2) Construir cart de productos (para STOCK) ----------
    // OJO: Esto SIEMPRE tiene que ser lista de productos reales (producto._id)
    const compactCart: CompactCartItem[] = rawItems
      .map((i: any) => ({
        productId: String(i._id ?? i.productId ?? "").trim(), // producto id
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad || 1),
      }))
      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

    // --------- 3) Validar stock (productos) ----------
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

    // --------- 4) Construir items para MercadoPago ----------
    // ✅ Si es combo: 1 item con precio del combo desde Sanity
    // ✅ Si NO es combo: items por producto con precio desde Sanity (server-authoritative)
    let mpItems: any[] = []

    if (isComboCheckout) {
      const combo = await getComboSnapshot(comboId)
      if (!combo?._id) {
        return NextResponse.json(
          { ok: false, error: "combo_not_found", message: "No se encontró el combo en Sanity.", comboId },
          { status: 400 }
        )
      }

      const comboPrice = getComboPrice(combo)
      if (!comboPrice || comboPrice <= 0) {
        return NextResponse.json(
          { ok: false, error: "invalid_combo_price", message: "Precio de combo inválido.", comboId, combo },
          { status: 400 }
        )
      }

      mpItems = [
        {
          title: String(combo?.nombre || "Combo"),
          quantity: 1,
          unit_price: comboPrice,
          currency_id: "ARS",
        },
      ]
    } else {
      mpItems = compactCart
        .map((it) => {
          const prod = byId.get(it.productId)
          if (!prod) return null

          const unit_price = getUnitPrice(prod)
          const title = `${prod?.nombre || "Producto"}${it.talle ? ` - Talle ${it.talle}` : ""}`

          return {
            title,
            quantity: it.cantidad,
            unit_price,
            currency_id: "ARS",
          }
        })
        .filter(Boolean) as any[]
    }

    // --------- 5) MP + URLs ----------
    const { origin } = new URL(req.url)
    const baseUrl = process.env.SITE_URL || process.env.PUBLIC_BASE_URL || origin || "http://localhost:3000"

    const token = process.env.MP_ACCESS_TOKEN
    if (!token) return NextResponse.json({ ok: false, error: "Missing MP_ACCESS_TOKEN" }, { status: 500 })

    const orderId = randomUUID()

    const successUrl = `${baseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`
    const failureUrl = `${baseUrl}/checkout/failure?orderId=${encodeURIComponent(orderId)}`
    const pendingUrl = `${baseUrl}/checkout/pending?orderId=${encodeURIComponent(orderId)}`

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: mpItems,

        // ✅ para track: útil para tu /confirm y debugging
        external_reference: orderId,

        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,

        // ✅ CLAVE: metadata.cart SIEMPRE ES PRODUCTOS para descontar stock
        metadata: {
          source: "preference_redirect",
          orderId,
          comboId: isComboCheckout ? comboId : null,
          cart: compactCart, // ✅ guardar como array (evita parseos raros)
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
