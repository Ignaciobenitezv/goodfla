// lib/getProductosPorCategoria.ts

import { sanityClient } from './sanity'
import { Q_PRODUCTOS_BY_CATEGORIA, ProductoPreview } from './sanityQueries'

export async function getProductosPorCategoria(
  categoriaSlug: string,
  precio: [number, number], // Rango de precios [min, max]
  filtro: string // Texto de búsqueda
): Promise<ProductoPreview[]> {
  return await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, {
    slug: categoriaSlug,
    precioMin: precio[0],
    precioMax: precio[1],
    filtro
  })
}
