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

type CompactProductItem = { productId: string; talle?: string | null; cantidad: number }

function toMoney(n: any) {
  const v = Number(n || 0)
  return Math.round(v * 100) / 100
}

async function getProductsSnapshot(ids: string[]) {
  if (!ids.length) return []
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

type PackSnapshot = { _id: string; _type: string; title: string; price: number }

async function getPackSnapshot(id: string): Promise<PackSnapshot | null> {
  const doc = await sanity.fetch(
    `*[
      _id == $id
      && _type in ["combo", "zapatillas2x1", "packMayorista"]
    ][0]{
      _id,
      _type,
      // combo
      "comboNombre": nombre,
      "comboPrecio": precio,
      // zapatillas2x1
      "zapasNombre": nombre,
      "zapasPrecio": precioActual,
      // packMayorista
      "mayoristaNombre": title,
      "mayoristaPrecio": precioActual
    }`,
    { id }
  )

  if (!doc?._id) return null

  // Normalizamos según el type
  if (doc._type === "combo") {
    const price = Number(doc.comboPrecio ?? 0)
    const title = String(doc.comboNombre || "Combo")
    return { _id: doc._id, _type: doc._type, title, price }
  }

  if (doc._type === "zapatillas2x1") {
    const price = Number(doc.zapasPrecio ?? 0)
    const title = String(doc.zapasNombre || "Zapatillas 2x1")
    return { _id: doc._id, _type: doc._type, title, price }
  }

  if (doc._type === "packMayorista") {
    const price = Number(doc.mayoristaPrecio ?? 0)
    const title = String(doc.mayoristaNombre || "Pack Mayorista")
    return { _id: doc._id, _type: doc._type, title, price }
  }

  return null
}


function getAvailable(prod: any, talle: string | null | undefined) {
  if (!prod) return 0
  if (Array.isArray(prod.talles) && talle) {
    const t = prod.talles.find((x: any) => x?.label === talle)
    return Number(t?.stock ?? 0)
  }
  return Number(prod.stock ?? 0)
}

function getUnitPriceProduct(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    console.log("🟣 PREFERENCE BODY =>", body)
    // ✅ puede venir comboId explícito o dentro de un item
    const comboId =
      String(body?.comboId || "").trim() ||
      String(
        (Array.isArray(body?.items) ? body.items : []).find((x: any) => x?.comboId)?.comboId || ""
      ).trim()


      // ==========================
// DEBUG pack / combo
// ==========================
const packDebug = comboId ? await getPackSnapshot(comboId) : null
console.log("🟡 comboId =>", comboId)
console.log("🟡 packDebug =>", packDebug)

    // ✅ siempre parseamos cart de productos (para stock + metadata)
    const rawItems = Array.isArray(body?.items) ? body.items : []
      // ✅ Detectar packMayorista aunque NO venga comboId (mayorista manda el id del pack en productId)
const firstProductId = String(rawItems?.[0]?._id ?? rawItems?.[0]?.productId ?? "").trim()
const packByProductId = firstProductId ? await getPackSnapshot(firstProductId) : null
const isMayoristaByProductId = packByProductId?._type === "packMayorista"

const packResolved = packDebug || packByProductId
const packResolvedId = comboId || (isMayoristaByProductId ? firstProductId : "")

    const compactCart: CompactProductItem[] = rawItems
      .map((i: any) => ({
        productId: String(i._id ?? i.productId ?? "").trim(),
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad || 1),
      }))
      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

// 1) VALIDACIÓN DE STOCK
// - NO se valida para packMayorista
// ==========================
let skipStock = false

if (packDebug?._type === "packMayorista" || isMayoristaByProductId) {
  skipStock = true
}


console.log("🟡 skipStock =>", skipStock)


    if (!skipStock) {
      const ids = [...new Set(compactCart.map((x) => x.productId))]
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
    }


    // ==========================
    // ==========================
    // 2) ARMADO DE ITEMS PARA MP
    // - Si hay comboId => COBRO PACK (1 item)
    // - Si NO hay comboId => COBRO PRODUCTOS
    // ==========================
    let mpItems: any[] = []

if (comboId || isMayoristaByProductId) {
  const packId = comboId || firstProductId
  const pack = await getPackSnapshot(packId)

  const packPrice = toMoney(Number(pack?.price ?? 0))

  if (!pack?._id || !packPrice || packPrice <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_pack",
        message: "No pudimos obtener el precio del pack mayorista.",
        packId,
        foundType: pack?._type ?? null,
        foundTitle: pack?.title ?? null,
        foundPrice: pack?.price ?? null,
      },
      { status: 400 }
    )
  }

  // ✅ Si el mayorista viene como item con cantidad, respetamos cantidad
  const qty = Number(rawItems?.[0]?.cantidad ?? 1)

  mpItems = [
    {
      title: pack.title,
      quantity: qty,
      unit_price: packPrice,
      currency_id: "ARS",
    },
  ]
} else {
  // cobrar por productos...
}



    // ==========================
    // 3) MP preference
    // ==========================
    const { origin } = new URL(req.url)
    const baseUrl =
      process.env.SITE_URL ||
      process.env.PUBLIC_BASE_URL ||
      origin ||
      "http://localhost:3000"

    const token = process.env.MP_ACCESS_TOKEN
    if (!token) return NextResponse.json({ ok: false, error: "Missing MP_ACCESS_TOKEN" }, { status: 500 })

    const orderId = randomUUID()

    const successUrl = `${baseUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}`
    const failureUrl = `${baseUrl}/checkout/failure?orderId=${encodeURIComponent(orderId)}`
    const pendingUrl = `${baseUrl}/checkout/pending?orderId=${encodeURIComponent(orderId)}`

    console.log("🟢 MP ITEMS QUE SE ENVIAN =>", mpItems)


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
  comboId: comboId || null,
packId: packResolvedId || null,
packType: packResolved?._type || null,
packTitle: packResolved?.title || null,

  cart: JSON.stringify(compactCart),

  // ✅ NUEVO: datos del cliente
  customer: {
    nombre: body?.customer?.nombre?.trim() || null,
    apellido: body?.customer?.apellido?.trim() || null,
    telefono: body?.customer?.telefono?.trim() || null,
    email: body?.customer?.email?.trim() || null,
    envio: body?.customer?.envio || null,
    cp: body?.customer?.cp || null,
    direccion: body?.customer?.direccion || null,
  },
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
