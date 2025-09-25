import { getProductoBySlug, type ProductoDetalle } from '@/lib/getProductos'
import PDPDetalle from '@/components/PDPDetalle'
import PDPComboDetalle from '@/components/PDPComboDetalle'
import PDPJean from '@/components/PDPJean'
import PDPRemera from '@/components/PDPRemera'   // 👈 importamos el PDP para remeras
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const producto = await getProductoBySlug(params.slug)
  if (!producto) return notFound()

  // chequeamos si es combo
  const isCombo = producto.esCombo || producto.categoria === 'combos'
  // chequeamos si es jean
  const isJean = producto.categoria === 'jeans'
  // chequeamos si es remera
  const isRemera = producto.categoria === 'remeras'   // 👈 ajustá el valor exacto según Sanity

  if (isCombo) {
    return <PDPComboDetalle producto={producto as ProductoDetalle} />
  }

  if (isJean) {
    return <PDPJean producto={producto as ProductoDetalle} />
  }

  if (isRemera) {
    return <PDPRemera producto={producto as ProductoDetalle} />
  }

  // fallback: productos normales
  return <PDPDetalle producto={producto as ProductoDetalle} />
}
