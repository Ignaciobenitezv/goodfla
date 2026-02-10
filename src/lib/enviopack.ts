// src/lib/enviopack.ts
type Provincia = { id: string; nombre?: string }

let cachedToken: { token: string; expiresAtMs: number } | null = null
let cachedProvincias: { items: Provincia[]; expiresAtMs: number } | null = null
const cpToProv = new Map<string, { provId: string; expiresAtMs: number }>()

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) return cachedToken.token

  const apiKey = process.env.ENVIPACK_API_KEY
  const secretKey = process.env.ENVIPACK_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error("Missing ENVIPACK_API_KEY/ENVIPACK_SECRET_KEY")

  const body = new URLSearchParams()
  body.set("api-key", apiKey)
  body.set("secret-key", secretKey)

  const res = await fetch("https://api.enviopack.com/auth", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Enviopack auth failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string }
  // token dura 4h; cacheamos 3h50m. :contentReference[oaicite:5]{index=5}
  cachedToken = { token: data.access_token, expiresAtMs: Date.now() + (3 * 60 + 50) * 60_000 }
  return cachedToken.token
}

async function listProvincias(access_token: string): Promise<Provincia[]> {
  if (cachedProvincias && cachedProvincias.expiresAtMs > Date.now()) return cachedProvincias.items

  // GET /provincias :contentReference[oaicite:6]{index=6}
  const url = new URL("https://api.enviopack.com/provincias")
  url.searchParams.set("access_token", access_token)

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json().catch(() => null)) as Provincia[] | null
  if (!res.ok || !Array.isArray(data)) throw new Error(`Enviopack provincias failed: ${res.status}`)

  cachedProvincias = { items: data, expiresAtMs: Date.now() + 24 * 60 * 60_000 } // 24h
  return data
}

async function validateCpInProvincia(access_token: string, provId: string, cp4: string): Promise<boolean> {
  // GET /provincias/[ID]/validar-codigo-postal :contentReference[oaicite:7]{index=7}
  const url = new URL(`https://api.enviopack.com/provincias/${encodeURIComponent(provId)}/validar-codigo-postal`)
  url.searchParams.set("access_token", access_token)
  url.searchParams.set("codigo_postal", cp4)

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json().catch(() => null)) as { valido?: boolean } | null
  if (!res.ok || !data) return false
  return !!data.valido
}

export async function resolveProvinciaByCp(cp: string): Promise<string> {
  const cp4 = String(cp || "").replace(/[^\d]/g, "").slice(0, 4)
  if (cp4.length !== 4) throw new Error("CP inválido (esperado 4 dígitos)")

  const cached = cpToProv.get(cp4)
  if (cached && cached.expiresAtMs > Date.now()) return cached.provId

  const token = await getAccessToken()
  const provincias = await listProvincias(token)

  // Probamos cada provincia hasta encontrar válida (se cachea por CP).
  for (const p of provincias) {
    if (!p?.id) continue
    const ok = await validateCpInProvincia(token, p.id, cp4)
    if (ok) {
      cpToProv.set(cp4, { provId: p.id, expiresAtMs: Date.now() + 30 * 24 * 60 * 60_000 }) // 30 días
      return p.id
    }
  }

  throw new Error("No se pudo resolver provincia para ese CP")
}

function toNum(v: any) {
  const n = Number(String(v ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export async function quoteBuyerHomeDelivery(args: {
  cp: string
  pesoKg: number
  paquetes: string // ej "35x25x15"
  servicio?: "N" | "P" | "X" | "R"
}) {
  const token = await getAccessToken()
  const provincia = await resolveProvinciaByCp(args.cp)

  // GET /cotizar/precio/a-domicilio :contentReference[oaicite:8]{index=8}
  const url = new URL("https://api.enviopack.com/cotizar/precio/a-domicilio")
  url.searchParams.set("access_token", token)
  url.searchParams.set("provincia", provincia)
  url.searchParams.set("codigo_postal", String(args.cp).replace(/[^\d]/g, "").slice(0, 4))
  url.searchParams.set("peso", Number(args.pesoKg).toFixed(2))
  url.searchParams.set("paquetes", args.paquetes)
  url.searchParams.set("servicio", args.servicio || "N")

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json().catch(() => null)) as Array<{ valor: string | number }> | null
  if (!res.ok || !Array.isArray(data)) throw new Error(`Enviopack quote failed: ${res.status}`)

  const best = data.map((x) => toNum(x.valor)).filter((n) => n > 0).sort((a, b) => a - b)[0] ?? 0
  return { provincia, bestPrice: best, raw: data }
}
