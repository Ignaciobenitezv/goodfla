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

type ShippingInfo =
  | { type: "sucursal"; pais?: string | null }
  | {
      type: "domicilio"
      cp?: string | null
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

function buildShippingText(shipping?: ShippingInfo | null, fallback?: string) {
  if (shipping) {
    if (shipping.type === "sucursal") {
      return [
        "Metodo: Retiro por sucursal",
        shipping.pais ? `Pais: ${shipping.pais}` : null,
      ]
        .filter(Boolean)
        .join("<br />")
    }

    const d = shipping.direccion || {}
    const street = [d.calle, d.numero].filter(Boolean).join(" ").trim()
    const province = d.provincia || d.barrio || null
    const country = shipping.pais || d.pais || null

    return [
      "Metodo: Envio a domicilio",
      `Pais: ${country || "-"}`,
      `Direccion: ${street || fallback || "-"}`,
      d.departamento ? `Departamento / referencia: ${d.departamento}` : null,
      `Ciudad: ${d.ciudad || "-"}`,
      `Provincia / Estado: ${province || "-"}`,
      `Codigo postal: ${shipping.cp || "-"}`,
    ]
      .filter(Boolean)
      .join("<br />")
  }

  return fallback || "-"
}

type Shipping =
  | { type: "sucursal"; pais?: string | undefined }
  | {
      type: "domicilio"
      cp?: string | undefined
      pais?: string | undefined
      direccion?: {
        calle?: string | undefined
        numero?: string | undefined
        barrio?: string | undefined
        departamento?: string | undefined
        ciudad?: string | undefined
        provincia?: string | undefined
        pais?: string | undefined
      } | undefined
    }

function splitBuyerName(
  buyerName?: string,
  buyerFirstName?: string,
  buyerLastName?: string
) {
  const explicitFirst = String(buyerFirstName || "").trim()
  const explicitLast = String(buyerLastName || "").trim()
  if (explicitFirst || explicitLast) {
    return {
      firstName: explicitFirst || "-",
      lastName: explicitLast || "-",
    }
  }

  const parts = String(buyerName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return {
    firstName: parts[0] || "-",
    lastName: parts.slice(1).join(" ") || "-",
  }
}

export async function sendOwnerSaleEmail(params: {
  orderId: string
  paymentId?: string
  total?: number
  currency?: string
  buyerFirstName?: string
  buyerLastName?: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  shipping?: Shipping
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
    buyerFirstName,
    buyerLastName,
    buyerName,
    buyerEmail,
    buyerPhone,
    shippingAddress,
    shipping,
    items,
  } = params

  const { firstName, lastName } = splitBuyerName(
    buyerName,
    buyerFirstName,
    buyerLastName
  )

  const subject = `Venta aprobada - Orden ${orderId}`

  const itemsHtml =
    Array.isArray(items) && items.length
      ? items
          .map((i) => {
            const talle = i.talle ? ` (Talle ${i.talle})` : ""
            return `<li><b>${i.title}</b>${talle} - x ${i.qty}</li>`
          })
          .join("")
      : `<li><i>(Sin items en metadata)</i></li>`

  const shippingText = buildShippingText(shipping as any, shippingAddress)

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2 style="margin:0 0 8px">Venta aprobada</h2>

    <p style="margin:0 0 6px"><b>Orden:</b> ${orderId}</p>
    ${paymentId ? `<p style="margin:0 0 6px"><b>Pago:</b> ${paymentId}</p>` : ""}
    ${
      typeof total === "number"
        ? `<p style="margin:0 0 12px"><b>Total:</b> ${total} ${currency || ""}</p>`
        : ""
    }

    <h3 style="margin:16px 0 8px">Comprador</h3>
    <p style="margin:0 0 6px"><b>Nombre:</b> ${firstName}</p>
    <p style="margin:0 0 6px"><b>Apellido:</b> ${lastName}</p>
    <p style="margin:0 0 6px"><b>Email:</b> ${buyerEmail || "-"}</p>
    <p style="margin:0 0 12px"><b>Telefono:</b> ${buyerPhone || "-"}</p>

    <h3 style="margin:16px 0 8px">Envio</h3>
    <p style="margin:0 0 12px">${shippingText}</p>

    <h3 style="margin:16px 0 8px">Productos</h3>
    <ul style="margin:0;padding-left:18px">
      ${itemsHtml}
    </ul>

    <p style="margin-top:16px;color:#666">
      Enviado automaticamente por Goodfla.
    </p>
  </div>
  `

  await resend.emails.send({ from, to, subject, html })
}

export async function sendCustomerPurchaseEmail(params: {
  to: string
  orderId: string
  paymentId?: string
  total?: number
  currency?: string
  buyerName?: string
  shipping?: ShippingInfo | Shipping | null
  shippingAddress?: string
  items: EmailItem[]
}) {
  const from = process.env.FROM_EMAIL || "onboarding@resend.dev"

  const { to, orderId, paymentId, total, currency, buyerName, shipping, shippingAddress, items } =
    params

  const safeTo = String(to || "").trim()
  if (!safeTo) throw new Error("Missing customer email (to)")

  const subject = `Compra confirmada - Orden ${orderId}`

  const itemsHtml =
    Array.isArray(items) && items.length
      ? items
          .map((i) => {
            const talle = i.talle ? ` (Talle ${i.talle})` : ""
            return `<li><b>${i.title}</b>${talle} - x ${i.qty}</li>`
          })
          .join("")
      : `<li><i>(Sin items)</i></li>`

  const shippingText = buildShippingText(shipping as any, shippingAddress)

  const totalText =
    typeof total === "number" ? `${total} ${currency || ""}` : "-"

  const nameLine = buyerName ? `Hola ${buyerName},` : "Hola,"
  const paymentLine = paymentId ? `<p style="margin:0 0 6px"><b>Pago:</b> ${paymentId}</p>` : ""

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5">
    <h2 style="margin:0 0 10px">Compra confirmada</h2>
    <p style="margin:0 0 12px">${nameLine} tu pago fue acreditado y recibimos tu pedido.</p>

    <p style="margin:0 0 6px"><b>Orden:</b> ${orderId}</p>
    ${paymentLine}
    <p style="margin:0 0 12px"><b>Total:</b> ${totalText}</p>

    <h3 style="margin:16px 0 8px">Entrega</h3>
    <p style="margin:0 0 12px"><b>Detalle:</b> ${shippingText}</p>

    <h3 style="margin:16px 0 8px">Productos</h3>
    <ul style="margin:0;padding-left:18px">
      ${itemsHtml}
    </ul>

    <p style="margin-top:16px;color:#666">
      Gracias por tu compra. Si elegiste envio a domicilio, te contactaremos para coordinar el despacho.
    </p>
  </div>
  `

  await resend.emails.send({
    from,
    to: [safeTo],
    subject,
    html,
  })
}
