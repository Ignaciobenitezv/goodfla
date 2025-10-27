'use client'

import CombosClient from '@/app/productos/combos/CombosClient'

type Producto = {
  _id: string
  nombre: string
  precio: number | null
  imagen?: string
  slug: string
  inStock?: boolean
  _createdAt?: string | number // por si viene desde Sanity
}

export default function ProductosClient({ productos }: { productos: Producto[] }) {
  const safe = Array.isArray(productos) ? productos : []

  // Adaptamos al shape que espera CombosClient: { _id, nombre, precio, imagen, slug, inStock, _createdAt }
  const combosAdaptados = safe.map((p, i) => ({
    _id: p._id,
    nombre: p.nombre,
    precio: typeof p.precio === 'number' ? p.precio : null,
    imagen: p.imagen,
    slug: p.slug,
    inStock: p.inStock ?? true,
    _createdAt: p._createdAt ?? i, // para que el orden “más vendidos/recientes” sea estable
  }))

  // El PDP de zapatillas vive en /producto/[slug]
  return <CombosClient combos={combosAdaptados} basePath="/producto" />
}
