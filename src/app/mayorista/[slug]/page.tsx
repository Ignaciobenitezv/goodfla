// src/app/mayorista/[slug]/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_MAYORISTA_BY_SLUG, Q_PRODUCTOS_BY_CATEGORIA } from "@/lib/sanityQueries"
import PDPComboDetalle from "@/components/PDPComboDetalle"
import { notFound } from "next/navigation"

export const revalidate = 60

type Params = { slug: string }

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params

  const pack = await sanityClient.fetch(Q_MAYORISTA_BY_SLUG, { slug })
  if (!pack) return notFound()

  const galeriaUrls = (pack.galeria || [])
    .map((m: any) => {
      if (m && typeof m === "object") return m.videoUrl || m.imagenUrl
      if (typeof m === "string") return m
      return null
    })
    .filter(Boolean) as string[]

  const productosPorCategoria: Record<string, any[]> = {}

  for (const cat of pack.categoriasIncluidas || []) {
    const slugCat = cat?.categoria?.slug
    if (!slugCat) continue

    const productos = await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, { slug: slugCat })
    productosPorCategoria[slugCat] = productos || []
  }

  const comboNormalizado = {
    _id: pack._id,
    nombre: pack.title,
    descripcion: pack.descripcion,
    precioAnterior: pack.precioAntes ?? null,
    precio: pack.precioActual,
    slug: pack.slug,
    imagen: pack.portada?.url || galeriaUrls[0] || "",
    galeria: galeriaUrls,
    categoriasIncluidas: pack.categoriasIncluidas || [],
  }

  return (
  <PDPComboDetalle
    combo={comboNormalizado}
    productosPorCategoria={productosPorCategoria}
    mode="mayorista"
  />
)
}