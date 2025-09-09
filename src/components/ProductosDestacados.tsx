'use client'

import Image from 'next/image'
import Link from 'next/link'

type ProductoCard = {
  id?: string | number
  nombre: string
  precio: number
  imagen: string
  slug?: string
  categoria?: string
}

const FALLBACK: ProductoCard[] = [
  { id: 1, nombre: 'Remera CarpeDiem', precio: 7999, imagen: '/desta1.webp' },
  { id: 2, nombre: 'Denim gris',       precio: 8999, imagen: '/desta2.webp' },
  { id: 3, nombre: 'Cargo',            precio: 5999, imagen: '/desta3.webp' },
]

export default function ProductosDestacados({ productos }: { productos?: ProductoCard[] }) {
  const data = productos?.length ? productos : FALLBACK

  return (
    <section className="bg-marca-blanco py-20 px-4">
      <h2 className="text-3xl font-bold text-center text-marca-gris mb-12">Destacados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {data.map((p, i) => {
          const href = p.slug ? `/producto/${p.slug}` : '#'
          return (
            <Link
              key={p.id ?? i}
              href={href}
              className={`bg-white rounded-3xl overflow-hidden shadow hover:shadow-xl transition block ${
                p.slug ? '' : 'pointer-events-none cursor-default'
              }`}
            >
              <Image src={p.imagen} alt={p.nombre} width={400} height={500} className="w-full h-[450px] object-cover" />
              <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-marca-gris mb-2">{p.nombre}</h3>
                <p className="text-marca-amarillo font-bold text-xl mb-4">${p.precio}</p>
                <span className="inline-block bg-marca-gris text-white py-2 px-6 rounded-full">Ver producto</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
