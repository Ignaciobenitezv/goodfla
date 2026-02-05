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

/** ===== Types ===== */
type IncomingItem = {
  _id?: string
  productId?: string
  talle?: string | null
  cantidad?: number

  // combo flags
  _type?: string
  type?: string
  comboId?: string
  nombre?: string
  precio?: number
  precioActual?: number
}

type CartItem = { productId: string; talle?: string | null; cantidad: number }

function toMoney(n: any) {
  const v = Number(n || 0)
  return Math.round(v * 100) / 100
}

function isComboItem(i: any) {
  return i?._type === "combo" || i?.type === "combo" || !!i?.comboId
}

function getBaseUrl(req: Request) {
  const { origin } = new URL(req.url)
  return process.env.SITE_URL || process.env.PUBLIC_BASE_URL || origin || "http://localhost:3000"
}

/** ===== Fetchers ===== */
async function getProductsSnapshot(ids: string[]) {
  if (!ids.length) return []
  return sanity.fetch(
    `*[_type=="producto" && _id in $ids]{
      _id,
      _rev,
      nombre,
      stock,
      talles[]{label, stock},
      precio,
      precioActual
    }`,
    { ids }
  )
}

async function getCombosSnapshot(ids: string[]) {
  if (!ids.length) return []
  // Intentamos cubrir varios nombres típicos para “líneas” de combo
  return sanity.fetch(
    `*[_type=="combo" && _id in $ids]{
      _id,
      nombre,
      precio,
      precioActual,

      // posibles shapes (según tu schema)
      items[]{
        cantidad,
        talle,
        product->{_id}
      },
      productos[]{
        cantidad,
        talle,
        producto->{_id}
      },
      lineas[]{
        cantidad,
        talle,
        producto->{_id}
      }
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

function getUnitPriceFromProduct(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

function getComboPrice(combo: any) {
  const p = combo?.precioActual ?? combo?.precio ?? 0
  return toMoney(p)
}

/**
 * Extrae líneas (productos) de un combo con tolerancia a distintos nombres de campos.
 * Devuelve CartItem[] (productId, talle, cantidad)
 */
function expandComboToCartLines(comboDoc: any, comboQty: number): CartItem[] {
  const lines: CartItem[] = []

  // 1) items[] con product->{_id}
  if (Array.isArray(comboDoc?.items)) {
    for (const l of comboDoc.items) {
      const pid = l?.product?._id
      const qty = Number(l?.cantidad ?? 1) * comboQty
      if (pid && qty > 0) {
        lines.push({ productId: String(pid), talle: l?.talle ?? null, cantidad: qty })
      }
    }
  }

  // 2) productos[] con producto->{_id}
  if (Array.isArray(comboDoc?.productos)) {
    for (const l of comboDoc.productos) {
      const pid = l?.producto?._id
      const qty = Number(l?.cantidad ?? 1) * comboQty
      if (pid && qty > 0) {
        lines.push({ productId: String(pid), talle: l?.talle ?? null, cantidad: qty })
      }
    }
  }

  // 3) lineas[] con producto->{_id}
  if (Array.isArray(comboDoc?.lineas)) {
    for (const l of comboDoc.lineas) {
      const pid = l?.producto?._id
      const qty = Number(l?.cantidad ?? 1) * comboQty
      if (pid && qty > 0) {
        lines.push({ productId: String(pid), talle: l?.talle ?? null, cantidad: qty })
      }
    }
  }

  return lines
}

/** Agrupa cart items por productId+talle (para validar stock correcto) */
function aggregateCart(cart: CartItem[]) {
  const key = (x: CartItem) => `${x.productId}__${x.talle ?? ""}`
  const map = new Map<string, CartItem>()

  for (const it of cart) {
    const k = key(it)
    const prev = map.get(k)
    if (!prev) map.set(k, { ...it })
    else map.set(k, { ...prev, cantidad: prev.cantidad + it.cantidad })
  }

  return Array.from(map.values())
}

/** ===== Route ===== */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawItems: IncomingItem[] = Array.isArray(body?.items) ? body.items : []

    if (!rawItems.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

    const mpToken = process.env.MP_ACCESS_TOKEN
    if (!mpToken) {
      return NextResponse.json({ ok: false, error: "Missing MP_ACCESS_TOKEN" }, { status: 500 })
    }

    const baseUrl = getBaseUrl(req)
    const orderId = randomUUID()

    // 1) Separar IDs de combos y productos desde el input
    const comboIds: string[] = []
    const productIdsDirect: string[] = []

    for (const i of rawItems) {
      if (isComboItem(i)) {
        const cid = String(i?.comboId || i?._id || "").trim()
        if (cid) comboIds.push(cid)
      } else {
        const pid = String(i?._id ?? i?.productId ?? "").trim()
        if (pid) productIdsDirect.push(pid)
      }
    }

    // 2) Traer combos (para precio y para expandir a productos)
    const combos = await getCombosSnapshot(Array.from(new Set(comboIds)))
    const comboById = new Map<string, any>((combos || []).map((c: any) => [String(c._id), c]))

    // 3) Construir:
    //    - items para MP (cobramos combo a precio combo server-side)
    //    - cart expandido a productos para stock (metadata.cart)
    const mpItems: any[] = []
    let expandedCart: CartItem[] = []

    for (const i of rawItems) {
      const qty = Math.max(1, Number(i?.cantidad ?? 1))

      if (isComboItem(i)) {
        const cid = String(i?.comboId || i?._id || "").trim()
        const comboDoc = comboById.get(cid)

        if (!comboDoc) {
          return NextResponse.json(
            { ok: false, error: "combo_not_found", message: "No se encontró el combo en Sanity", comboId: cid },
            { status: 400 }
          )
        }

        const unit_price = getComboPrice(comboDoc)

        // ✅ COBRAR COMO COMBO
        mpItems.push({
          title: String(comboDoc?.nombre || i?.nombre || "Combo"),
          quantity: qty,
          unit_price,
          currency_id: "ARS",
        })

        // ✅ EXPANDIR A PRODUCTOS PARA STOCK (si no hay líneas, va a quedar sin descontar)
        const comboLines = expandComboToCartLines(comboDoc, qty)
        expandedCart = expandedCart.concat(comboLines)
      } else {
        const pid = String(i?._id ?? i?.productId ?? "").trim()
        if (!pid) continue

        // El precio del producto lo resolvemos en server con snapshot después
        expandedCart.push({
          productId: pid,
          talle: i?.talle ?? null,
          cantidad: qty,
        })
      }
    }

    // Si no pudimos expandir combos a productos, esto te dejaría colgado en “confirmando stock”.
    // Lo cortamos acá con un error claro para que no cobres algo que no podés procesar.
    if (!expandedCart.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_stock_cart",
          message:
            "No pudimos construir el carrito para stock (combo sin líneas). Revisá el schema del combo (items/productos/lineas con referencias a productos).",
        },
        { status: 400 }
      )
    }

    // 4) Validar stock y, si hay productos sueltos, crear también mpItems para ellos con precio server-side
    const aggregated = aggregateCart(expandedCart)
    const productIdsForStock = Array.from(new Set(aggregated.map((x) => x.productId)))

    const prods = await getProductsSnapshot(productIdsForStock)
    const prodById = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const stockErrors: any[] = []

    for (const it of aggregated) {
      const prod = prodById.get(it.productId)
      if (!prod) {
        stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available: 0, reason: "product_not_found" })
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

    // 4.B) Si vinieron productos sueltos en rawItems, generamos sus items MP con precio del server (no del front)
    //      (los combos ya están en mpItems con precio combo)
    for (const i of rawItems) {
      if (isComboItem(i)) continue

      const pid = String(i?._id ?? i?.productId ?? "").trim()
      if (!pid) continue

      const qty = Math.max(1, Number(i?.cantidad ?? 1))
      const prod = prodById.get(pid)
      if (!prod) continue

      const unit_price = getUnitPriceFromProduct(prod)
      mpItems.push({
        title: `${prod?.nombre || "Producto"}${i?.talle ? ` - Talle ${i.talle}` : ""}`,
        quantity: qty,
        unit_price,
        currency_id: "ARS",
      })
    }

    // 5) URLs con orderId (para que tu success/confirm pueda trackear)
    const successUrl = `${baseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`
    const failureUrl = `${baseUrl}/checkout/failure?orderId=${encodeURIComponent(orderId)}`
    const pendingUrl = `${baseUrl}/checkout/pending?orderId=${encodeURIComponent(orderId)}`

    // 6) Crear preferencia en MP
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: mpItems, // ✅ COBRA COMBO (y/o productos sueltos) CON PRECIOS SERVER-SIDE
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
          // ✅ carrito EXPANDIDO a productos, para que el webhook descuente stock
          cart: JSON.stringify(aggregated),
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
