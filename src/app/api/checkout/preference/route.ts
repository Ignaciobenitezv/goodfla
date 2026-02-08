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

type CompactProductItem = { productId: string; talle?: string | null; cantidad: number; comboId?: string | null }

type ParsedLine = { productId: string; talle?: string | null; cantidad: number; comboId?: string | null }
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
      }))
      .filter((x: ParsedLine) => x.productId && x.cantidad > 0)


    const compactCart: CompactProductItem[] = parsed.map((x) => ({
      productId: x.productId,
      talle: x.talle,
      cantidad: x.cantidad,
      comboId: x.comboId ?? null,
    }))


      .filter((x: any) => x.productId && x.cantidad > 0)

    if (!compactCart.length) {
      return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 })
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


    const mayoristaLines = parsed.filter((x: any) => typeById.get(x.productId) === "packMayorista")
    const productLines = parsed.filter((x: any) => typeById.get(x.productId) !== "packMayorista")
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
    for (const line of mayoristaLines) {
      const pack = packById.get(line.productId) || null
      const unit = toMoney(Number(pack?.price ?? 0))

      if (!pack?._id || pack._type !== "packMayorista" || !unit || unit <= 0) {
        return NextResponse.json(
          { ok: false, error: "invalid_pack", message: "Pack mayorista inválido.", productId: line.productId, pack },
          { status: 400 }
        )
      }

      mpItems.push({ title: pack.title, quantity: line.cantidad, unit_price: unit, currency_id: "ARS" })
    }
    // B) combos (ej zapatillas2x1 / combo) => 1 ítem de oferta por comboId
    if (comboLines.length) {
      // Agrupar por comboId
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

      for (const cid of comboIds) {
        const pack = comboById.get(cid) || null
        const unit = toMoney(Number(pack?.price ?? 0))

        if (!pack?._id || !unit || unit <= 0) {
          return NextResponse.json(
            { ok: false, error: "invalid_combo", message: "Combo/2x1 inválido.", comboId: cid, pack },
            { status: 400 }
          )
        }

        // Regla: zapatillas2x1 cobra 1 “pack” cada 2 unidades
        const lines = group.get(cid) || []
        const totalUnits = lines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0)

        const qty =
          pack._type === "zapatillas2x1"
            ? Math.max(1, Math.ceil(totalUnits / 2))
            : 1 // combo genérico: 1 por compra (si necesitás >1 lo ajustamos luego)

        mpItems.push({
          title: pack.title,
          quantity: qty,
          unit_price: unit,
          currency_id: "ARS",
        })
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
          packIds: [...new Set(mayoristaLines.map((x) => x.productId))],
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
