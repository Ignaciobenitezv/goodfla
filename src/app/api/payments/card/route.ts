// app/api/payments/card/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@sanity/client"
import { validateCoupon } from "@/lib/coupons"

type CompactItem = {
  _id?: string
  productId?: string
  talle?: string | null
  cantidad: number
  comboId?: string | null
  packMayoristaId?: string | null
}


type BrickPayload = {
  token?: string
  issuer_id?: string | number
  payment_method_id?: string
  paymentMethodId?: string
  payment_method?: { id?: string }
  paymentMethod?: { id?: string }
  installments?: number | string
  email?: string
  payer?: { email?: string; identification?: { type?: string; number?: string } }

  identification?: { type?: string; number?: string }
  identificationType?: string
  identificationNumber?: string

  items?: CompactItem[]
  amount?: number
  orderId?: string
  comboId?: string
  shipping?: { type: "domicilio" | "sucursal"; cp?: string }

  quoteOnly?: boolean
paymentMode?: "transfer" | "standard"
couponCode?: string | null

customer?: {
    nombre?: string
    apellido?: string
    telefono?: string
    email?: string // ✅ NUEVO
    envio?: "domicilio" | "sucursal"
    cp?: string | null
    departamento?: string | null
    provincia?: string | null
    pais?: string | null
    direccion?: {
      calle?: string
      numero?: string
      barrio?: string
      departamento?: string
      ciudad?: string
      provincia?: string
      pais?: string
    } | null
  }
}


const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

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

type PackSnapshot = { _id: string; _type: string; title: string; price: number; bundleSize: number }

async function getPackSnapshot(id: string): Promise<PackSnapshot | null> {
  if (!id) return null

  const doc = await sanity.fetch(
  `*[
    _id == $id
    && _type in ["combo", "zapatillas2x1", "packMayorista"]
  ][0]{
    _id,
    _type,
    "bundleSize": coalesce(math::sum(categoriasIncluidas[].cantidad), 0),

    "comboNombre": nombre,
    "comboPrecio": precio,

    "zapasNombre": nombre,
    "zapasPrecio": precioActual,

    "mayoristaNombre": title,
    "mayoristaPrecio": precioActual
  }`,
  { id }
)


  if (!doc?._id) return null
if (doc._type === "combo") {
  return {
    _id: doc._id,
    _type: doc._type,
    title: String(doc.comboNombre || "Combo"),
    price: Number(doc.comboPrecio ?? 0),
    bundleSize: Number(doc.bundleSize ?? 0),
  }
}

if (doc._type === "zapatillas2x1") {
  return {
    _id: doc._id,
    _type: doc._type,
    title: String(doc.zapasNombre || "Zapatillas 2x1"),
    price: Number(doc.zapasPrecio ?? 0),
    bundleSize: Number(doc.bundleSize ?? 0),
  }
}

if (doc._type === "packMayorista") {
  return {
    _id: doc._id,
    _type: doc._type,
    title: String(doc.mayoristaNombre || "Pack Mayorista"),
    price: Number(doc.mayoristaPrecio ?? 0),
    bundleSize: 1, // no aplica
  }
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

function getUnitPrice(prod: any) {
  const p = prod?.precioActual ?? prod?.precio ?? 0
  return toMoney(p)
}

async function getShippingPrice(origin: string, cp?: string) {
  if (!cp) return 0
  const url = `${origin}/api/shipping?cp=${encodeURIComponent(cp)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return 0
  const data = await res.json().catch(() => null)
  return toMoney(data?.price ?? 0)
}
type CartItem = {
  cartKey: string
  productId: string
  talle?: string | null
  cantidad: number
  comboId?: string | null
  packMayoristaId?: string | null
}






function normalizeIdentification(body: BrickPayload) {
  const type =
    body.identification?.type ||
    body.identificationType ||
    body.payer?.identification?.type ||
    (body as any)?.payer?.identification?.type ||
    ""

  const rawNumber =
    body.identification?.number ||
    body.identificationNumber ||
    body.payer?.identification?.number ||
    (body as any)?.payer?.identification?.number ||
    ""

  // DNI suele venir con puntos/espacios: lo dejamos solo dígitos
  const number = String(rawNumber).replace(/[^\d]/g, "")

  return {
    type: String(type || "").trim(),
    number: String(number || "").trim(),
  }
}






export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload
    const isQuoteOnly = !!(body as any).quoteOnly
    const isTransferMode = body.paymentMode === "transfer"

    console.log("PAYMENT_CARD_IN", {
      orderId: body.orderId,
      clientAmount: body.amount,
      comboId: body.comboId,
      itemsCount: Array.isArray(body.items) ? body.items.length : 0,
      firstItem: Array.isArray(body.items) ? body.items[0] : null,
    })

    // 1) Datos mínimos (robusto a distintos formatos del Brick)
    const token = body.token

    const payment_method_id =
      body.payment_method_id ||
      body.paymentMethodId ||
      body.payment_method?.id ||
      body.paymentMethod?.id ||
      (body as any)?.payment_method?.id ||
      (body as any)?.paymentMethod?.id

    const issuer_id = body.issuer_id != null ? Number(body.issuer_id) : undefined

    const installmentsRaw = Number(body.installments ?? 1)
    const installments = Number.isFinite(installmentsRaw) && installmentsRaw >= 1 ? installmentsRaw : 1


    console.log("PAYMENT_CARD_FIELDS", {
  hasToken: !!body.token,
  tokenPreview: body.token ? String(body.token).slice(0, 12) : null,
  payment_method_id,
  issuer_id,
  installments,
  email:
    body.email ||
    body.payer?.email ||
    body.customer?.email ||
    null,
  identification:
    body.identification ||
    body.payer?.identification ||
    null,
})


    if (!isQuoteOnly && (!token || !payment_method_id)) {
  return NextResponse.json(
    { ok: false, error: "missing_payment_data", message: "Faltan datos de la tarjeta (token o método de pago)." },
    { status: 400 }
  )
}


    // 1.1) Email + DNI (Brick) — soporta body.email o payer.email
    const email = String(
  body.email ||
  body.payer?.email ||
  body.customer?.email ||
  (body as any)?.formData?.payer?.email ||
  (body as any)?.formData?.email ||
  ""
).trim()
    const identification = normalizeIdentification(body)

   if (!isQuoteOnly) {
  if (!email) {
    return NextResponse.json({ ok: false, error: "missing_email", message: "Falta el email del pagador." }, { status: 400 })
  }

  if (!identification.type || !identification.number) {
    return NextResponse.json(
      { ok: false, error: "missing_identification", message: "Falta DNI/Documento del titular." },
      { status: 400 }
    )
  }
}

    // 2) Items
    const rawItems = Array.isArray(body.items) ? body.items : []


    if (!rawItems.length) {
      return NextResponse.json({ ok: false, error: "empty_cart", message: "Carrito vacío." }, { status: 400 })
    }

  const cart: CartItem[] = rawItems
  .map((i: any) => ({
    cartKey: String(i.cartKey || `${i._id ?? i.productId}__${i.talle ?? "default"}`),
    productId: String(i._id ?? i.productId ?? "").trim(),
    talle: i.talle ?? null,
    cantidad: Number(i.cantidad ?? 1),
    comboId: i.comboId ? String(i.comboId).trim() : null,
    packMayoristaId: i.packMayoristaId ? String(i.packMayoristaId).trim() : null,
  }))
  .filter((x) => x.productId && x.cantidad > 0)

    if (!cart.length) {
      return NextResponse.json({ ok: false, error: "invalid_cart", message: "Items inválidos (sin productId)." }, { status: 400 })
    }
    const hasMayorista = cart.some((item) => !!item.packMayoristaId)

if (hasMayorista && !isQuoteOnly) {
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
    const ids = cart.map((x) => x.productId)

    // ==========================
    // 3) Clasificar líneas (como Preference): mayorista vs producto, combo vs normal
    // ==========================
  
   const mayoristaLines = cart.filter((x) => !!x.packMayoristaId)
const productLines = cart.filter((x) => !x.packMayoristaId)

const comboLines = productLines.filter((x) => !!x.comboId)
const normalProductLines = productLines.filter((x) => !x.comboId)
    // Stock SOLO para productos (combo + normal). NUNCA para packMayorista.
    const stockCart = [...comboLines, ...normalProductLines]
    const skipStock = stockCart.length === 0



    let subtotal = 0
    const stockErrors: any[] = []
    let byId = new Map<string, any>()

    // 3A) Validación de stock (si aplica) SIEMPRE por productos del carrito
    if (!skipStock) {
      const ids = [...new Set(stockCart.map((x) => x.productId))]
      const prods = await getProductsSnapshot(ids)
      byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

      for (const it of stockCart) {

        const prod = byId.get(it.productId)
        if (!prod) {
          stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available: 0, ok: false })
          continue
        }

        const available = getAvailable(prod, it.talle)
        if (available < it.cantidad) {
          stockErrors.push({ productId: it.productId, talle: it.talle, requested: it.cantidad, available, ok: false })
          continue
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
    // 3B) Subtotal (igual que Preference)
    // - mayorista: pack.price * cantidad
    // - combos 2x1: pairs * promo + (si impar) 1 suelta (la más cara)
    // - normales: unitPrice * cantidad
    // ==========================
    let subtotalCalc = 0

    // A) Pack mayorista (agrupado por packMayoristaId)
if (mayoristaLines.length) {
  const group = new Map<string, CartItem[]>()

  for (const line of mayoristaLines) {
    const pid = String(line.packMayoristaId || "").trim()
    if (!pid) continue
    group.set(pid, [...(group.get(pid) || []), line])
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
        {
          ok: false,
          error: "invalid_pack_price",
          message: "Pack mayorista sin precio válido.",
          packId: pid,
          pack,
        },
        { status: 400 }
      )
    }

    const lines = group.get(pid) || []
    const totalUnits = lines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0)

    const packsQty = Math.floor(totalUnits / 10)
    const remainder = totalUnits % 10

    if (packsQty > 0) {
      subtotalCalc += toMoney(unit * packsQty)
    }

    if (remainder > 0) {
      const ids = [...new Set(lines.map((l) => l.productId))]
      const prods = await getProductsSnapshot(ids)
      const byIdMayorista = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

      const unitPrices: number[] = []

      for (const l of lines) {
        const prod = byIdMayorista.get(l.productId)
        const realUnit = getUnitPrice(prod)
        for (let k = 0; k < Number(l.cantidad || 0); k++) {
          unitPrices.push(realUnit)
        }
      }

      unitPrices.sort((a, b) => b - a)
      const remainderSum = unitPrices.slice(0, remainder).reduce((acc, v) => acc + v, 0)
      subtotalCalc += toMoney(remainderSum)
    }
  }
}
    // B) Combos / 2x1 (agrupado por comboId)
    if (comboLines.length) {
      // 1) agrupar por comboId
      const group = new Map<string, CartItem[]>()
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
  const basePromoUnit = toMoney(Number(pack?.price ?? 0))
const promoUnit =
  isTransferMode && pack?._type !== "packMayorista"
    ? toMoney(basePromoUnit * 0.7)
    : basePromoUnit
  if (!pack?._id || !promoUnit || promoUnit <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_combo_price", message: "Combo/2x1 sin precio válido.", comboId: cid, pack },
      { status: 400 }
    )
  }

  const lines = group.get(cid) || []
  const totalUnits = lines.reduce((acc, l) => acc + Number(l.cantidad || 0), 0)

  const bundleSize = Math.max(1, Number(pack?.bundleSize ?? 2)) // fallback 2
  const bundles = Math.floor(totalUnits / bundleSize)
  const remainder = totalUnits % bundleSize

  if (bundles > 0) subtotalCalc += toMoney(bundles * promoUnit)

  if (remainder > 0) {
    const unitPrices: number[] = []

    for (const l of lines) {
      const prod = byId.get(l.productId)
      const unit = getUnitPrice(prod)
      for (let k = 0; k < Number(l.cantidad || 0); k++) unitPrices.push(unit)
    }

    unitPrices.sort((a, b) => b - a) // más caras primero
    const remainderSum = unitPrices.slice(0, remainder).reduce((acc, v) => acc + v, 0)

    if (!remainderSum || remainderSum <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_combo_remainder", message: "No se pudo calcular los sobrantes del combo.", comboId: cid },
        { status: 400 }
      )
    }

    subtotalCalc += toMoney(remainderSum)
  }
} // ✅ CIERRA for cid
} // ✅ CIERRA if (comboLines.length)


    // C) Productos normales
    for (const it of normalProductLines) {
  const prod = byId.get(it.productId)
  if (!prod) continue

  const baseUnit = getUnitPrice(prod)
  const finalUnit =
    isTransferMode && !it.packMayoristaId
      ? toMoney(baseUnit * 0.7)
      : baseUnit

  subtotalCalc += toMoney(finalUnit * Number(it.cantidad || 1))
}
    subtotal = toMoney(subtotalCalc)




   // 4) Shipping
const { origin } = new URL(req.url)
const shippingType = body.shipping?.type === "domicilio" ? "domicilio" : "sucursal"
const shippingPrice = shippingType === "domicilio" ? await getShippingPrice(origin, body.shipping?.cp) : 0

const couponResult = await validateCoupon({
  couponCode: body.couponCode ?? null,
  subtotal,
})

const couponCode = couponResult.couponCode
const couponDiscount = Number(couponResult.couponDiscount ?? 0)
const appliedCoupon = couponResult.appliedCoupon
const couponError = couponResult.error

const computedTotal = toMoney(subtotal - couponDiscount + shippingPrice)

if (!computedTotal || computedTotal <= 0) {
  return NextResponse.json(
    { ok: false, error: "invalid_amount", message: "Monto inválido." },
    { status: 400 }
  )
}

    // ==========================
// ✅ NUEVO: lines[] para UI (precio efectivo por línea)
// ==========================
const lines: Array<{ cartKey: string; unitPrice: number; lineTotal: number }> = []

// A) Productos normales: unitario real
for (const it of normalProductLines) {
  const prod = byId.get(it.productId)
  const unit = getUnitPrice(prod)
  lines.push({
    cartKey: it.cartKey,
    unitPrice: unit,
    lineTotal: toMoney(unit * Number(it.cantidad || 1)),
  })
}

// B) Pack mayorista: unit = pack.price
if (mayoristaLines.length) {
  const group = new Map<string, CartItem[]>()

  for (const line of mayoristaLines) {
    const pid = String(line.packMayoristaId || "").trim()
    if (!pid) continue
    group.set(pid, [...(group.get(pid) || []), line])
  }

  const mayoristaIds = [...group.keys()]
  const mayoristaSnaps = await Promise.all(mayoristaIds.map((id) => getPackSnapshot(id)))
  const mayoristaById = new Map<string, PackSnapshot>(
    (mayoristaSnaps.filter(Boolean) as PackSnapshot[]).map((p) => [String(p._id), p])
  )

  for (const pid of mayoristaIds) {
    const pack = mayoristaById.get(pid) || null
    const unit = toMoney(Number(pack?.price ?? 0))
    const these = group.get(pid) || []

const mayoristaProductIds = [...new Set(these.map((l) => l.productId))]
const mayoristaProducts = await getProductsSnapshot(mayoristaProductIds)
const byIdMayorista = new Map<string, any>(
  (mayoristaProducts || []).map((p: any) => [String(p._id), p])
)

const expanded: Array<{ cartKey: string; unit: number }> = []
for (const l of these) {
  const prod = byIdMayorista.get(l.productId)
  const realUnit = getUnitPrice(prod)
  for (let k = 0; k < Number(l.cantidad || 0); k++) {
    expanded.push({ cartKey: l.cartKey, unit: realUnit })
  }
}

    expanded.sort((a, b) => b.unit - a.unit)

    const totalUnits = expanded.length
    const remainder = totalUnits % 10

    const looseQtyByKey = new Map<string, number>()
    for (let i = 0; i < remainder; i++) {
      const u = expanded[i]
      looseQtyByKey.set(u.cartKey, (looseQtyByKey.get(u.cartKey) || 0) + 1)
    }

    const promoUnitPerItem = toMoney(unit / 10)

    for (const l of these) {
  const prod = byIdMayorista.get(l.productId)
  const realUnit = getUnitPrice(prod)

  const looseQty = looseQtyByKey.get(l.cartKey) || 0
  const promoQty = Math.max(0, Number(l.cantidad || 0) - looseQty)

  const lineTotal = toMoney(looseQty * realUnit + promoQty * promoUnitPerItem)
  const unitPriceForDisplay = toMoney(lineTotal / Number(l.cantidad || 1))

  const idx = lines.findIndex((x) => x.cartKey === l.cartKey)
  if (idx >= 0) lines[idx] = { cartKey: l.cartKey, unitPrice: unitPriceForDisplay, lineTotal }
  else lines.push({ cartKey: l.cartKey, unitPrice: unitPriceForDisplay, lineTotal })
}} // cierre for (const pid of mayoristaIds)
} // cierre if (mayoristaLines.length)

// C) Combos / 2x1: agrupar por comboId y decidir sobrantes (las más caras quedan sueltas)
if (comboLines.length) {
  const group = new Map<string, CartItem[]>()
  for (const line of comboLines) {
    const cid = String(line.comboId || "").trim()
    if (!cid) continue
    group.set(cid, [...(group.get(cid) || []), line])
  }

  const comboIds = [...group.keys()]
  const comboSnaps = await Promise.all(comboIds.map((id) => getPackSnapshot(id)))
  const comboById = new Map<string, PackSnapshot>(
    (comboSnaps.filter(Boolean) as PackSnapshot[]).map((p) => [String(p._id), p])
  )

  for (const cid of comboIds) {
    const pack = comboById.get(cid) || null
    const bundleSize = Math.max(1, Number(pack?.bundleSize ?? 2)) // 2 para 2x1, 3 para 3x..., etc.
    const promoTotal = toMoney(Number(pack?.price ?? 0))
    const promoUnitPerItem = toMoney(promoTotal / bundleSize)

    const these = group.get(cid) || []

    // Expandir unidades (para poder elegir cuáles sobran: las más caras)
    const units: Array<{ cartKey: string; unit: number }> = []
    for (const l of these) {
      const prod = byId.get(l.productId)
      const realUnit = getUnitPrice(prod)
      for (let k = 0; k < Number(l.cantidad || 0); k++) {
        units.push({ cartKey: l.cartKey, unit: realUnit })
      }
    }

    units.sort((a, b) => b.unit - a.unit) // más caras primero

    const totalUnits = units.length
    const remainder = totalUnits % bundleSize

    // remainder unidades (las más caras) quedan a precio real
    const remainderQtyByKey = new Map<string, number>()
    for (let i = 0; i < remainder; i++) {
      const u = units[i]
      remainderQtyByKey.set(u.cartKey, (remainderQtyByKey.get(u.cartKey) || 0) + 1)
    }

    // Ahora armamos lineTotal por cada línea (mezcla promo + sueltas)
    for (const l of these) {
      const prod = byId.get(l.productId)
      const realUnit = getUnitPrice(prod)

      const looseQty = remainderQtyByKey.get(l.cartKey) || 0
      const promoQty = Math.max(0, Number(l.cantidad || 0) - looseQty)

      const lineTotal = toMoney(looseQty * realUnit + promoQty * promoUnitPerItem)
      const unitPriceForDisplay = toMoney(lineTotal / Number(l.cantidad || 1))

      // reemplazar si ya estaba
      const idx = lines.findIndex((x) => x.cartKey === l.cartKey)
      if (idx >= 0) lines[idx] = { cartKey: l.cartKey, unitPrice: unitPriceForDisplay, lineTotal }
      else lines.push({ cartKey: l.cartKey, unitPrice: unitPriceForDisplay, lineTotal })
    }
  }
}


    if ((body as any).quoteOnly) {
  return NextResponse.json({
    ok: true,
    quoteOnly: true,
    computedTotal,
    subtotal,
    shippingPrice,
    shippingType,
    couponCode,
    couponDiscount,
    appliedCoupon,
    couponError,
    lines,
  })
}


    // (Opcional) sanity-check del monto que manda el front: NO afecta el cobro (cobramos computedTotal)
    const clientAmount = body.amount != null ? toMoney(body.amount) : null

    if (clientAmount != null && Math.abs(clientAmount - computedTotal) > 0.01) {
      console.warn("Amount mismatch:", {
        clientAmount,
        computedTotal,
        comboId: body.comboId || null,
        orderId: body.orderId,
      })

      // 🔒 Airbag: si el front está inicializando el Brick con un total mayor (ej combo),
      // pero el backend no lo puede justificar (comboId faltante o lógica rota), NO cobramos.
      return NextResponse.json(
        {
          ok: false,
          error: "amount_mismatch",
          message: "El monto del checkout no coincide con el monto calculado por el servidor.",
          clientAmount,
          serverAmount: computedTotal,
          comboId: body.comboId || null,
        },
        { status: 400 }
      )
    }


    // 5) Idempotencia (orderId)
    // Importante para NO descontar doble: usamos orderId para MP Idempotency Key + markerId de Sanity.
    const orderId =
      body.orderId ||
      crypto
        .createHash("sha256")
        .update(JSON.stringify({ ids, computedTotal, minute: Math.floor(Date.now() / 60000) }))
        .digest("hex")

    // 6) MP payload
    const packIds = [...new Set(
  mayoristaLines
    .map((x) => String(x.packMayoristaId || "").trim())
    .filter(Boolean)
)]

    const mpPayload: any = {
  token,
  transaction_amount: computedTotal,
  description: "Compra en la tienda",
  installments,
  payment_method_id,
  issuer_id,
  payer: {
    email,
    identification: {
      type: identification.type,
      number: identification.number,
    },
  },
  capture: true,
  notification_url: `${origin}/api/mp/webhook`,
  metadata: {
    orderId,
    source: "card_inline",
    comboId: body.comboId ? String(body.comboId).trim() : null,
    packIds,
    packType: packIds.length ? "packMayorista" : null,
    packTitle: null,

    customer: {
      nombre: body.customer?.nombre || null,
      apellido: body.customer?.apellido || null,
      telefono: body.customer?.telefono || null,
      email: email || null,
      envio: body.customer?.envio || shippingType,
      cp: body.customer?.cp || body.shipping?.cp || null,
      departamento: body.customer?.departamento || null,
      provincia: body.customer?.provincia || null,
      pais: body.customer?.pais || null,
      direccion: body.customer?.direccion || null,
    },

   shippingType,
shippingPrice,
subtotal,
couponCode,
couponDiscount,
appliedCouponCode: appliedCoupon?.code ?? null,

cart,
cartJson: JSON.stringify(cart),
  },
}

    const mpToken = process.env.MP_ACCESS_TOKEN
    if (!mpToken) {
      return NextResponse.json({ ok: false, error: "missing_mp_token", message: "Falta MP_ACCESS_TOKEN" }, { status: 500 })
    }


    console.log("MP_PAYLOAD_DEBUG", {
  tokenPreview: mpPayload?.token ? String(mpPayload.token).slice(0, 12) : null,
  transaction_amount: mpPayload?.transaction_amount,
  payment_method_id: mpPayload?.payment_method_id,
  issuer_id: mpPayload?.issuer_id,
  installments: mpPayload?.installments,
  payer: mpPayload?.payer,
  capture: mpPayload?.capture,
})


  // 7) Crear pago
const res = await fetch("https://api.mercadopago.com/v1/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${mpToken}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": String(orderId),
  },
  body: JSON.stringify(mpPayload),
})

const data = await res.json().catch(() => null)

if (!res.ok) {
  console.error("MP_ERROR_FULL", JSON.stringify(data, null, 2))

  return NextResponse.json(
    {
      ok: false,
      error: "mp_error",
      message: data?.message || "Error procesando el pago",
      status_detail: data?.cause?.[0]?.code || data?.status_detail,
      mp: data,
    },
    { status: res.status }
  )
}

// 8) Estado MP
const status = String(data?.status || "").toLowerCase()
const paymentId = data?.id != null ? String(data.id) : ""
const statusDetail = data?.status_detail != null ? String(data.status_detail) : ""

if (!paymentId) {
  return NextResponse.json(
    { ok: false, error: "mp_no_payment_id", message: "MP no devolvió payment id", mp: data },
    { status: 502 }
  )
}

/**
 * ✅ NUEVO (CRÍTICO):
 * Guardar cart + customer en Sanity usando mp_payment_<paymentId>
 * para que el webhook (card_inline) pueda armar el mail con items
 */
const markerId = `mp_payment_${paymentId}`

await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  paymentId,
  orderId,
  createdAt: new Date().toISOString(),
  status: "created_card_inline",
  source: "card_inline",
})

await sanity
  .patch(markerId)
  .set({
    orderId,
    cartJson: JSON.stringify(cart || []),
   customerJson: JSON.stringify(mpPayload?.metadata?.customer || null),
    persistedAt: new Date().toISOString(),
  })
  .commit({ autoGenerateArrayKeys: true })

// (desde acá seguís con tu lógica normal)
if (status === "rejected" || status === "cancelled") {
  return NextResponse.json(
    {
      ok: false,
      error: "payment_not_authorized",
      message: "El pago no fue autorizado.",
      id: paymentId,
      status,
      status_detail: statusDetail,
      orderId,
    },
    { status: 402 }
  )
}

if (status === "in_process" || status === "pending") {
  await sanity
    .patch(markerId)
    .set({
      status: "pending",
      statusDetail,
      source: "card_inline",
      pendingAt: new Date().toISOString(),
    })
    .commit({ autoGenerateArrayKeys: true })

  return NextResponse.json({
    ok: true,
    id: paymentId,
    status,
    status_detail: statusDetail,
    orderId,
    computedTotal,
    subtotal,
    shippingPrice,
    shippingType,
  })
}



return NextResponse.json({
  ok: true,
  id: paymentId,
  status,
  status_detail: statusDetail,
  orderId,
  computedTotal,
  subtotal,
  shippingPrice,
  shippingType,
})
  } catch (err: any) {
    console.error("❌ Error en /api/payments/card:", err)
    return NextResponse.json({ ok: false, error: "internal_error", message: "Error interno" }, { status: 500 })
  }
}
