// src/app/combo/[slug]/page.tsx
import { sanityClient } from "@/lib/sanity.client"
import { Q_COMBO_BY_SLUG, Q_PRODUCTOS_BY_CATEGORIA } from "@/lib/sanityQueries"
import PDPComboDetalle from "@/components/PDPComboDetalle"
import { notFound } from "next/navigation"

export const revalidate = 60

type Params = { slug: string }

// 👇 firma sin destructuring + Promise<Params>
export default async function ComboPage(
  props: { params: Promise<Params> }
) {
  const { slug } = await props.params

  const combo = await sanityClient.fetch(Q_COMBO_BY_SLUG, { slug })
  if (!combo) return notFound()

  const productosPorCategoria: Record<string, any[]> = {}
  for (const cat of combo.categoriasIncluidas ?? []) {
    const slugCat = cat?.categoria?.slug
    if (!slugCat) continue
    const productos = await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, { slug: slugCat })
    productosPorCategoria[slugCat] = productos || []
  }

  return <PDPComboDetalle combo={combo} productosPorCategoria={productosPorCategoria} />
}
