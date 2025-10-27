import { getProductoBySlug, type ProductoDetalle } from '@/lib/getProductos'
import PDPDetalle from '@/components/PDPDetalle'
import PDPComboDetalle from '@/components/PDPComboDetalle'
import PDPJean from '@/components/PDPJean'
import PDPRemera from '@/components/PDPRemera'
import PDPZapatillas from '@/components/PDPZapatillas'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const producto = await getProductoBySlug(params.slug)
  if (!producto) return notFound()

  const isCombo = producto.esCombo === true || producto.categoria === 'combos'
  const isJean = producto.categoria === 'jeans'
  const isRemera = producto.categoria === 'remeras'
  const isZapatilla = producto.categoria === 'zapatillas'

  // 👇 Si es Zapatilla 2x1 (zapa marcada como combo), usar el PDP de combos
  const isZapa2x1 = isZapatilla && producto.esCombo === true && (producto.comboCantidad ?? 0) >= 2

  if (isCombo || isZapa2x1) {
    return <PDPComboDetalle producto={producto as ProductoDetalle} />
  }

  if (isJean) {
    return <PDPJean producto={producto as ProductoDetalle} />
  }

  if (isRemera) {
    return <PDPRemera producto={producto as ProductoDetalle} />
  }

  if (isZapatilla) {
    return <PDPZapatillas producto={producto as ProductoDetalle} />
  }

  // fallback: productos normales
  return <PDPDetalle producto={producto as ProductoDetalle} />
}
