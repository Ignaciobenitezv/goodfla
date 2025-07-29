'use client'

import { Producto } from '@/types/producto'

export default function ProductCard({ producto }: { producto: Producto }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow hover:shadow-xl transition">
      <img
        src={producto.imagen}
        alt={producto.nombre}
        className="w-full h-[450px] object-cover"
      />
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-marca-crema mb-2">{producto.nombre}</h3>
        <p className="text-marca-beige font-bold text-xl mb-4">${producto.precio}</p>
        <button className="bg-marca-piedra text-white py-2 px-6 rounded-full hover:bg-marca-gris transition">
          Agregar al carrito
        </button>
      </div>
    </div>
  )
}
