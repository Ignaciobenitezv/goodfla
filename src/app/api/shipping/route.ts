import { NextResponse } from "next/server"

type Quote = {
  ok: true
  cp: string
  zone: "A" | "B" | "C" | "D"
  price: number
  carrier: string
  etaFrom: string
  etaTo: string
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(d: Date) {
  // Ej: "jue 19/09"
  const dia = d
    .toLocaleDateString("es-AR", { weekday: "short" })
    .replace(".", "")
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dia} ${dd}/${mm}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cp = (searchParams.get("cp") || "").trim()

  // Validaciones básicas AR (4 dígitos)
  if (!/^\d{4}$/.test(cp)) {
    return NextResponse.json(
      { ok: false, error: "CP inválido (debe tener 4 dígitos numéricos)" },
      { status: 400 }
    )
  }

  // Tabla simple por rango — reemplazá por tu carrier real cuando quieras
  const n = Number(cp)
  let zone: Quote["zone"] = "A"
  let price = 2500

  if (n >= 1000 && n <= 1999) {
    zone = "A"
    price = 2500
  } else if (n >= 2000 && n <= 3999) {
    zone = "B"
    price = 3000
  } else if (n >= 4000 && n <= 5999) {
    zone = "C"
    price = 3800
  } else {
    zone = "D"
    price = 4500
  }

  // Regla de ejemplo: CP 3500 (Resistencia) => envío gratis
  if (cp === "3500") price = 0

  const today = new Date()
  const etaFrom = formatDate(addDays(today, 3))
  const etaTo = formatDate(addDays(today, 6))

  const quote: Quote = {
    ok: true,
    cp,
    zone,
    price,
    carrier: "Correo Argentino",
    etaFrom,
    etaTo,
  }

  return NextResponse.json(quote)
}
