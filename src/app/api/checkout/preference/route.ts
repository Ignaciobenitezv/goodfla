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

type CompactProductItem = {
  productId: string
  talle?: string | null
  cantidad: number
  comboId?: string | null
  packMayoristaId?: string | null
}

type ParsedLine = {
  productId: string
  talle?: string | null
  cantidad: number
  comboId?: string | null
  packMayoristaId?: string | null
}

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

    // ✅ siempre parseamos cart de productos (para stock + metadata)
    const rawItems = Array.isArray(body?.items) ? body.items : []

    const parsed: ParsedLine[] = rawItems
  .map((i: any) => ({
    productId: String(i._id ?? i.productId ?? "").trim(),
    talle: i.talle ?? null,
    cantidad: Number(i.cantidad ?? 1),
    comboId: i.comboId ? String(i.comboId).trim() : null,
    packMayoristaId: i.packMayoristaId ? String(i.packMayoristaId).trim() : null,
  }))
      .filter((x: ParsedLine) => x.productId && x.cantidad > 0)


   const compactCart: CompactProductItem[] = parsed
  .map((x) => ({
    productId: x.productId,
    talle: x.talle,
    cantidad: x.cantidad,
    comboId: x.comboId ?? null,
    packMayoristaId: x.packMayoristaId ?? null,
  }))
  .filter((x: any) => x.productId && x.cantidad > 0)
    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
    }

    const hasMayorista = compactCart.some((item) => !!item.packMayoristaId)

if (hasMayorista) {
  return NextResponse.json(
    {
      ok: false,
      error: "mayorista_only_transfer",
      message:
        "Tu carrito contiene productos mayoristas. Por eso, esta compra solo puede abonarse por transferencia bancaria.",
    },
    { status: 400 }
  )
}

    // ==========================
    // ✅ Clasificar líneas por tipo real en Sanity
    // (esto habilita carrito mixto: mayorista + productos)
    // ==========================
    const uniqueIds = [...new Set(parsed.map((x: any) => x.productId))]
    const snaps = await Promise.all(uniqueIds.map((id) => getPackSnapshot(id)))
    const validSnaps = snaps.filter(Boolean) as PackSnapshot[]

    const typeById = new Map<string, string>(validSnaps.map((p) => [String(p._id), String(p._type)]))
    const packById = new Map<string, PackSnapshot>(validSnaps.map((p) => [String(p._id), p]))


  const mayoristaLines = parsed.filter((x: any) => !!x.packMayoristaId)
const productLines = parsed.filter((x: any) => !x.packMayoristaId)
const comboLines = productLines.filter((x) => !!x.comboId)
const normalProductLines = productLines.filter((x) => !x.comboId)

    console.log("🔎 CLASSIFY", {
      mayorista: mayoristaLines.map((x: any) => x.productId),
      productos: productLines.map((x: any) => x.productId),
    })

    // 1) VALIDACIÓN DE STOCK
    // - SOLO para productos normales (productLines)
    // - NUNCA para packMayorista (mayoristaLines)
    // ==========================
    // ==========================
    // 1) VALIDACIÓN DE STOCK
    // - SOLO para productos (normal + combo)
    // - NUNCA para packMayorista
    // ==========================
    const stockLines: ParsedLine[] = [...comboLines, ...normalProductLines]

    if (stockLines.length) {
      const ids = [...new Set(stockLines.map((x) => x.productId))]
      const prods = await getProductsSnapshot(ids)
      const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

      const stockErrors: any[] = []

      for (const it of stockLines) {
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

    // A) mayorista
    // A) mayorista
if (mayoristaLines.length) {
  const group = new Map<string, ParsedLine[]>()

  for (const line of mayoristaLines) {
    const pid = String(line.packMayoristaId || "").trim()
    if (!pid) continue
    const arr = group.get(pid) || []
    arr.push(line)
    group.set(pid, arr)
  }

  const mayoristaIds = [...group.keys()]
  const mayoristaSnaps = await Promise.all(mayoristaIds.map((id) => getPackSnapshot(id)))
  const mayoristaById = new Map<string, PackSnapshot>(
    (mayoristaSnaps.filter(Boolean) as PackSnapshot[]).map((p) => [String(p._id), p])
  )

  for (const pid of mayoristaIds) {
    const pack = mayoristaById.get(pid) || null
    const unit = toMoney(Number(pack?.price ?? 0))

    if (!pack?._id || pack._type !== "packMayorista" || !unit || unit <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_pack", message: "Pack mayorista inválido.", packId: pid, pack },
        { status: 400 }
      )
    }

    const lines = group.get(pid) || []
    const totalUnits = lines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0)

    // 1 pack cada 10 unidades
    const packsQty = Math.floor(totalUnits / 10)
    const remainder = totalUnits % 10

    if (packsQty > 0) {
      mpItems.push({
        title: pack.title,
        quantity: packsQty,
        unit_price: unit,
        currency_id: "ARS",
      })
    }

    if (remainder > 0) {
      // seguridad comercial: cobrar sueltas al precio unitario normal
      const ids = [...new Set(lines.map((l) => l.productId))]
      const prods = await getProductsSnapshot(ids)
      const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

      const expanded: { unit_price: number; title: string }[] = []

      for (const l of lines) {
        const prod = byId.get(l.productId)
        const unit_price = getUnitPriceProduct(prod)
        const title = `${prod?.nombre || "Producto"}${l.talle ? ` - Talle ${l.talle}` : ""}`

        for (let k = 0; k < Number(l.cantidad || 0); k++) {
          expanded.push({ unit_price, title })
        }
      }

      expanded.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0))

      for (let i = 0; i < remainder; i++) {
        const single = expanded[i]
        if (!single || !single.unit_price || single.unit_price <= 0) continue

        mpItems.push({
          title: single.title,
          quantity: 1,
          unit_price: single.unit_price,
          currency_id: "ARS",
        })
      }
    }
  }
}
// B) combos (ej zapatillas2x1 / combo)
if (comboLines.length) {
  // 1) Agrupar por comboId
  const group = new Map<string, ParsedLine[]>()
  for (const line of comboLines) {
    const cid = String(line.comboId || "").trim()
    if (!cid) continue
    const arr = group.get(cid) || []
    arr.push(line)
    group.set(cid, arr)
  }

  const comboIds = [...group.keys()]
  const comboSnaps = await Promise.all(comboIds.map((id) => getPackSnapshot(id)))
  const comboById = new Map<string, PackSnapshot>(
    (comboSnaps.filter(Boolean) as PackSnapshot[]).map((p) => [String(p._id), p])
  )

  // 2) Traer precios unitarios de los productos que participan en combos
  const comboProductIds = [...new Set(comboLines.map((l) => l.productId))]
  const comboProds = await getProductsSnapshot(comboProductIds)
  const prodById = new Map<string, any>((comboProds || []).map((p: any) => [String(p._id), p]))

  // 3) Para cada comboId, calcular pairs + remainder
  for (const cid of comboIds) {
    const pack = comboById.get(cid) || null
    const promoUnit = toMoney(Number(pack?.price ?? 0))

    if (!pack?._id || !promoUnit || promoUnit <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_combo", message: "Combo/2x1 inválido.", comboId: cid, pack },
        { status: 400 }
      )
    }

    const lines = group.get(cid) || []
    const totalUnits = lines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0)

    // ✅ pares promo
    const pairs = Math.floor(totalUnits / 2)
    // ✅ 1 suelta si impar
    const remainder = totalUnits % 2

    // 3.a) Cobro promo (pairs)
    if (pairs > 0) {
      mpItems.push({
        title: pack.title,
        quantity: pairs,
        unit_price: promoUnit,
        currency_id: "ARS",
      })
    }

    // 3.b) Cobro 1 suelta (si remainder=1)
    if (remainder === 1) {
      // expandimos unidades para decidir cuál queda suelta
      const expanded: { productId: string; talle: string | null; unit_price: number; title: string }[] = []

      for (const l of lines) {
        const prod = prodById.get(l.productId)
        const unit_price = getUnitPriceProduct(prod)
        const title = `${prod?.nombre || "Producto"}${l.talle ? ` - Talle ${l.talle}` : ""}`

        for (let k = 0; k < Number(l.cantidad || 0); k++) {
          expanded.push({ productId: l.productId, talle: l.talle ?? null, unit_price, title })
        }
      }

      // Política comercial: cobrar suelta la más cara (no perder margen)
      expanded.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0))
      const single = expanded[0]

      if (!single || !single.unit_price || single.unit_price <= 0) {
        return NextResponse.json(
          { ok: false, error: "invalid_combo_single", message: "No se pudo calcular la suelta del combo.", comboId: cid },
          { status: 400 }
        )
      }

      mpItems.push({
        title: single.title,
        quantity: 1,
        unit_price: single.unit_price,
        currency_id: "ARS",
      })
    }
  }
}


    // C) productos normales (precio unitario server)
    if (normalProductLines.length) {
      const ids = [...new Set(normalProductLines.map((x) => x.productId))]
      const prods = await getProductsSnapshot(ids)
      const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

      for (const it of normalProductLines) {
        const prod = byId.get(it.productId)
        if (!prod) continue
        const unit_price = getUnitPriceProduct(prod)
        const title = `${prod?.nombre || "Producto"}${it.talle ? ` - Talle ${it.talle}` : ""}`
        mpItems.push({ title, quantity: it.cantidad, unit_price, currency_id: "ARS" })
      }
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
          packIds: [...new Set(mayoristaLines.map((x) => x.packMayoristaId).filter(Boolean))],
          packType: mayoristaLines.length ? "packMayorista" : null,
          packTitle: null,


          cart: JSON.stringify(compactCart),

          combos: JSON.stringify(
            [...new Map(
              comboLines
                .filter(l => l.comboId)
                .map(l => [String(l.comboId), true])
            ).keys()]
          ),


          comboLines: JSON.stringify(comboLines.map(l => ({
            productId: l.productId,
            talle: l.talle ?? null,
            cantidad: l.cantidad,
            comboId: l.comboId ?? null,
          }))),
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
