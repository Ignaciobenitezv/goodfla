import { getProductoBySlug, type ProductoDetalle } from '@/lib/getProductos'
import PDPDetalle from '@/components/PDPDetalle'
import PDPComboDetalle from '@/components/PDPComboDetalle'
import PDPJean from '@/components/PDPJean'
import PDPRemera from '@/components/PDPRemera'
import PDPZapatillas from '@/components/PDPZapatillas'
import { notFound } from 'next/navigation'

// Normaliza el array de talles a { label, stock }
const withStock = (p: any) => ({
  ...p,
  talles: Array.isArray(p?.talles)
    ? p.talles.map((t: any) => ({
        label: String(t?.label ?? t?.talle ?? t?.size ?? ""),
        stock: Number(t?.stock ?? t?.stockDisponible ?? t?.qty ?? 0),
      }))
    : undefined,
});


export const revalidate = 60

type Params = { slug: string }

export default async function ProductoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params

  const producto = await getProductoBySlug(slug)
  if (!producto) return notFound()

  const isCombo = producto.esCombo === true || producto.categoria === 'combos'
  const isJean = producto.categoria === 'jeans'
  const isRemera = producto.categoria === 'remeras'
  const isZapatilla = producto.categoria === 'zapatillas'

  // Si es Zapatilla 2x1 (zapa marcada como combo), usar el PDP de combos
  const isZapa2x1 = isZapatilla && producto.esCombo === true && (producto.comboCantidad ?? 0) >= 2

  // Si es Zapatilla 2x1 (zapa marcada como combo), usar el PDP de zapatillas con talles normalizados
if (isZapa2x1) {
  const productoAdaptado = withStock(producto);
  return <PDPZapatillas producto={productoAdaptado} />;
}

// En la página genérica, los combos los mostramos con PDPDetalle
if (isCombo) {
  const productoAdaptado = withStock(producto);
  return <PDPDetalle producto={productoAdaptado} />;
}

if (isJean) {
  const productoAdaptado = withStock(producto);
  return <PDPJean producto={productoAdaptado} />;
}

if (isRemera) {
  const productoAdaptado = withStock(producto);
  return <PDPRemera producto={productoAdaptado} />;
}

// fallback: productos normales
return <PDPDetalle producto={withStock(producto)} />;
}