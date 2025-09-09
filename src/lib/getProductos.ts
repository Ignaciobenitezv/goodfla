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

export async function getProductos(): Promise<Producto[]> {
  return sanityClient.fetch(Q_PRODUCTOS)
}

export async function getProductosDestacados(limit = 6): Promise<ProductoPreview[]> {
  return sanityClient.fetch(Q_PRODUCTOS_DESTACADOS, { limit })
}

export async function getProductosPorCategoria(categoriaSlug: string): Promise<ProductoPreview[]> {
  return sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, { slug: categoriaSlug })
}

export async function getProductoBySlug(productoSlug: string): Promise<ProductoDetalle | null> {
  return sanityClient.fetch(Q_PRODUCTO_BY_SLUG, { slug: productoSlug })
}
