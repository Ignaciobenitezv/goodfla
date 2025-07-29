'use client'

import Link from 'next/link'
import AnimatedFadeDown from './AnimatedFadeDown'

const categorias = [
  {
    titulo: 'SUJETADORES DEPORTIVOS',
    imagen: '/model1.jpg',
    link: '/productos/tops',
  },
  {
    titulo: 'ATHLEISURE',
    imagen: '/model2.jpg',
    link: '/productos/conjuntos',
  },
  {
    titulo: 'LEGGINGS',
    imagen: '/model3.jpg',
    link: '/productos/calzas-largas',
  },
]

export default function CategoriasDestacadas() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 w-full max-w-none gap-0">
      {categorias.map((cat, i) => (
        <div key={i} className="relative group h-[100vw] md:h-[90vh] w-full overflow-hidden">
          <img
            src={cat.imagen}
            alt={cat.titulo}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white px-4">
            <AnimatedFadeDown>
              <h3 className="text-xl md:text-2xl font-semibold tracking-widest mb-2">
                {cat.titulo}
              </h3>
              <Link
                href={cat.link}
                className="inline-block text-sm md:text-base border-b-2 border-white pb-1 hover:border-marca-crema transition"
              >
                Shop now
              </Link>
            </AnimatedFadeDown>
          </div>
        </div>
      ))}
    </section>
  )
}
