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

type CompactCartItem = {
  productId: string
  talle?: string | null
  cantidad: number
}

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

function getUnitPriceProducto(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

function getUnitPriceCombo(combo: any) {
  // En tu schema de combo el campo es "precio" (Precio actual)
  const p = combo?.precioActual ?? combo?.precio ?? 0
  return toMoney(p)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    // ---- Base URL
    const { origin } = new URL(req.url)
    const baseUrl =
      process.env.SITE_URL ||
      process.env.PUBLIC_BASE_URL ||
      origin ||
      "http://localhost:3000"

    // ---- MP token
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing_mp_token", message: "Missing MP_ACCESS_TOKEN" },
        { status: 500 }
      )
    }

    // ---- Items (productos elegidos)
    const rawItems = Array.isArray(body?.items) ? body.items : []

    const compactCart: CompactCartItem[] = rawItems
      .map((i: any) => ({
        productId: String(i?._id ?? i?.productId ?? "").trim(),
        talle: i?.talle ?? null,
        cantidad: Number(i?.cantidad ?? 1),
      }))
      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json(
        { ok: false, error: "empty_cart", message: "Carrito vacío." },
        { status: 400 }
      )
    }

    // ---- Validar stock de productos SIEMPRE (aunque cobremos combo)
    const ids = compactCart.map((x) => x.productId)
    const prods = await getProductsSnapshot(ids)
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const stockErrors: any[] = []
    for (const it of compactCart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        stockErrors.push({
          productId: it.productId,
          talle: it.talle ?? null,
          requested: it.cantidad,
          available: 0,
          ok: false,
          reason: "product_not_found",
        })
        continue
      }

      const available = getAvailable(prod, it.talle)
      if (available < it.cantidad) {
        stockErrors.push({
          productId: it.productId,
          talle: it.talle ?? null,
          requested: it.cantidad,
          available,
          ok: false,
          reason: "out_of_stock",
        })
      }
    }

    if (stockErrors.length) {
      return NextResponse.json(
        { ok: false, error: "out_of_stock", message: "No hay stock suficiente.", details: stockErrors },
        { status: 409 }
      )
    }

    // ---- orderId
    const orderId = String(body?.orderId || randomUUID())

    const successUrl = `${baseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`
    const failureUrl = `${baseUrl}/checkout/failure?orderId=${encodeURIComponent(orderId)}`
    const pendingUrl = `${baseUrl}/checkout/pending?orderId=${encodeURIComponent(orderId)}`

    // ---- Si viene comboId: cobramos el COMBO (1 item). Si no: cobramos productos (compat).
    const comboId = String(body?.comboId || "").trim()

    let mpItems: any[] = []
    let chargedMode: "combo" | "products" = "products"
    let chargedAmount = 0

    if (comboId) {
      const combo = await getComboSnapshot(comboId)

      if (!combo?._id) {
        return NextResponse.json(
          { ok: false, error: "combo_not_found", message: "No se encontró el combo.", comboId },
          { status: 404 }
        )
      }

      const comboPrice = getUnitPriceCombo(combo)
      if (!comboPrice || comboPrice <= 0) {
        return NextResponse.json(
          { ok: false, error: "invalid_combo_price", message: "Precio de combo inválido.", comboId, comboPrice },
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

      chargedMode = "combo"
      chargedAmount = comboPrice
    } else {
      // Compat: cobra por productos (tu comportamiento anterior)
      mpItems = compactCart.map((it) => {
        const prod = byId.get(it.productId)
        const unit_price = getUnitPriceProducto(prod)
        const title = `${prod?.nombre || "Producto"}${it.talle ? ` - Talle ${it.talle}` : ""}`

        chargedAmount += unit_price * it.cantidad

        return {
          title,
          quantity: it.cantidad,
          unit_price,
          currency_id: "ARS",
        }
      })

      chargedAmount = toMoney(chargedAmount)
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: mpItems,

        // tracking
        external_reference: orderId,

        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,

        // metadata para webhook/stock
        metadata: {
          source: "preference_redirect",
          orderId,
          comboId: comboId || null,
          chargedMode,
          chargedAmount,
          cart: JSON.stringify(compactCart),
        },
      }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "mp_pref_error", status: res.status, mp: data },
        { status: res.status }
      )
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
      orderId,
      chargedMode,
      chargedAmount,
    })
  } catch (error: any) {
    console.error("❌ Error en /api/checkout/preference:", error?.message || error)
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Error al crear preferencia" },
      { status: 500 }
    )
  }
}
