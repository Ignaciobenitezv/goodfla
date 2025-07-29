'use client'

import { useState, useEffect } from 'react'
import ProductGrid from '@/components/ProductGrid'
import { getProductos } from '@/lib/getProductos'
import { getCategorias, Categoria } from '@/lib/getCategorias'

export type CategoriaProducto = string

export type Producto = {
  _id: string
  nombre: string
  descripcion: string
  precio: number
  imagen: string
  categoria: CategoriaProducto
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos')

  useEffect(() => {
    const fetchData = async () => {
      const [prods, cats] = await Promise.all([getProductos(), getCategorias()])
      setProductos(prods)
      setCategorias(cats)
    }
    fetchData()
  }, [])

  const productosFiltrados =
    categoriaSeleccionada === 'todos'
      ? productos
      : productos.filter((prod) => prod.categoria === categoriaSeleccionada)

  return (
    <section className="px-4 py-16 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Nuestros productos</h1>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <button
          onClick={() => setCategoriaSeleccionada('todos')}
          className={`px-4 py-2 rounded-full border text-sm transition ${
            categoriaSeleccionada === 'todos'
              ? 'bg-marca-gris text-white'
              : 'bg-white text-marca-gris border-marca-gris'
          }`}
        >
          Todos los productos
        </button>

        {categorias.map((cat) => (
          <button
            key={cat._id}
            onClick={() => setCategoriaSeleccionada(cat.slug)}
            className={`px-4 py-2 rounded-full border text-sm transition ${
              cat.slug === categoriaSeleccionada
                ? 'bg-marca-gris text-white'
                : 'bg-white text-marca-gris border-marca-gris'
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      <ProductGrid productos={productosFiltrados} />
    </section>
  )
}
