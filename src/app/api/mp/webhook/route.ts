// src/app/api/mp/webhook/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@sanity/client"
import { sendOwnerSaleEmail, sendCustomerPurchaseEmail } from "@/lib/email"


export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

type CartItem = {
  productId: string
  talle?: string | null
  cantidad: number
  comboId?: string | null
  packMayoristaId?: string | null
}

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

function getEmailErrorMessage(e: any) {
  return String(
    e?.message ||
      e?.response?.data?.message ||
      e?.response?.message ||
      e?.name ||
      e ||
      "email_send_failed"
  )
}

function needsEmailRetry(doc: any) {
  return doc?.ownerNotified !== true || doc?.customerNotified !== true
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

  if (doc._type === "combo") {
    return {
      _id: doc._id,
      _type: doc._type,
      title: String(doc.comboNombre || "Combo"),
      price: Number(doc.comboPrecio ?? 0),
    }
  }

  if (doc._type === "zapatillas2x1") {
    return {
      _id: doc._id,
      _type: doc._type,
      title: String(doc.zapasNombre || "Zapatillas 2x1"),
      price: Number(doc.zapasPrecio ?? 0),
    }
  }

  if (doc._type === "packMayorista") {
    return {
      _id: doc._id,
      _type: doc._type,
      title: String(doc.mayoristaNombre || "Pack Mayorista"),
      price: Number(doc.mayoristaPrecio ?? 0),
    }
  }

  return null
}

async function reserveStockAtomic(cart: CartItem[], lockId: string) {
  const existing = await sanity.getDocument(lockId)

if ((existing as any)?.status === "processed") {
  return { ok: true, already: true }
}


  const MAX_RETRIES = 8

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ids = [...new Set((cart || []).map((x) => String(x.productId)))]

    const prods = await sanity.fetch(
      `*[_type=="producto" && _id in $ids]{ _id,_rev,stock,talles[]{_key,label,stock} }`,
      { ids }
    )

    const byId = new Map<string, any>((prods || []).map((p: any) => [String(p._id), p]))

    // =========================
    // 1) VALIDACIÓN DE STOCK (agrupada por productId+talle)
    // =========================
    const need = new Map<string, number>()
    for (const it of cart || []) {
      const pid = String(it?.productId || "").trim()
      if (!pid) continue
      const talle = it?.talle ? String(it.talle).trim() : ""
      const qty = Number(it?.cantidad ?? 0)
      if (!qty || qty <= 0) continue

      const key = `${pid}::${talle}`
      need.set(key, (need.get(key) || 0) + qty)
    }

    const out: any[] = []
    for (const [key, qty] of need.entries()) {
      const [pid, talleRaw] = key.split("::")
      const talle = talleRaw || null

      const prod = byId.get(pid)
      if (!prod) {
        out.push({ productId: pid, talle, ok: false, reason: "product_not_found" })
        continue
      }

      const available =
        Array.isArray(prod.talles) && talle
          ? Number((prod.talles.find((t: any) => String(t?.label ?? "").trim() === talle)?.stock) ?? 0)
          : Number(prod.stock ?? 0)

      if (available < qty) {
        out.push({ productId: pid, talle, ok: false, requested: qty, available })
      }
    }

    if (out.length) return { ok: false, reason: "out_of_stock", details: out }

    // =========================
    // 2) DESCUENTO ATÓMICO (1 patch por producto, no pisa talles)
    // =========================
    try {
      // agrupar líneas por productId
      const group = new Map<string, CartItem[]>()
      for (const it of cart || []) {
        const pid = String(it?.productId || "").trim()
        if (!pid) continue

        const arr = group.get(pid) || []
        arr.push({
          ...it,
          talle: it?.talle ? String(it.talle).trim() : null,
          cantidad: Number(it?.cantidad ?? 0),
        })
        group.set(pid, arr)
      }

      let tx = sanity.transaction()

      for (const [productId, lines] of group.entries()) {
        const prod = byId.get(productId)
        if (!prod) continue

        const hasTalles = Array.isArray(prod.talles) && prod.talles.length

        if (hasTalles) {
          // sumar decrementos por talle
          const decByTalle = new Map<string, number>()
          for (const l of lines) {
            const t = l?.talle ? String(l.talle).trim() : ""
            const qty = Number(l?.cantidad ?? 0)
            if (!t || qty <= 0) continue
            decByTalle.set(t, (decByTalle.get(t) || 0) + qty)
          }

          const newTalles = (prod.talles || []).map((t: any) => {
            const label = String(t?.label ?? "").trim()
            const dec = decByTalle.get(label) || 0
            if (!dec) return t
            return { ...t, stock: Math.max(0, Number(t.stock || 0) - dec) }
          })

          tx = tx.patch(prod._id, (p: any) => p.ifRevisionId(prod._rev).set({ talles: newTalles }))
        } else {
          // stock global: sumar todo el descuento
          const totalDec = lines.reduce((acc, l) => acc + Number(l?.cantidad ?? 0), 0)
          if (totalDec > 0) {
            tx = tx.patch(prod._id, (p: any) => p.ifRevisionId(prod._rev).dec({ stock: totalDec }))
          }
        }
      }

      await tx.commit()
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
  let cart: any[] = []
  const rawCart = pref?.metadata?.cart

  if (Array.isArray(rawCart)) {
    cart = rawCart
  } else if (typeof rawCart === "string") {
    try {
      const parsed = JSON.parse(rawCart)
      if (Array.isArray(parsed)) cart = parsed
    } catch (e) {
      console.warn("⚠️ No se pudo parsear metadata.cart (string)", e)
    }
  }

  // ✅ normalizar SIEMPRE (vennga array o string)
  return (cart || [])
  .map((x: any) => ({
    productId: String(x?.productId ?? x?._id ?? "").trim(),
    talle: x?.talle ?? null,
    cantidad: Number(x?.cantidad ?? 1),
    comboId: x?.comboId ? String(x.comboId).trim() : null,
    packMayoristaId: x?.packMayoristaId ? String(x.packMayoristaId).trim() : null,
  }))
  .filter((x: any) => x.productId && x.cantidad > 0)
}



function parseComboLinesFromPref(pref: any): CartItem[] {
  const raw = pref?.metadata?.comboLines

  let arr: any[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed
    } catch { }
  }

  return (arr || [])
    .map((x: any) => ({
      productId: String(x?.productId ?? x?._id ?? "").trim(),
      talle: x?.talle ?? null,
      cantidad: Number(x?.cantidad ?? 1),
      comboId: x?.comboId ? String(x.comboId).trim() : null, // ✅ IMPORTANTE
    }))
    .filter((x: any) => x.productId && x.cantidad > 0)
}

function mergeCartItems(items: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()

  for (const it of items || []) {
    const key = `${String(it.productId)}::${String(it.talle || "")}`
    const prev = map.get(key)

    if (!prev) {
      map.set(key, { ...it, cantidad: Number(it.cantidad || 0) })
    } else {
      map.set(key, {
  ...prev,
  comboId: prev.comboId || it.comboId || null,
  packMayoristaId: prev.packMayoristaId || it.packMayoristaId || null,
  cantidad: Number(prev.cantidad || 0) + Number(it.cantidad || 0),
})
    }
  }

  return [...map.values()].filter((x) => x.productId && x.cantidad > 0)
}



type MetaCustomer = {
  nombre?: string | null
  apellido?: string | null
  telefono?: string | null
  email?: string | null
  envio?: "domicilio" | "sucursal" | null
  cp?: string | null
  departamento?: string | null
  provincia?: string | null
  pais?: string | null
  direccion?: {
    calle?: string | null
    numero?: string | null
    barrio?: string | null
    ciudad?: string | null
    departamento?: string | null
    provincia?: string | null
    pais?: string | null
  } | null
}


function parseCartFromMetadata(meta: any): CartItem[] {
  const raw = meta?.cart ?? meta?.cartJson


  let arr: any[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed
    } catch { }
  }

  return (arr || [])
  .map((x: any) => ({
    productId: String(x?.productId ?? x?._id ?? "").trim(),
    talle: x?.talle ?? null,
    cantidad: Number(x?.cantidad ?? 1),
    comboId: x?.comboId ? String(x.comboId).trim() : null,
    packMayoristaId: x?.packMayoristaId ? String(x.packMayoristaId).trim() : null,
  }))
  .filter((x: any) => x.productId && x.cantidad > 0)
}

function buildShippingFromCustomer(customer: MetaCustomer | null | undefined): string {
  const envio = customer?.envio
  const country = customer?.direccion?.pais || customer?.pais || null

  if (envio === "sucursal") {
    return [
      "Metodo: Retiro por sucursal",
      country ? `Pais: ${country}` : null,
    ]
      .filter(Boolean)
      .join(" | ")
  }

  const d = customer?.direccion
  const street = [d?.calle, d?.numero].filter(Boolean).join(" ").trim()
  const province = d?.provincia || customer?.provincia || d?.barrio || null
  const department = d?.departamento || customer?.departamento || null

  const lines = [
    "Metodo: Envio a domicilio",
    country ? `Pais: ${country}` : null,
    street ? `Direccion: ${street}` : null,
    department ? `Departamento / referencia: ${department}` : null,
    d?.ciudad ? `Ciudad: ${d.ciudad}` : null,
    province ? `Provincia / Estado: ${province}` : null,
    customer?.cp ? `Codigo postal: ${customer.cp}` : null,
  ].filter(Boolean)

  return lines.length ? lines.join(" | ") : "Envio a domicilio"
}

function buildShippingObjectFromCustomer(customer: MetaCustomer | null | undefined) {
  const envio = customer?.envio
  const d = customer?.direccion || undefined
  const direccion =
    d || customer?.departamento || customer?.provincia || customer?.pais
      ? {
        calle: d?.calle ?? undefined,
        numero: d?.numero ?? undefined,
        barrio: d?.barrio ?? undefined,
        departamento: d?.departamento ?? customer?.departamento ?? undefined,
        ciudad: d?.ciudad ?? undefined,
        provincia: d?.provincia ?? customer?.provincia ?? d?.barrio ?? undefined,
        pais: d?.pais ?? customer?.pais ?? undefined,
      }
      : undefined

  if (envio === "sucursal") {
    return {
      type: "sucursal" as const,
      pais: customer?.pais ?? d?.pais ?? undefined,
    }
  }

  return {
    type: "domicilio" as const,
    cp: customer?.cp ?? undefined,
    pais: customer?.pais ?? d?.pais ?? undefined,
    direccion,
  }
}



function buildBuyerNameFromCustomer(customer: MetaCustomer | null | undefined): string {
  const n = String(customer?.nombre || "").trim()
  const a = String(customer?.apellido || "").trim()
  return `${n} ${a}`.trim()
}



async function getProductTitles(cart: CartItem[]) {
  const ids = [...new Set((cart || []).map((x) => x.productId))]

  const docs = await sanity.fetch(
    `*[_id in $ids]{ _id, _type, "nombre": coalesce(nombre, title) }`,
    { ids }
  )

  const byId = new Map<string, any>((docs || []).map((p: any) => [String(p._id), p]))

  return (cart || []).map((it) => {
    const doc = byId.get(it.productId)
    const base = String(doc?.nombre || it.productId)
    const title = `${base}${it.talle ? ` - Talle ${it.talle}` : ""}`
    return { title, talle: it.talle ?? null, qty: it.cantidad }
  })
}



async function buildEmailItems(cart: CartItem[], meta: any) {
  const packIds: string[] = Array.isArray(meta?.packIds) ? meta.packIds.map(String) : []
  const packIdSet = new Set(packIds)

  // 1) Packs mayoristas (se listan como items)
  let packItems: { title: string; talle: string | null; qty: number }[] = []
  if (packIds.length) {
    const packCart = cart.filter((x) => packIdSet.has(String(x.productId)))
    if (packCart.length) {
      const docs = await sanity.fetch(
        `*[_id in $ids]{ _id, _type, "nombre": coalesce(nombre, title) }`,
        { ids: packIds }
      )
      const byId = new Map<string, any>((docs || []).map((d: any) => [String(d._id), d]))

      packItems = packCart.map((it) => ({
        title: String(byId.get(String(it.productId))?.nombre || it.productId),
        talle: null,
        qty: Number(it.cantidad || 1),
      }))
    }
  }

  // 2) Productos elegidos dentro de combos (2x1 / combo): listar UNITARIOS
  const comboCart = cart.filter((x) => !!x.comboId && !packIdSet.has(String(x.productId)))
  const comboUnitItems = await getProductTitles(comboCart)

  // 3) Productos normales: líneas que NO son pack y NO tienen comboId
  const normalCart = cart.filter((x) => !packIdSet.has(String(x.productId)) && !x.comboId)
  const normalItems = await getProductTitles(normalCart)

  // Resultado final: packs + productos de combos (unitarios) + normales
  return [...packItems, ...comboUnitItems, ...normalItems]
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
        console.log("🧩 payment_metadata_keys", Object.keys(meta || {}))

        // candado idempotente
       await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  paymentId,
  orderId: meta?.orderId || null,
  createdAt: new Date().toISOString(),
  source: "card_inline",
})

const existing = await sanity.getDocument(markerId)
const retryEmailsOnly =
  (existing as any)?.status === "processed" && needsEmailRetry(existing)
let emailRetryLocked = false

if ((existing as any)?.status === "processed" && !retryEmailsOnly) {
  return respond200(
    { msg: "already_processed_card_inline", markerId, paymentId },
    startedAt
  )
}

if ((existing as any)?.status === "processing") {
  return respond200(
    { msg: "already_processing_card_inline", markerId, paymentId },
    startedAt
  )
}

if (retryEmailsOnly) {
  if ((existing as any)?.emailRetryStatus === "processing") {
    return respond200(
      { msg: "email_retry_already_processing_card_inline", markerId, paymentId },
      startedAt
    )
  }

  try {
    await sanity
      .patch(markerId)
      .ifRevisionId((existing as any)?._rev)
      .set({
        emailRetryStatus: "processing",
        emailRetryStartedAt: new Date().toISOString(),
      })
      .commit()

    emailRetryLocked = true
  } catch {
    return respond200(
      { msg: "email_retry_lock_lost_card_inline", markerId, paymentId },
      startedAt
    )
  }

  console.log("📧 retrying_missing_emails_card_inline", {
    markerId,
    paymentId,
    ownerNotified: (existing as any)?.ownerNotified === true,
    customerNotified: (existing as any)?.customerNotified === true,
  })
} else {
  try {
    await sanity
      .patch(markerId)
      .ifRevisionId((existing as any)?._rev)
      .set({
        status: "processing",
        processingAt: new Date().toISOString(),
      })
      .commit()
  } catch {
    return respond200(
      { msg: "processing_lock_lost_card_inline", markerId, paymentId },
      startedAt
    )
  }
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
        let cart = parseCartFromMetadata(meta)

        // ✅ Fallback: si MP no trae metadata (Brick), leer lo persistido en Sanity
        if (!cart.length) {
          const saved = await sanity.getDocument(markerId)

          const savedCartJson =
            (saved as any)?.cartJson ||
            (saved as any)?.cart ||
            null

          if (savedCartJson) {
            try {
              const parsed = typeof savedCartJson === "string" ? JSON.parse(savedCartJson) : savedCartJson
              if (Array.isArray(parsed)) cart = parsed
            } catch { }
          }
        }


        // fallback extra por si MP te devuelve cart como string raro o viene en cartJson
        if (!cart.length && meta?.cart && typeof meta.cart === "string") {
          try {
            const parsed = JSON.parse(meta.cart)
            if (Array.isArray(parsed)) cart = parsed
          } catch { }
        }
        if (!cart.length && meta?.cartJson && typeof meta.cartJson === "string") {
          try {
            const parsed = JSON.parse(meta.cartJson)
            if (Array.isArray(parsed)) cart = parsed
          } catch { }
        }

        // packIds = ids de documentos packMayorista (para excluir de stock)
        // packIds = ids de documentos packMayorista (para excluir de stock)
const packIds = Array.isArray(meta?.packIds) ? meta.packIds.map(String) : []
const packIdSet = new Set(packIds)

// ✅ SOLO descontar stock de líneas que NO sean packMayorista
const cartForStock = cart.filter((x) => !packIdSet.has(String(x.productId)))

if (!retryEmailsOnly && cartForStock.length) {
  const r = await reserveStockAtomic(cartForStock, markerId)

  if (!r.ok) {
    const reason = (r as any).reason

    if (reason === "conflict") {
      await sanity
        .patch(markerId)
        .set({ status: "retry_conflict", retryAt: new Date().toISOString() })
        .commit()
        .catch(() => {})

      return respond200({ msg: "retry_conflict_card_inline", markerId, paymentId }, startedAt)
    }

    await sanity
      .patch(markerId)
      .set({
        status: "failed_stock",
        detailsJson: JSON.stringify((r as any).details ?? []),
        failedAt: new Date().toISOString(),
      })
      .commit()
      .catch(() => {})

    return respond200({ ignored: true, reason: "failed_stock_card_inline", markerId, paymentId }, startedAt)
  }
} else if (!retryEmailsOnly) {
  console.log("📦 only packMayorista lines in card_inline webhook: skipping stock reserve", {
    markerId,
    paymentId,
  })
}

try {
// ✅ items SIEMPRE desde el cart (incluye packMayorista y productos)
let items = await buildEmailItems(cart, meta)
if (!items.length && cart.length) {
  items = cart.map((it) => ({
    title: String(it.productId),
    talle: it.talle ?? null,
    qty: Number(it.cantidad || 1),
  }))
}

// idempotencia de email
const updated = await sanity
  .patch(markerId)
  .setIfMissing({ ownerNotified: false, customerNotified: false })
  .set({
    status: "processed",
    processedAt: new Date().toISOString(),
    detailsJson: JSON.stringify({
      transaction_amount: Number(payment?.transaction_amount ?? 0),
      total: Number(payment?.transaction_amount ?? 0),
      currency_id: String(payment?.currency_id || "ARS"),
    }),
  })
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
          metaHasCart: !!(meta?.cart || meta?.cartJson),
          cartCount: cart?.length || 0,
          firstCartItem: cart?.[0] || null,

        })
        const orderIdForEmail = String(meta?.orderId || paymentId)
        const shipping = buildShippingObjectFromCustomer(customer)

        if (updated) {
          // OWNER
          if (updated.ownerNotified !== true) {
            try {
              console.log("📧 attempting_owner_email_card_inline", {
                markerId,
                paymentId,
                orderId: orderIdForEmail,
                to: "OWNER_EMAIL",
              })

              await sendOwnerSaleEmail({
                orderId: orderIdForEmail,
                paymentId,
                total: Number(payment?.transaction_amount ?? 0) || undefined,
                currency: String(payment?.currency_id || "ARS"),
                buyerFirstName: String(customer?.nombre || "").trim() || undefined,
                buyerLastName: String(customer?.apellido || "").trim() || undefined,
                buyerName,
                buyerEmail,
                buyerPhone,
                shipping,
                shippingAddress,
                items,
              })

              await sanity.patch(markerId)
                .set({
                  ownerNotified: true,
                  ownerNotifiedAt: new Date().toISOString(),
                })
                .unset(["ownerEmailFailed", "ownerEmailError", "ownerEmailFailedAt"])
                .commit()
                .catch(() => { })

              console.log("✅ owner_email_sent_card_inline", {
                markerId,
                paymentId,
                orderId: orderIdForEmail,
              })
            } catch (e: any) {
              const errMsg = getEmailErrorMessage(e)
              console.error("❌ owner_notify_failed_card_inline", {
                markerId,
                paymentId,
                error: errMsg,
              })
              await sanity.patch(markerId)
                .set({
                  ownerEmailFailed: true,
                  ownerEmailError: errMsg,
                  ownerEmailFailedAt: new Date().toISOString(),
                })
                .commit()
                .catch(() => { })
            }
          }

          // CUSTOMER
          if (buyerEmail && updated.customerNotified !== true) {
            try {
              console.log("📧 attempting_customer_email_card_inline", {
                markerId,
                paymentId,
                orderId: orderIdForEmail,
                to: buyerEmail,
              })

              await sendCustomerPurchaseEmail({
                to: buyerEmail,
                orderId: orderIdForEmail,
                paymentId,
                total: Number(payment?.transaction_amount ?? 0) || undefined,
                currency: String(payment?.currency_id || "ARS"),
                buyerName,
                shipping,
                shippingAddress,
                items,
              })

              await sanity.patch(markerId)
                .set({
                  customerNotified: true,
                  customerNotifiedAt: new Date().toISOString(),
                })
                .unset(["customerEmailFailed", "customerEmailError", "customerEmailFailedAt"])
                .commit()
                .catch(() => { })

              console.log("✅ customer_email_sent_card_inline", {
                markerId,
                paymentId,
                orderId: orderIdForEmail,
                to: buyerEmail,
              })
            } catch (e: any) {
              const errMsg = getEmailErrorMessage(e)
              console.error("❌ customer_notify_failed_card_inline", {
                markerId,
                paymentId,
                to: buyerEmail,
                error: errMsg,
              })
              await sanity.patch(markerId)
                .set({
                  customerEmailFailed: true,
                  customerEmailError: errMsg,
                  customerEmailFailedAt: new Date().toISOString(),
                })
                .commit()
                .catch(() => { })
            }
          } else if (!buyerEmail && updated.customerNotified !== true) {
            const errMsg = "Missing buyerEmail"
            console.warn("⚠️ customer_email_skipped_missing_buyer_email_card_inline", {
              markerId,
              paymentId,
              orderId: orderIdForEmail,
            })
            await sanity.patch(markerId)
              .set({
                customerEmailFailed: true,
                customerEmailError: errMsg,
                customerEmailFailedAt: new Date().toISOString(),
              })
              .commit()
              .catch(() => { })
          }
        }

} finally {
  if (emailRetryLocked) {
    await sanity.patch(markerId)
      .set({
        emailRetryStatus: "done",
        emailRetryFinishedAt: new Date().toISOString(),
      })
      .commit()
      .catch(() => { })
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
    await sanity.createIfNotExists({
  _id: markerId,
  _type: "mpWebhook",
  paymentId,
  orderId: merchantOrder?.id,
  preferenceId: merchantOrder?.preference_id || null,
  createdAt: new Date().toISOString(),
})


const existing = await sanity.getDocument(markerId)
const retryEmailsOnly =
  (existing as any)?.status === "processed" && needsEmailRetry(existing)
let emailRetryLocked = false

if ((existing as any)?.status === "processed" && !retryEmailsOnly) {
  return respond200(
    { msg: "already_processed", markerId, paymentId, status: "processed" },
    startedAt
  )
}

if ((existing as any)?.status === "processing") {
  return respond200(
    { msg: "already_processing", markerId, paymentId, status: "processing" },
    startedAt
  )
}

if (retryEmailsOnly) {
  if ((existing as any)?.emailRetryStatus === "processing") {
    return respond200(
      { msg: "email_retry_already_processing", markerId, paymentId },
      startedAt
    )
  }

  try {
    await sanity
      .patch(markerId)
      .ifRevisionId((existing as any)?._rev)
      .set({
        emailRetryStatus: "processing",
        emailRetryStartedAt: new Date().toISOString(),
      })
      .commit()

    emailRetryLocked = true
  } catch {
    return respond200(
      { msg: "email_retry_lock_lost", markerId, paymentId },
      startedAt
    )
  }

  console.log("📧 retrying_missing_emails", {
    markerId,
    paymentId,
    ownerNotified: (existing as any)?.ownerNotified === true,
    customerNotified: (existing as any)?.customerNotified === true,
  })
} else {
  try {
    await sanity
      .patch(markerId)
      .ifRevisionId((existing as any)?._rev)
      .set({
        status: "processing",
        processingAt: new Date().toISOString(),
      })
      .commit()
  } catch {
    return respond200(
      { msg: "processing_lock_lost", markerId, paymentId, status: "processing" },
      startedAt
    )
  }
}

    // =========================
    // 3) Traer preferencia + cart
    // =========================
    const prefId = merchantOrder?.preference_id
    if (!prefId) {
      await sanity.patch(markerId).set({ status: "no_preference_id" }).commit().catch(() => { })
      return respond200({ msg: "no_preference_id", markerId, paymentId }, startedAt)
    }

    const pref = await mpGet(`https://api.mercadopago.com/checkout/preferences/${prefId}`)

    const cart = parseCartFromPref(pref)                  // fuente principal
    const comboCart = parseComboLinesFromPref(pref)       // fallback

    // ✅ Si cart ya viene con comboId, NO lo merges con comboCart porque duplicás unidades.
    const mergedCart =
      cart.some((x) => !!x.comboId) ? cart : mergeCartItems([...cart, ...comboCart])

    if (!mergedCart.length) {
      await sanity.patch(markerId).set({ status: "no_cart_metadata" }).commit().catch(() => { })
      return respond200({ msg: "no_cart_metadata", markerId, paymentId, preferenceId: prefId }, startedAt)
    }



    // packIds = ids de documentos packMayorista (para excluir de stock)
    const meta = pref?.metadata || {}
    const packIds = Array.isArray(meta?.packIds) ? meta.packIds.map(String) : []
    const packIdSet = new Set(packIds)

    // ✅ SOLO descontar stock de líneas que NO sean packMayorista
    const cartForStock = mergedCart.filter((x) => !packIdSet.has(String(x.productId)))

    if (!retryEmailsOnly && cartForStock.length) {
      const r = await reserveStockAtomic(cartForStock, markerId)

      if (!r.ok) {
        const reason = (r as any).reason

        if (reason === "conflict") {
          // no lo marques como failed_stock
          await sanity.patch(markerId).set({ status: "retry_conflict" }).commit().catch(() => { })
          return respond200({ msg: "retry_conflict", markerId, paymentId }, startedAt)
        }

        // out_of_stock real
        await sanity
          .patch(markerId)
          .set({
            status: "failed_stock",
            detailsJson: JSON.stringify((r as any).details ?? []),
            failedAt: new Date().toISOString(),
          })
          .commit()
          .catch(() => { })

        return respond200({ ignored: true, reason: "failed_stock", markerId, paymentId }, startedAt)
      }

    } else if (!retryEmailsOnly) {
      console.log("📦 onlyy packMayorista lines: skipping stock reserve", { markerId, paymentId })
    }



try {

    // =========================
    // 5) Procesado + aviso por mail (idempotente)
    // =========================
    const processedAt = new Date().toISOString()

   const updated = await sanity
  .patch(markerId)
  .setIfMissing({ ownerNotified: false, customerNotified: false })
  .set({
    status: "processed",
    processedAt,
    detailsJson: JSON.stringify({
      transaction_amount: Number(approvedPayment?.transaction_amount ?? 0),
      total: Number(approvedPayment?.transaction_amount ?? 0),
      currency_id: String(approvedPayment?.currency_id || "ARS"),
    }),
  })
  .commit({ returnDocuments: true })
  .catch(() => null)
    // 🟢 Avisar al dueño SOLO una vez

    if (updated) {
      try {
        const payment = await mpGetSoft(`https://api.mercadopago.com/v1/payments/${paymentId}`)
        if ((payment as any)?.__error) {
          console.error("❌ payment_fetch_failed_for_email", { paymentId, err: (payment as any)?.__message })
          return respond200({ msg: "payment_fetch_failed_for_email", markerId, paymentId }, startedAt)
        }

        const meta = pref?.metadata || {}
        const metaCustomer = (meta?.customer || null) as MetaCustomer | null

        const buyerName =
          buildBuyerNameFromCustomer(metaCustomer) ||
          (
            String(payment?.payer?.first_name || "").trim() +
            (payment?.payer?.last_name ? ` ${String(payment.payer.last_name).trim()}` : "")
          ).trim() ||
          undefined

        const buyerEmail =
          String(metaCustomer?.email || "").trim() ||
          String(payment?.payer?.email || "").trim() ||
          undefined

        const buyerPhone =
          String(metaCustomer?.telefono || "").trim() ||
          (
            payment?.payer?.phone
              ? `${payment.payer.phone?.area_code || ""}${payment.payer.phone?.number ? ` ${payment.payer.phone.number}` : ""}`.trim()
              : ""
          ) ||
          undefined

        const shippingAddress =
          buildShippingFromCustomer(metaCustomer) ||
          buildShippingAddress(payment) ||
          undefined

        const shipping = buildShippingObjectFromCustomer(metaCustomer)

        const items = await buildEmailItems(mergedCart, meta)

        const emailOrderId =
          String(meta?.orderId || "").trim() ||
          String(merchantOrder?.id || "").trim() ||
          String(paymentId)

        // 1) OWNER mail
        if (updated.ownerNotified !== true) {
          try {
            console.log("📧 attempting_owner_email", {
              markerId,
              paymentId,
              orderId: emailOrderId,
              to: "OWNER_EMAIL",
            })

            await sendOwnerSaleEmail({
              orderId: emailOrderId,
              paymentId,
              total: Number(payment?.transaction_amount ?? 0) || undefined,
              currency: String(payment?.currency_id || "ARS"),
              buyerFirstName:
                String(metaCustomer?.nombre || "").trim() ||
                String(payment?.payer?.first_name || "").trim() ||
                undefined,
              buyerLastName:
                String(metaCustomer?.apellido || "").trim() ||
                String(payment?.payer?.last_name || "").trim() ||
                undefined,
              buyerName,
              buyerEmail,
              buyerPhone,
              shipping,
              shippingAddress,
              items,
            })

            await sanity
              .patch(markerId)
              .set({
                ownerNotified: true,
                ownerNotifiedAt: new Date().toISOString(),
              })
              .unset(["ownerEmailFailed", "ownerEmailError", "ownerEmailFailedAt"])
              .commit()
              .catch(() => { })

            console.log("✅ owner_email_sent", {
              markerId,
              paymentId,
              orderId: emailOrderId,
            })
          } catch (e: any) {
            const errMsg = getEmailErrorMessage(e)
            console.error("❌ owner_notify_failed", {
              markerId,
              paymentId,
              error: errMsg,
            })
            await sanity
              .patch(markerId)
              .set({
                ownerEmailFailed: true,
                ownerEmailError: errMsg,
                ownerEmailFailedAt: new Date().toISOString(),
              })
              .commit()
              .catch(() => { })
          }
        }

        // 2) CUSTOMER mail
        if (buyerEmail && updated.customerNotified !== true) {
          try {
            console.log("📧 attempting_customer_email", {
              markerId,
              paymentId,
              orderId: emailOrderId,
              to: buyerEmail,
            })

            await sendCustomerPurchaseEmail({
              to: buyerEmail,
              orderId: emailOrderId,
              paymentId,
              total: Number(payment?.transaction_amount ?? 0) || undefined,
              currency: String(payment?.currency_id || "ARS"),
              buyerName,
              shipping,
              shippingAddress,
              items,
            })

            await sanity
              .patch(markerId)
              .set({
                customerNotified: true,
                customerNotifiedAt: new Date().toISOString(),
              })
              .unset(["customerEmailFailed", "customerEmailError", "customerEmailFailedAt"])
              .commit()
              .catch(() => { })

            console.log("✅ customer_email_sent", {
              markerId,
              paymentId,
              orderId: emailOrderId,
              to: buyerEmail,
            })
          } catch (e: any) {
            const errMsg = getEmailErrorMessage(e)
            console.error("❌ customer_notify_failed", {
              markerId,
              paymentId,
              to: buyerEmail,
              error: errMsg,
            })
            await sanity
              .patch(markerId)
              .set({
                customerEmailFailed: true,
                customerEmailError: errMsg,
                customerEmailFailedAt: new Date().toISOString(),
              })
              .commit()
              .catch(() => { })
          }
        } else if (!buyerEmail && updated.customerNotified !== true) {
          const errMsg = "Missing buyerEmail"
          console.warn("⚠️ customer_email_skipped_missing_buyer_email", {
            markerId,
            paymentId,
            orderId: emailOrderId,
          })
          await sanity
            .patch(markerId)
            .set({
              customerEmailFailed: true,
              customerEmailError: errMsg,
              customerEmailFailedAt: new Date().toISOString(),
            })
            .commit()
            .catch(() => { })
        }
      } catch (e: any) {
        console.error("❌ notify_block_failed", e?.message || e)
      }
    }
} finally {
  if (emailRetryLocked) {
    await sanity
      .patch(markerId)
      .set({
        emailRetryStatus: "done",
        emailRetryFinishedAt: new Date().toISOString(),
      })
      .commit()
      .catch(() => { })
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
