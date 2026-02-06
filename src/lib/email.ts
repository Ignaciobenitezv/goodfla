import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

function getOwnerEmails() {
  const raw = process.env.OWNER_EMAIL || ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function sendOwnerSaleEmail(params: {
  orderId: string
  total?: number
  currency?: string
  itemsText?: string
  buyerEmail?: string
}) {
  const to = getOwnerEmails()
  if (!to.length) throw new Error("Missing OWNER_EMAIL")

  const from = process.env.FROM_EMAIL || "onboarding@resend.dev"

  const { orderId, total, currency, itemsText, buyerEmail } = params

  const subject = `✅ Venta aprobada — Orden ${orderId}`

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2 style="margin:0 0 8px">✅ Venta aprobada</h2>
      <p style="margin:0 0 12px"><b>Orden:</b> ${orderId}</p>
      ${
        typeof total === "number"
          ? `<p style="margin:0 0 12px"><b>Total:</b> ${total} ${currency || ""}</p>`
          : ""
      }
      ${buyerEmail ? `<p style="margin:0 0 12px"><b>Cliente:</b> ${buyerEmail}</p>` : ""}
      ${
        itemsText
          ? `<pre style="background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap">${itemsText}</pre>`
          : ""
      }
      <p style="margin-top:16px;color:#666">Enviado automáticamente por Goodfla.</p>
    </div>
  `

  await resend.emails.send({ from, to, subject, html })
}
