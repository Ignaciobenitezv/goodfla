import { getProductoBySlug, type ProductoDetalle } from '@/lib/getProductos'
import PDPDetalle from '@/components/PDPDetalle'
import PDPComboDetalle from '@/components/PDPComboDetalle'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const producto = await getProductoBySlug(params.slug)
  if (!producto) return notFound()

  const isCombo = producto.esCombo || producto.categoria === 'combos'
  return isCombo
    ? <PDPComboDetalle producto={producto as ProductoDetalle} />
    : <PDPDetalle producto={producto as ProductoDetalle} />
}
