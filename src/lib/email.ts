import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

function getOwnerEmails() {
  const raw = process.env.OWNER_EMAIL || ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

type EmailItem = {
  title: string
  talle?: string | null
  qty: number
}

/**
 * ✅ NUEVO: estructura opcional de envío
 * (No rompe compatibilidad con shippingAddress)
 */
type ShippingInfo =
  | { type: "sucursal" }
  | {
      type: "domicilio"
      cp?: string | null
      direccion?: {
        calle?: string
        numero?: string
        barrio?: string
        ciudad?: string
      } | null
    }

/**
 * ✅ Helper para formatear el bloque de envío
 */
function buildShippingText(
  shipping?: ShippingInfo | null,
  fallback?: string
) {
  if (shipping) {
    if (shipping.type === "sucursal") {
      return "Retiro por sucursal"
    }

    const d = shipping.direccion || {}

    const parts = [
      d.calle,
      d.numero,
      d.barrio,
      d.ciudad,
      shipping.cp ? `CP ${shipping.cp}` : null,
    ].filter(Boolean)

    return parts.length
      ? parts.join(", ")
      : "Envío a domicilio (dirección no informada)"
  }

  // 🔁 Compatibilidad con lo anterior
  return fallback || "-"
}

type Shipping =
  | { type: "sucursal" }
  | {
      type: "domicilio"
      cp?: string | undefined
      direccion?: {
        calle?: string | undefined
        numero?: string | undefined
        barrio?: string | undefined
        ciudad?: string | undefined
      } | undefined
    }


export async function sendOwnerSaleEmail(params: {
  orderId: string
  paymentId?: string
  total?: number
  currency?: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string

  // ✅ nuevo (opcional, no rompe nada existente)
  shipping?: Shipping

  // ✅ viejo (lo dejás para compat)
  shippingAddress?: string

  items: EmailItem[]
}) {

  const to = getOwnerEmails()
  if (!to.length) throw new Error("Missing OWNER_EMAIL")

  const from = process.env.FROM_EMAIL || "onboarding@resend.dev"

  const {
    orderId,
    paymentId,
    total,
    currency,
    buyerName,
    buyerEmail,
    buyerPhone,
    shippingAddress,
    shipping,
    items,
  } = params

  const subject = `✅ Venta aprobada — Orden ${orderId}`

  const itemsHtml =
    Array.isArray(items) && items.length
      ? items
          .map((i) => {
            const talle = i.talle ? ` (Talle ${i.talle})` : ""
            return `<li><b>${i.title}</b>${talle} — x ${i.qty}</li>`
          })
          .join("")
      : `<li><i>(Sin items en metadata)</i></li>`

  const shippingText = buildShippingText(shipping, shippingAddress)

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2 style="margin:0 0 8px">✅ Venta aprobada</h2>

    <p style="margin:0 0 6px"><b>Orden:</b> ${orderId}</p>
    ${paymentId ? `<p style="margin:0 0 6px"><b>Pago:</b> ${paymentId}</p>` : ""}
    ${
      typeof total === "number"
        ? `<p style="margin:0 0 12px"><b>Total:</b> ${total} ${currency || ""}</p>`
        : ""
    }

    <h3 style="margin:16px 0 8px">👤 Comprador</h3>
    <p style="margin:0 0 6px"><b>Nombre:</b> ${buyerName || "-"}</p>
    <p style="margin:0 0 6px"><b>Email:</b> ${buyerEmail || "-"}</p>
    <p style="margin:0 0 12px"><b>Teléfono:</b> ${buyerPhone || "-"}</p>

    <h3 style="margin:16px 0 8px">📦 Envío</h3>
    <p style="margin:0 0 12px"><b>Dirección:</b> ${shippingText}</p>

    <h3 style="margin:16px 0 8px">🛒 Productos</h3>
    <ul style="margin:0;padding-left:18px">
      ${itemsHtml}
    </ul>

    <p style="margin-top:16px;color:#666">
      Enviado automáticamente por Goodfla.
    </p>
  </div>
  `

  await resend.emails.send({ from, to, subject, html })
}
