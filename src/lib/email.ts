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

export async function sendOwnerSaleEmail(params: {
  orderId: string
  paymentId?: string
  total?: number
  currency?: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
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
    items,
  } = params

  const subject = `✅ Venta aprobada — Orden ${orderId}`

  const itemsHtml = items
    .map((i) => {
      const talle = i.talle ? ` (Talle ${i.talle})` : ""
      return `<li><b>${i.title}</b>${talle} — x ${i.qty}</li>`
    })
    .join("")

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2 style="margin:0 0 8px">✅ Venta aprobada</h2>

    <p style="margin:0 0 6px"><b>Orden:</b> ${orderId}</p>
    ${paymentId ? `<p style="margin:0 0 6px"><b>Pago:</b> ${paymentId}</p>` : ""}
    ${typeof total === "number" ? `<p style="margin:0 0 12px"><b>Total:</b> ${total} ${currency || ""}</p>` : ""}

    <h3 style="margin:16px 0 8px">👤 Comprador</h3>
    <p style="margin:0 0 6px"><b>Nombre:</b> ${buyerName || "-"}</p>
    <p style="margin:0 0 6px"><b>Email:</b> ${buyerEmail || "-"}</p>
    <p style="margin:0 0 12px"><b>Teléfono:</b> ${buyerPhone || "-"}</p>

    <h3 style="margin:16px 0 8px">📦 Envío</h3>
    <p style="margin:0 0 12px"><b>Dirección:</b> ${shippingAddress || "-"}</p>

    <h3 style="margin:16px 0 8px">🛒 Productos</h3>
    <ul style="margin:0;padding-left:18px">
      ${itemsHtml}
    </ul>

    <p style="margin-top:16px;color:#666">Enviado automáticamente por Goodfla.</p>
  </div>
  `

  await resend.emails.send({ from, to, subject, html })
}
