// src/app/mayorista/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_MAYORISTA_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient" // 👈 reutilizamos la vista

export const revalidate = 60

export default async function Page() {
  const packs = await sanityClient.fetch(Q_MAYORISTA_LIST)

  // Adaptamos packMayorista -> shape de CombosClient
  const combosAdaptados = (packs ?? []).map((p: any) => ({
    _id: p._id,
    nombre: p.title,                                  // CombosClient usa "nombre"
    precio: p.precioActual ?? 0,                       // CombosClient usa "precio"
    imagen: p?.portada?.url || p?.galeria?.[0]?.url,   // CombosClient usa "imagen"
    slug: p.slug,                                      // igual
    inStock: true,                                     // stub si querés filtrar por stock
  }))

  return <CombosClient combos={combosAdaptados} basePath="/mayorista" />
}
