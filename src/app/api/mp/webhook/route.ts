// src/app/api/mp/webhook/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"
import { sendOwnerSaleEmail } from "@/lib/email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

type CartItem = { productId: string; talle?: string | null; cantidad: number }

function respond200(payload: Record<string, any>, startedAt: number) {
  console.log("✅ webhook_responding_200", { ms: Date.now() - startedAt, ...payload })
  return NextResponse.json({ ok: true, ...payload }, { status: 200 })
}

async function mpGet(url: string) {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("Missing MP_ACCESS_TOKEN")

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function mpGetSoft(url: string) {
  try {
    return await mpGet(url)
  } catch (e: any) {
    const msg = String(e?.message || "")
    return { __error: true, __message: msg }
  }
}


function pickTopicAndId(req: Request, body: any) {
  const url = new URL(req.url)

  const topic =
    url.searchParams.get("topic") ||
    url.searchParams.get("type") ||
    body?.topic ||
    body?.type

  // ✅ CLAVE: MP manda el id como data.id en querystring
  const id =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    body?.id ||
    body?.data?.id ||
    body?.resource?.split("/")?.pop()

  return { topic, id }
}


async function reserveStockAtomic(cart: CartItem[], lockId: string) {
  const existing = await sanity.getDocument(lockId)
  if ((existing as any)?.status === "processed") return { ok: true, already: true }

  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = cart.map((x) => x.productId)

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{ _id,_rev,stock,talles[]{_key,label,stock} }`,
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
          ? Number((prod.talles.find((t: any) => t?.label === it.talle)?.stock) ?? 0)
          : Number(prod.stock ?? 0)

      if (available < it.cantidad) {
        out.push({ productId: it.productId, talle: it.talle ?? null, ok: false, requested: it.cantidad, available })
      }
    }

    if (out.length) return { ok: false, reason: "out_of_stock", details: out }

    try {
      for (const it of cart) {
        const prod = byId.get(it.productId)

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

function parseCartFromPref(pref: any): CartItem[] {
  let cart: CartItem[] = []
  const rawCart = pref?.metadata?.cart

  if (Array.isArray(rawCart)) {
    cart = rawCart as CartItem[]
  } else if (typeof rawCart === "string") {
    try {
      const parsed = JSON.parse(rawCart)
      if (Array.isArray(parsed)) cart = parsed as CartItem[]
    } catch (e) {
      console.warn("⚠️ No se pudo parsear metadata.cart (string)", e)
    }
  }

  cart = (cart || [])
    .map((x: any) => ({
      productId: String(x?.productId ?? x?._id ?? "").trim(),
      talle: x?.talle ?? null,
      cantidad: Number(x?.cantidad ?? 1),
    }))
    .filter((x: any) => x.productId && x.cantidad > 0)

  return cart
}

type MetaCustomer = {
  nombre?: string | null
  apellido?: string | null
  telefono?: string | null
  email?: string | null // ✅ NUEVO
  envio?: "domicilio" | "sucursal" | null
  cp?: string | null
  direccion?: {
    calle?: string | null
    numero?: string | null
    barrio?: string | null
    ciudad?: string | null
  } | null
}


function parseCartFromMetadata(meta: any): CartItem[] {
  const raw = meta?.cart

  let arr: any[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed
    } catch {}
  }

  return (arr || [])
    .map((x: any) => ({
      productId: String(x?.productId ?? x?._id ?? "").trim(),
      talle: x?.talle ?? null,
      cantidad: Number(x?.cantidad ?? 1),
    }))
    .filter((x: any) => x.productId && x.cantidad > 0)
}

function buildShippingFromCustomer(customer: MetaCustomer | null | undefined): string {
  const envio = customer?.envio
  if (envio === "sucursal") return "Retiro por sucursal"

  const d = customer?.direccion
  const parts = [d?.calle, d?.numero, d?.barrio, d?.ciudad, customer?.cp].filter(Boolean)
  return parts.length ? parts.join(" ") : "Envío a domicilio"
}

function buildBuyerNameFromCustomer(customer: MetaCustomer | null | undefined): string {
  const n = String(customer?.nombre || "").trim()
  const a = String(customer?.apellido || "").trim()
  return `${n} ${a}`.trim()
}




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


function buildShippingAddress(payment: any) {
  // MP puede traer shipping / additional_info en distintos lugares según el flujo
  const addr =
    payment?.additional_info?.shipments?.receiver_address ||
    payment?.additional_info?.payer?.address ||
    payment?.payer?.address ||
    null

  if (!addr) return ""

  const parts = [
    addr?.street_name,
    addr?.street_number,
    addr?.zip_code,
    addr?.city_name,
    addr?.state_name,
  ].filter(Boolean)

  return parts.join(" ")
}


  function buildItemsText(cart: CartItem[]) {
  return cart
    .map((i) => `• ${i.productId}${i.talle ? ` (Talle ${i.talle})` : ""} x ${i.cantidad}`)
    .join("\n")
}



async function handle(req: Request) {
  const startedAt = Date.now()

  try {
    let body: any = null
    try {
      body = await req.json()
    } catch {
      // GET o body inválido
    }

    const { topic, id } = pickTopicAndId(req, body)

    console.log("📩 webhook_received", {
      method: req.method,
      topic,
      id,
      hasBody: !!body,
      qs: new URL(req.url).search,
    })

    if (!topic || !id) {
      return respond200({ msg: "missing_topic_or_id", topic, id }, startedAt)
    }

    // =========================
    // 1) Resolver merchant_order + paymentId
    // =========================
    let merchantOrder: any = null
    let paymentId: string | null = null

    if (topic === "payment") {
  // OJO: data.id a veces NO es el paymentId real (puede ser notification id).
  // Probamos resolverlo como paymentId y si no existe, respondemos 200 sin cortar el flujo.

  const paymentTry = await mpGetSoft(`https://api.mercadopago.com/v1/payments/${id}`)

  if ((paymentTry as any).__error) {
    // ✅ No rompemos: esperamos a que llegue merchant_order o a un retry de MP
    return respond200(
      { msg: "payment_id_not_resolvable_yet", receivedId: id, topic },
      startedAt
    )
  }

  const payment = paymentTry
  console.log("💳 payment", { id: payment?.id, status: payment?.status, order: payment?.order })

  if (String(payment?.status || "").toLowerCase() !== "approved") {
    return respond200(
      { msg: "payment_not_approved_yet", paymentId: payment?.id, status: payment?.status },
      startedAt
    )
  }

  paymentId = String(payment?.id || "")
  const markerId = `mp_payment_${paymentId}`

  const merchantOrderId =
    payment?.order?.id || payment?.order_id || payment?.merchant_order_id

  if (!merchantOrderId) {
  // ✅ Flujo Brick/card_inline: no hay merchant_order, usamos payment.metadata
  const meta = payment?.metadata || {}

// candado idempotente
await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  paymentId,
  orderId: meta?.orderId || null,
  createdAt: new Date().toISOString(),
  status: "processing",
})

// 🔥 en vez de confiar en "marker", traemos el doc real
const existing = await sanity.getDocument(markerId)

if ((existing as any)?.status === "processed" && (existing as any)?.ownerNotified === true) {
  return respond200(
    { msg: "already_processed_card_inline", markerId, paymentId },
    startedAt
  )
}

// si está processed pero ownerNotified NO, dejamos seguir para reintentar mail


  // armar comprador desde metadata.customer
  const customer: any = meta?.customer || null
  // 🔎 DEBUG EMAIL
console.log("email_debug", {
  metaCustomerEmail: meta?.customer?.email,
  payerEmail: payment?.payer?.email,
})
  const buyerName = buildBuyerNameFromCustomer(customer) || undefined
  const buyerPhone = String(customer?.telefono || "").trim() || undefined

const buyerEmail =
  String(meta?.customer?.email || "").trim() ||
  String(payment?.payer?.email || "").trim() ||
  undefined

  // envío desde metadata.customer
  const shippingAddress = buildShippingFromCustomer(customer) || undefined

  // items: si es mayorista, usamos packTitle; si no, usamos cart
  const packType = meta?.packType || null
  const isMayorista = packType === "packMayorista"

  const cart = isMayorista ? [] : parseCartFromMetadata(meta)

  const items = isMayorista
    ? [{ title: String(meta?.packTitle || "Pack Mayorista"), talle: null, qty: 1 }]
    : await getProductTitles(cart)

  // idempotencia de email
  const updated = await sanity
    .patch(markerId)
    .setIfMissing({ ownerNotified: false })
    .set({ status: "processed", processedAt: new Date().toISOString() })
    .commit({ returnDocuments: true })
    .catch(() => null)
console.log("📧 attempting_owner_email_card_inline", {
  markerId,
  paymentId,
  orderId: String(meta?.orderId || paymentId),
  buyerName,
  buyerEmail,
  buyerPhone,
  shippingAddress,
  itemsCount: items?.length || 0,
})

  if (updated && updated.ownerNotified !== true) {
    try {
      const orderIdForEmail = String(meta?.orderId || paymentId)
      await sendOwnerSaleEmail({
        orderId: orderIdForEmail,
        paymentId,
        total: Number(payment?.transaction_amount ?? 0) || undefined,
        currency: String(payment?.currency_id || "ARS"),
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingAddress,
        items,
      })

      await sanity
        .patch(markerId)
        .set({ ownerNotified: true, ownerNotifiedAt: new Date().toISOString() })
        .commit()
        .catch(() => {})
    } catch (e: any) {
      console.error("❌ owner_notify_failed (card_inline)", {
  message: e?.message,
  name: e?.name,
  stack: e?.stack,
  raw: e,
})
    }
  }

  return respond200({ msg: "processed_card_inline_no_merchant_order", markerId, paymentId }, startedAt)
}


  merchantOrder = await mpGet(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`)
}
else if (topic === "merchant_order") {
      merchantOrder = await mpGet(`https://api.mercadopago.com/merchant_orders/${id}`)
    } else {
      // otros topics: ignorar pero 200
      return respond200({ ignored: true, topic }, startedAt)
    }

    const payments = Array.isArray(merchantOrder?.payments) ? merchantOrder.payments : []
    const approvedPayment = payments.length ? [...payments].reverse().find((p: any) => p.status === "approved") : null

    // Si veníamos por payment aprobado, paymentId ya lo tenemos. Sino, lo buscamos en la merchant order.
    if (!paymentId) paymentId = approvedPayment?.id ? String(approvedPayment.id) : null

    console.log("🧾 merchant_order", {
      id: merchantOrder?.id,
      preference_id: merchantOrder?.preference_id,
      payments: payments.map((p: any) => ({ id: p.id, status: p.status })),
      chosenPaymentId: paymentId,
    })

    if (!paymentId) {
      return respond200({ msg: "not_approved_yet", orderId: merchantOrder?.id }, startedAt)
    }

    const markerId = `mp_payment_${paymentId}`

    // =========================
    // 2) Candado idempotente
    // =========================
    const marker = await sanity.createIfNotExists({
      _id: markerId,
      _type: "mpWebhook",
      paymentId,
      orderId: merchantOrder?.id,
      preferenceId: merchantOrder?.preference_id || merchantOrder?.preference_id || null,
      createdAt: new Date().toISOString(),
      status: "processing",
    })

    if ((marker as any)?.status && (marker as any).status !== "processing") {
      return respond200(
        { msg: "already_processed", markerId, paymentId, status: (marker as any).status },
        startedAt
      )
    }

    // =========================
    // 3) Traer preferencia + cart
    // =========================
    const prefId = merchantOrder?.preference_id
    if (!prefId) {
      await sanity.patch(markerId).set({ status: "no_preference_id" }).commit().catch(() => {})
      return respond200({ msg: "no_preference_id", markerId, paymentId }, startedAt)
    }

    const pref = await mpGet(`https://api.mercadopago.com/checkout/preferences/${prefId}`)


    const cart = parseCartFromPref(pref)

    if (!cart.length) {
      await sanity.patch(markerId).set({ status: "no_cart_metadata" }).commit().catch(() => {})
      return respond200({ msg: "no_cart_metadata", markerId, paymentId, preferenceId: prefId }, startedAt)
    }
// =========================
// 4) Reservar stock
// - NO se descuenta para packMayorista
// =========================
const packType = pref?.metadata?.packType || null
const isMayorista = packType === "packMayorista"

if (!isMayorista) {
  const r = await reserveStockAtomic(cart, markerId)

  if (!r.ok) {
    console.log("❌ Sin stock — marcando orden como failed_stock")

    await sanity
      .patch(markerId)
      .set({
        status: "failed_stock",
        detailsJson: JSON.stringify((r as any).details ?? []),
        failedAt: new Date().toISOString(),
      })
      .commit()
      .catch(() => {})

    return respond200(
      { ignored: true, reason: "failed_stock", markerId, paymentId },
      startedAt
    )
  }
} else {
  console.log("📦 packMayorista: skipping stock reserve", { markerId, paymentId })
}




    // =========================
// 5) Procesado + aviso por mail (idempotente)
// =========================
const processedAt = new Date().toISOString()

const updated = await sanity
  .patch(markerId)
  .setIfMissing({ ownerNotified: false })
  .set({ status: "processed", processedAt })
  .commit({ returnDocuments: true })
  .catch(() => null)

// 🟢 Avisar al dueño SOLO una vez
if (updated && updated.ownerNotified !== true) {
  try {
    const payment = await mpGetSoft(`https://api.mercadopago.com/v1/payments/${paymentId}`)
const buyerName =
  String(payment?.payer?.first_name || "").trim() +
  (payment?.payer?.last_name ? ` ${String(payment.payer.last_name).trim()}` : "")

const buyerEmail = payment?.payer?.email ? String(payment.payer.email) : ""
const buyerPhone = payment?.payer?.phone
  ? `${payment.payer.phone?.area_code || ""}${payment.payer.phone?.number ? ` ${payment.payer.phone.number}` : ""}`.trim()
  : ""

const shippingAddress = buildShippingAddress(payment)

// productos con nombre desde Sanity
const items = await getProductTitles(cart)

await sendOwnerSaleEmail({
  orderId: merchantOrder?.id || paymentId,
  paymentId,
  total: approvedPayment?.transaction_amount,
  currency: approvedPayment?.currency_id,
  buyerName: buyerName.trim() || undefined,
  buyerEmail: buyerEmail || undefined,
  buyerPhone: buyerPhone || undefined,
  shippingAddress: shippingAddress || undefined,
  items,
})


    await sanity
      .patch(markerId)
      .set({
        ownerNotified: true,
        ownerNotifiedAt: new Date().toISOString(),
      })
      .commit()
      .catch(() => {})

    console.log("📧 owner_notified_ok", { markerId })
  } catch (e: any) {
    console.error("❌ owner_notify_failed", e?.message || e)
    // IMPORTANTE: no rompemos el webhook si falla el mail
  }
}

return respond200({ msg: "processed", markerId, paymentId, preferenceId: prefId }, startedAt)

  } catch (err: any) {
    console.error("🔥 webhook_fatal_error", { message: err?.message, stack: err?.stack })
    return respond200({ msg: "fatal_error" }, Date.now())
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
