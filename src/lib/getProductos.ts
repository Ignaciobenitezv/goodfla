import { sanityClient } from './sanity'
import {
  Q_PRODUCTOS,
  Q_PRODUCTOS_DESTACADOS,
  Q_PRODUCTOS_BY_CATEGORIA,
  Q_PRODUCTO_BY_SLUG,
} from './sanityQueries'

export type Talle = { label: string; inStock?: boolean }

export type Producto = {
  _id: string
  nombre: string
  descripcion?: string
  precio: number
  imagen: string
  categoria?: string
  slug?: string
}

export type ProductoPreview = Pick<
  Producto,
  '_id' | 'nombre' | 'precio' | 'imagen' | 'categoria' | 'slug'
>

export type ProductoDetalle = Producto & {
  galeria?: string[]
  talles?: Talle[]
  colores?: string[]
  comboCantidad?: number
  esCombo?: boolean
}

// Consultas (probablemente ya las tengas definidas en sanityQueries)
export async function getProductos(): Promise<Producto[]> {
  return sanityClient.fetch(Q_PRODUCTOS)
}

// Obtener productos destacados
export async function getProductosDestacados(limit = 6): Promise<ProductoPreview[]> {
  return sanityClient.fetch(Q_PRODUCTOS_DESTACADOS, { limit })
}

// Obtener productos por categoría con filtros adicionales de precio y búsqueda
export async function getProductosPorCategoria(
  categoriaSlug: string,
  precio: [number, number], // Rango de precios (mínimo, máximo)
  filtro: string // Texto de búsqueda (puede ser nombre del producto)
): Promise<ProductoPreview[]> {
  const query = `*[_type == "producto" && categoria->slug.current == $categoriaSlug && precio >= $precioMin && precio <= $precioMax && nombre match $filtro*]{
    _id,
    nombre,
    precio,
    "imagen": imagen[0].asset->url,
    categoria->slug.current
  }`

  return await sanityClient.fetch(query, {
    categoriaSlug,
    precioMin: precio[0],
    precioMax: precio[1],
    filtro,
  })
}

// Obtener un producto por su slug
export async function getProductoBySlug(productoSlug: string): Promise<ProductoDetalle | null> {
  return sanityClient.fetch(Q_PRODUCTO_BY_SLUG, { slug: productoSlug })
}
