// src/app/zapatillas2x1/[slug]/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPA2X1_BY_SLUG, Q_PRODUCTOS_BY_CATEGORIA } from "@/lib/sanityQueries"
import PDPComboDetalle from "@/components/PDPComboDetalle"
import { notFound } from "next/navigation"

export const revalidate = 60

type Params = { slug: string }

export default async function Zapa2x1Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params

  // Traemos el "combo" de zapatillas 2x1
  const combo = await sanityClient.fetch(Q_ZAPA2X1_BY_SLUG, { slug })
  if (!combo) return notFound()

  // Armamos productosPorCategoria tal como usa PDPComboDetalle
  const productosPorCategoria: Record<string, any[]> = {}

  for (const cat of combo.categoriasIncluidas || []) {
    const slugCat = cat?.categoria?.slug
    if (!slugCat) continue

    const productos = await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, { slug: slugCat })
    productosPorCategoria[slugCat] = productos || []
  }

  // Macheamos nombres de campos a los que espera el componente
  const comboNormalizado = {
    _id: combo._id,
    nombre: combo.nombre,
    descripcion: combo.descripcion,
    precioAnterior: combo.precioAntes ?? null,
    precio: combo.precioActual,
    slug: combo.slug,
    imagen: combo.portada?.url || combo.galeria?.[0]?.url || "",
    galeria: (combo.galeria || []).map((g: any) => g?.url).filter(Boolean),
    categoriasIncluidas: combo.categoriasIncluidas || [],
  }

  return <PDPComboDetalle combo={comboNormalizado} productosPorCategoria={productosPorCategoria} />
}
