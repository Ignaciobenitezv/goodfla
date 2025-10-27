// src/app/productos/zapatillas/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPA2X1_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient"

export const revalidate = 60

export default async function Zapatillas2x1ListPage() {
  const data = await sanityClient.fetch(Q_ZAPA2X1_LIST)

  // Adaptamos al shape que espera CombosClient
  const combosAdaptados = (Array.isArray(data) ? data : []).map((c: any, i: number) => ({
    _id: c._id,
    nombre: c.nombre,
    precio: typeof c.precioActual === "number" ? c.precioActual : null,
    imagen: c.portada?.url || c.galeria?.[0]?.url || null,
    slug: c.slug,
    inStock: true,
    _createdAt: c._createdAt ?? i,
  }))

  // IMPORTANTE: que el listado linkee al PDP de zapatillas2x1
  return <CombosClient combos={combosAdaptados} basePath="/zapatillas2x1" />
}
