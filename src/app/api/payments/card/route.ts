// app/api/payments/card/route.ts
export const runtime = "nodejs"

import { sendOwnerSaleEmail } from "@/lib/email"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@sanity/client"

type CompactItem = {
  _id?: string
  productId?: string
  talle?: string | null
  cantidad: number
}

type BrickPayload = {
  token: string
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

  // ✅ PASO 2 – agregar esto
  customer?: {
  nombre?: string
  apellido?: string
  telefono?: string
  email?: string // ✅ NUEVO
  envio?: "domicilio" | "sucursal"
  cp?: string | null
  direccion?: {
    calle?: string
    numero?: string
    barrio?: string
    ciudad?: string
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

type PackSnapshot = { _id: string; _type: string; title: string; price: number }

async function getPackSnapshot(id: string): Promise<PackSnapshot | null> {
  if (!id) return null

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

  if (doc._type === "combo") {
    return { _id: doc._id, _type: doc._type, title: String(doc.comboNombre || "Combo"), price: Number(doc.comboPrecio ?? 0) }
  }

  if (doc._type === "zapatillas2x1") {
    return { _id: doc._id, _type: doc._type, title: String(doc.zapasNombre || "Zapatillas 2x1"), price: Number(doc.zapasPrecio ?? 0) }
  }

  if (doc._type === "packMayorista") {
    return { _id: doc._id, _type: doc._type, title: String(doc.mayoristaNombre || "Pack Mayorista"), price: Number(doc.mayoristaPrecio ?? 0) }
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

type CartItem = { productId: string; talle?: string | null; cantidad: number }

  // ==========================
// Helpers para email / resumen
// ==========================
async function getProductTitles(cart: CartItem[]) {
  const ids = [...new Set(cart.map((x) => x.productId))]

  const docs = await sanity.fetch(
    `*[_id in $ids]{ _id, _type, "nombre": coalesce(nombre, title) }`,
    { ids }
  )

  const byId = new Map<string, any>((docs || []).map((p: any) => [String(p._id), p]))

  return (cart || []).map((it) => {
    const doc = byId.get(it.productId)
    return {
      title: String(doc?.nombre || it.productId),
      talle: it.talle ?? null,
      qty: it.cantidad,
    }
  })
}


function buildShippingTextFromCustomer(body: BrickPayload) {
  const envio = body.customer?.envio || body.shipping?.type

  if (envio === "sucursal") return "Retiro por sucursal"

  const d = body.customer?.direccion
  const parts = [
    d?.calle,
    d?.numero,
    d?.barrio,
    d?.ciudad,
    body.customer?.cp,
  ].filter(Boolean)

  return parts.length ? parts.join(" ") : "Envío a domicilio"
}


async function mpCapture(paymentId: string, mpToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ capture: true }),
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}


async function mpCancel(paymentId: string, mpToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
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

async function rollbackStockAtomic(cart: CartItem[], lockId: string) {
  // Si ya hicimos rollback antes, no tocar stock otra vez
  const existing = await sanity.getDocument(lockId)
  if ((existing as any)?.rollbackDone) return { ok: true, already: true }

  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = cart.map((x) => x.productId)

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{
        _id,_rev,stock,talles[]{_key,label,stock}
      }`,
      { ids }
    )
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    try {
      for (const it of cart) {
        const prod = byId.get(it.productId)
        if (!prod) continue

        if (Array.isArray(prod.talles) && it.talle) {
          const newTalles = (prod.talles || []).map((t: any) =>
            t?.label === it.talle
              ? { ...t, stock: Number(t.stock || 0) + it.cantidad }
              : t
          )
          await sanity
            .patch(prod._id)
            .ifRevisionId(prod._rev)
            .set({ talles: newTalles })
            .commit()
        } else {
          await sanity
            .patch(prod._id)
            .ifRevisionId(prod._rev)
            .inc({ stock: it.cantidad })
            .commit()
        }
      }

      // marcar rollback para idempotencia
      await sanity.createIfNotExists({
        _id: lockId,
        _type: "mpWebhook",
        createdAt: new Date().toISOString(),
        status: "init",
      })

      await sanity
        .patch(lockId)
        .set({ rollbackDone: true, rollbackAt: new Date().toISOString() })
        .commit({ autoGenerateArrayKeys: true })


      return { ok: true }
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase()
      if (msg.includes("revision") || msg.includes("_rev") || msg.includes("conflict")) continue
      throw e
    }
  }

  return { ok: false, reason: "conflict" }
}

async function reserveStockAtomic(cart: CartItem[], lockId: string) {
  // Idempotencia: si YA quedó processed, no tocamos stock
  const existing = await sanity.getDocument(lockId)
  if ((existing as any)?.status === "processed") return { ok: true, already: true }

  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = cart.map((x) => x.productId)

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{
        _id,_rev,stock,talles[]{_key,label,stock}
      }`,
      { ids }
    )
    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    const out: any[] = []
    for (const it of cart) {
      const prod = byId.get(it.productId)
      if (!prod) {
        out.push({ productId: it.productId, talle: it.talle ?? null, ok: false, reason: "product_not_found" })
        continue
      }

      const available =
        Array.isArray(prod.talles) && it.talle
          ? Number(prod.talles.find((t: any) => t?.label === it.talle)?.stock ?? 0)
          : Number(prod.stock ?? 0)

      if (available < it.cantidad) {
        out.push({ productId: it.productId, talle: it.talle ?? null, ok: false, requested: it.cantidad, available })
      }
    }

    if (out.length) return { ok: false, reason: "out_of_stock", details: out }

    try {
      for (const it of cart) {
        const prod = byId.get(it.productId)
        if (!prod) continue

        if (Array.isArray(prod.talles) && it.talle) {
          const newTalles = (prod.talles || []).map((t: any) =>
            t?.label === it.talle ? { ...t, stock: Math.max(0, Number(t.stock || 0) - it.cantidad) } : t
          )
          await sanity.patch(prod._id).ifRevisionId(prod._rev).set({ talles: newTalles }).commit()
        } else {
          await sanity.patch(prod._id).ifRevisionId(prod._rev).dec({ stock: it.cantidad }).commit()
        }
      }

      return { ok: true }
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase()
      if (msg.includes("revision") || msg.includes("_rev") || msg.includes("conflict")) continue
      throw e
    }
  }

  return { ok: false, reason: "conflict" }
}


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BrickPayload

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

    if (!token || !payment_method_id) {
      return NextResponse.json(
        { ok: false, error: "missing_payment_data", message: "Faltan datos de la tarjeta (token o método de pago)." },
        { status: 400 }
      )
    }

    // 1.1) Email + DNI (Brick) — soporta body.email o payer.email
    const email = String(body.email || body.payer?.email || (body as any)?.payer?.email || "").trim()
    const identification = normalizeIdentification(body)

    if (!email) {
      return NextResponse.json({ ok: false, error: "missing_email", message: "Falta el email del pagador." }, { status: 400 })
    }

    if (!identification.type || !identification.number) {
      return NextResponse.json(
        { ok: false, error: "missing_identification", message: "Falta DNI/Documento del titular." },
        { status: 400 }
      )
    }

    // 2) Items
    const rawItems = Array.isArray(body.items) ? body.items : []
    if (!rawItems.length) {
      return NextResponse.json({ ok: false, error: "empty_cart", message: "Carrito vacío." }, { status: 400 })
    }

    const cart: CartItem[] = rawItems
      .map((i) => ({
        productId: String(i._id ?? i.productId ?? "").trim(),
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad ?? 1),
      }))
      .filter((x) => x.productId && x.cantidad > 0)

    if (!cart.length) {
      return NextResponse.json({ ok: false, error: "invalid_cart", message: "Items inválidos (sin productId)." }, { status: 400 })
    }

    const ids = cart.map((x) => x.productId)

// ==========================
// 3) Detectar pack/combo + stock/subtotal
// ==========================
const comboId = String(body.comboId || "").trim()
const packDebug = comboId ? await getPackSnapshot(comboId) : null

// Si el front mandó comboId pero no existe el doc, cortamos con error claro
if (comboId && !packDebug?._id) {
  return NextResponse.json(
    { ok: false, error: "invalid_comboId", message: "comboId no existe en Sanity.", comboId },
    { status: 400 }
  )
}

// Tipos
const isPackMayorista = packDebug?._type === "packMayorista"
const isComboLike = !!packDebug && (packDebug._type === "combo" || packDebug._type === "zapatillas2x1")

// Solo mayorista NO valida stock ni descuenta stock
const skipStock = isPackMayorista

let subtotal = 0
const stockErrors: any[] = []
let byId = new Map<string, any>()

// 3A) Validación de stock (si aplica) SIEMPRE por productos del carrito
if (!skipStock) {
  const prods = await getProductsSnapshot(ids)
  byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

  for (const it of cart) {
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

// 3B) Subtotal de cobro (regla correcta)
if (isPackMayorista) {
  subtotal = toMoney(Number(packDebug?.price ?? 0))
  if (!subtotal || subtotal <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_pack_price", message: "Pack mayorista sin precio válido.", comboId, packDebug },
      { status: 400 }
    )
  }
} else if (isComboLike) {
  // ✅ Cobra precio del combo / 2x1, NO suma productos
  subtotal = toMoney(Number(packDebug?.price ?? 0))
  if (!subtotal || subtotal <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_combo_price", message: "Combo sin precio válido.", comboId, packDebug },
      { status: 400 }
    )
  }
} else {
  // ✅ Producto normal: suma de productos
  let sum = 0
  for (const it of cart) {
    const prod = byId.get(it.productId)
    if (!prod) continue
    sum += getUnitPrice(prod) * it.cantidad
  }
  subtotal = toMoney(sum)
}



    // 4) Shipping
    const { origin } = new URL(req.url)
    const shippingType = body.shipping?.type === "domicilio" ? "domicilio" : "sucursal"
    const shippingPrice = shippingType === "domicilio" ? await getShippingPrice(origin, body.shipping?.cp) : 0

    const computedTotal = toMoney(subtotal + shippingPrice)
    if (!computedTotal || computedTotal <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_amount", message: "Monto inválido." }, { status: 400 })
    }

    // (Opcional) sanity-check del monto que manda el front: NO afecta el cobro (cobramos computedTotal)
    const clientAmount = body.amount != null ? toMoney(body.amount) : null
    if (clientAmount != null && Math.abs(clientAmount - computedTotal) > 0.01) {
      console.warn("Amount mismatch:", { clientAmount, computedTotal, orderId: body.orderId })
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
      capture: false,
      notification_url: `${origin}/api/mp/webhook`,
      metadata: {
  orderId,
  source: "card_inline",

  comboId: comboId || null,
  packType: packDebug?._type || null,
  packTitle: packDebug?.title || null,

  // ✅ datos humanos (vienen del front)
  customer: {
  nombre: body.customer?.nombre || null,
  apellido: body.customer?.apellido || null,
  telefono: body.customer?.telefono || null,
  email: email || null,
  envio: body.customer?.envio || shippingType,
  cp: body.customer?.cp || body.shipping?.cp || null,
  direccion: body.customer?.direccion || null,
},


  shippingType,
  shippingPrice,
  subtotal,

  // ✅ mantenemos tu formato actual (string / null)
  cart: JSON.stringify(cart),
},

    }

    const mpToken = process.env.MP_ACCESS_TOKEN
    if (!mpToken) {
      return NextResponse.json({ ok: false, error: "missing_mp_token", message: "Falta MP_ACCESS_TOKEN" }, { status: 500 })
    }

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
      await sanity.createIfNotExists({
        _id: `mp_payment_${paymentId}`,
        _type: "mpWebhook",
        paymentId,
        orderId,
        createdAt: new Date().toISOString(),
        status: "pending",
        statusDetail,
        source: "card_inline",
      })

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

const markerId = `mp_payment_${paymentId}`

// A) Reservar stock SOLO si NO es mayorista
if (!skipStock) {
  const r = await reserveStockAtomic(cart, markerId)

  if ((r as any)?.already) {
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
      already: true,
    })
  }

  if (!r.ok) {
    await mpCancel(paymentId, mpToken)

    await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook",
      paymentId,
      orderId,
      createdAt: new Date().toISOString(),
      status: "stock_insufficient",
      source: "card_inline",
      detailsJson: JSON.stringify((r as any).details ?? []),
    })

    return NextResponse.json(
      {
        ok: false,
        error: "out_of_stock_after_auth",
        message: "Se quedó sin stock mientras pagabas. No se realizó el cobro.",
        details: (r as any).details ?? null,
        id: paymentId,
        status,
        status_detail: statusDetail,
        orderId,
        computedTotal,
        subtotal,
        shippingPrice,
        shippingType,
      },
      { status: 409 }
    )
  }
}


    // C) Capturar
    const cap = await mpCapture(paymentId, mpToken)

    if (!cap.ok) {
      console.error("❌ MP capture failed:", {
        paymentId,
        orderId,
        mp: cap.data,
      })

      // 1) Guardar evento (si no existía)
      await sanity.createIfNotExists({
        _id: markerId,
        _type: "mpWebhook",
        paymentId,
        orderId,
        createdAt: new Date().toISOString(),
        status: "capture_failed",
        source: "card_inline",
        detailsJson: JSON.stringify({ mp: cap.data }),
      })

      // 2) Intentar cancelar el pago autorizado (best-effort)
      await mpCancel(paymentId, mpToken).catch(() => null)

      // 3) 🔁 ROLLBACK DE STOCK (idempotente)
      if (!skipStock) {
  await rollbackStockAtomic(cart, markerId).catch(() => null)
}

      await sanity
        .patch(markerId)
        .set({ status: "capture_failed_rolled_back" })
        .commit()
        .catch(() => null)

      return NextResponse.json(
        {
          ok: false,
          error: "capture_failed",
          message: "Falló la captura del pago. No se realizó el cobro y se revirtió el stock.",
          id: paymentId,
          orderId,
          mp: cap.data,
        },
        { status: 502 }
      )
    }

    await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook",
      paymentId,
      orderId,
      createdAt: new Date().toISOString(),
      status: "processed",
      source: "card_inline",
    })



    const finalStatus = String(cap.data?.status || status).toLowerCase()
    const finalDetail = String(cap.data?.status_detail || statusDetail || "")

    return NextResponse.json({
      ok: true,
      id: paymentId,
      status: finalStatus,
      status_detail: finalDetail,
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
