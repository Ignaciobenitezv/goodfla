// src/app/productos/zapatillas/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPA2X1_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient"

export const revalidate = 60

export default async function Zapatillas2x1ListPage() {
  const data = await sanityClient.fetch(Q_ZAPA2X1_LIST)

  // Saca una "portada" usable por <Image />:
  // - prioriza "imagen" si ya viene como string
  // - si no, prioriza portada.url
  // - si no, primera imagenUrl de galeria
  const getPortada = (c: any): string | null => {
    if (typeof c?.imagen === "string" && c.imagen) return c.imagen
    if (typeof c?.portada?.url === "string" && c.portada.url) return c.portada.url

    const firstImage = (Array.isArray(c?.galeria) ? c.galeria : []).find(
      (m: any) => typeof m?.imagenUrl === "string" && m.imagenUrl
    )
    if (firstImage?.imagenUrl) return firstImage.imagenUrl

    return null
  }

  // ✅ Adaptamos al shape que espera CombosClient + meta fields
  const combosAdaptados = (Array.isArray(data) ? data : []).map((c: any, i: number) => ({
    _id: c._id,
    nombre: c.nombre,

    // CombosClient usa "precio"
    precio: typeof c.precioActual === "number" ? c.precioActual : null,

    // ✅ precio anterior (para tachado)
    // (tu schema de zapas 2x1 tiene "precioAntes")
    precioAnterior: typeof c.precioAntes === "number" ? c.precioAntes : 0,

    imagen: getPortada(c),
    slug: c.slug,
    inStock: true,
    _createdAt: c._createdAt ?? i,

    // ✅ meta dinámico desde Sanity
    badge: c.badge ?? "NONE",
    rating: typeof c.rating === "number" ? c.rating : 0,
    ratingCount: typeof c.ratingCount === "number" ? c.ratingCount : 0,
    envioGratis: typeof c.envioGratis === "boolean" ? c.envioGratis : true,
  }))

  // IMPORTANTE: que el listado linkee al PDP de zapatillas2x1
  return <CombosClient combos={combosAdaptados} basePath="/zapatillas2x1" />
}
