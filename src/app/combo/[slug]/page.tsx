import { sanityClient } from "@/lib/sanity.client"
import { Q_COMBO_BY_SLUG, Q_PRODUCTOS_BY_CATEGORIA } from "@/lib/sanityQueries"
import PDPComboDetalle from "@/components/PDPComboDetalle"
import { notFound } from "next/navigation"

export const revalidate = 60

export default async function ComboPage({ params }: { params: { slug: string } }) {
  const combo = await sanityClient.fetch(Q_COMBO_BY_SLUG, { slug: params.slug })

  if (!combo) return notFound()

  // 🔥 acá armamos productosPorCategoria
  const productosPorCategoria: Record<string, any[]> = {}
  for (const cat of combo.categoriasIncluidas) {
    const productos = await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, {
      slug: cat.categoria.slug,
    })
    productosPorCategoria[cat.categoria.slug] = productos
  }

  return <PDPComboDetalle combo={combo} productosPorCategoria={productosPorCategoria} />
}
