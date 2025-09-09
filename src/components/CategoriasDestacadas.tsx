'use client'

import Link from 'next/link'
import Image from 'next/image'
import AnimatedFadeDown from './AnimatedFadeDown'

const categorias = [
  { titulo: 'REMERAS', imagen: '/remeras.jpeg', link: '/productos/tops' },
  { titulo: 'JEANS',              imagen: '/jeans.jpeg', link: '/productos/conjuntos' },
  { titulo: 'COMBOS',                imagen: '/combos.jpeg', link: '/productos/calzas-largas' },
]

export default function CategoriasDestacadas() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 w-full max-w-none gap-0">
      {categorias.map((cat, i) => (
        <div key={i} className="relative group h-[100vw] md:h-[90vh] w-full overflow-hidden">
          {/* Imagen */}
          <Image
            src={cat.imagen}
            alt={cat.titulo}
            fill
            priority={i === 0}                       // solo la primera con prioridad
            sizes="(min-width:768px) 33vw, 100vw"    // 1 columna en mobile, 3 en desktop
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />

          {/* Texto + link centrados */}
<div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4 z-10">
  <AnimatedFadeDown>
    <h3 className="text-2xl md:text-4xl font-black tracking-widest mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      {cat.titulo}
    </h3>
    <Link
      href={cat.link}
      className="inline-block text-sm md:text-base border-b-2 border-white pb-1 hover:border-marca-crema transition"
    >
      COMPRAR AHORA
    </Link>
  </AnimatedFadeDown>
</div>

        </div>
      ))}
    </section>
  )
}
