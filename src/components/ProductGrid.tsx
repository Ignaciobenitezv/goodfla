'use client'

import ProductCard from './ProductCard'
import { Producto } from '@/types/producto'

export default function ProductGrid({ productos }: { productos: Producto[] }) {
  return (
    <section className="bg-marca-blanco py-20 px-4">
      <h2 className="text-3xl font-bold text-center text-marca-gris mb-12">Nuestros productos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {productos.map((producto) => (
          <ProductCard key={producto._id} producto={producto} />
        ))}

      </div>
    </section>
  )
}
