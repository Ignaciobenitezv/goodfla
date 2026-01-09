// src/app/productos/zapatillas/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPA2X1_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient"

export const revalidate = 60

export default async function Zapatillas2x1ListPage() {
  const data = await sanityClient.fetch(Q_ZAPA2X1_LIST)

  // Saca una "portada" usable por <Image />:
  // - prioriza portada
  // - si no, busca la primera imagen en galeria (mediaItem)
  const getPortada = (c: any): string | null => {
    // por si alguna vez tu query ya trae un campo "imagen"
    if (typeof c?.imagen === "string" && c.imagen) return c.imagen

    // Q_ZAPA2X1_LIST suele traer: "portada": portada.asset->{url}
    if (typeof c?.portada?.url === "string" && c.portada.url) return c.portada.url

    // Si galeria es mediaItem[]: { tipo, imagenUrl, videoUrl }
    const firstImage = (Array.isArray(c?.galeria) ? c.galeria : []).find(
      (m: any) => typeof m?.imagenUrl === "string" && m.imagenUrl
    )
    if (firstImage?.imagenUrl) return firstImage.imagenUrl

    // No usar videoUrl como imagen en cards (Next <Image> no renderiza video)
    return null
  }

  // Adaptamos al shape que espera CombosClient
  const combosAdaptados = (Array.isArray(data) ? data : []).map((c: any, i: number) => ({
    _id: c._id,
    nombre: c.nombre,
    precio: typeof c.precioActual === "number" ? c.precioActual : null,
    imagen: getPortada(c),
    slug: c.slug,
    inStock: true,
    _createdAt: c._createdAt ?? i,
  }))

  // IMPORTANTE: que el listado linkee al PDP de zapatillas2x1
  return <CombosClient combos={combosAdaptados} basePath="/zapatillas2x1" />
}
