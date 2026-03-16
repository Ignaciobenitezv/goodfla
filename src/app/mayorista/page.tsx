// src/app/mayorista/pages.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_MAYORISTA_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient"

export const revalidate = 60

export default async function Page() {
  const packs = await sanityClient.fetch(Q_MAYORISTA_LIST)

  const combosAdaptados = (Array.isArray(packs) ? packs : []).map((p: any, i: number) => ({
    _id: p._id,
    nombre: p.title,
    precio: typeof p.precioActual === "number" ? p.precioActual : 0,
    precioAnterior: typeof p.precioAntes === "number" ? p.precioAntes : 0,
    imagen: p?.portada?.url || null,
    slug: p.slug,
    inStock: true,
    _createdAt: p._createdAt ?? i,
    badge: p.badge ?? "NONE",
    rating: typeof p.rating === "number" ? p.rating : 0,
    ratingCount: typeof p.ratingCount === "number" ? p.ratingCount : 0,
    envioGratis: typeof p.envioGratis === "boolean" ? p.envioGratis : true,
    categoriasIncluidas: Array.isArray(p.categoriasIncluidas) ? p.categoriasIncluidas : [],
  }))

  return <CombosClient combos={combosAdaptados} basePath="/mayorista" />
}