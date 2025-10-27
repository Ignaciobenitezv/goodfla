"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getProductosPorCategoria } from "@/lib/getProductos" // Función para obtener productos de una categoría

type Producto = {
  nombre: string
  precio: number
  imagen: string
  categoria: string
}

type Props = {
  categoria: string // Puede ser "remeras", "jeans", "combos", etc.
}

export default function ProductFilter({ categoria }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [precio, setPrecio] = useState<[number, number]>([0, 999999])
  const [filtro, setFiltro] = useState("")

  useEffect(() => {
    // Llamada a la API o función para obtener productos según la categoría
    const fetchProductos = async () => {
  const result = await getProductosPorCategoria(categoria, precio, filtro)

  // 🔧 Normalizo para que cumpla con tu tipo Producto
  const normalizados = result.map((p: any) => ({
    nombre: p.nombre,
    precio: Number(p.precio ?? 0),
    imagen: p.imagen ?? "/placeholder.png",
    // asegura string: si viene undefined, uso la categoría actual del filtro
    categoria: p.categoria ?? categoria,
  }))

  setProductos(normalizados)
}


    fetchProductos()
  }, [categoria, precio, filtro])

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Filtros */}
      <div className="w-1/4 p-4 bg-white border rounded-lg">
        <h3 className="font-semibold text-xl">Filtros</h3>
        <div>
          <label className="block text-sm font-medium">Precio</label>
          <input
            type="range"
            min="0"
            max="75000"
            value={precio[0]}
            onChange={(e) => setPrecio([Number(e.target.value), precio[1]])}
            className="w-full"
          />
          <span>{`$${precio[0]} - $${precio[1]}`}</span>
        </div>

        <div>
          <label className="block text-sm font-medium">Buscar</label>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Buscar por nombre"
          />
        </div>
      </div>

      {/* Productos */}
      <div className="w-3/4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos.length ? (
          productos.map((producto) => (
            <div key={producto.nombre} className="border rounded-md overflow-hidden">
              <Image
                src={producto.imagen}
                alt={producto.nombre}
                width={300}
                height={300}
                className="object-cover"
              />
              <div className="p-4">
                <h4 className="font-semibold">{producto.nombre}</h4>
                <p className="font-bold text-xl">${producto.precio.toLocaleString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No se encontraron productos</p>
        )}
      </div>
    </div>
  )
}
