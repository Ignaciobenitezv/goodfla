'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AnimatedFadeDown from './AnimatedFadeDown'

const categorias = [
  { titulo: 'MAYORISTA', imagen: '/mayo.jpg', link: '/mayorista' },
  { titulo: 'COMBOS', imagen: '/fd.jpg', link: '/productos/combos' },
  { titulo: 'ZAPATILLAS 2X1', imagen: '/zapas.jpg', link: '/productos/zapatillas' },
]

// 🎯 Posiciones DESKTOP
const POSITIONS_DESKTOP: Record<string, string> = {
  '/mayo.jpg': 'center 45%',
  '/fd.jpg': 'center 35%',
  '/zapas.jpg': 'center 50%',
}

// 📱 Posiciones MOBILE
const POSITIONS_MOBILE: Record<string, string> = {
  '/mayo.jpg': '50% 15%',
  '/fd.jpg': '60% 40%',
  '/zapas.jpg': '50% 85%',
}

export default function CategoriasDestacadas() {
  // Detectar mobile correctamente
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return (
    <section
      className="
        grid grid-cols-1
        md:grid-cols-3
        w-full max-w-none
      "
    >
      {categorias.map((cat, i) => (
        <div
          key={i}
          className="
            relative group
            h-[33vh] md:h-[90vh]
            overflow-hidden
          "
        >
          {/* Imagen */}
          <Image
            src={cat.imagen}
            alt={cat.titulo}
            fill
            priority={i === 0}
            sizes="(min-width:768px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            style={{
              objectPosition: isMobile
                ? POSITIONS_MOBILE[cat.imagen] ?? 'center'
                : POSITIONS_DESKTOP[cat.imagen] ?? 'center',
            }}
            draggable={false}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />

          {/* Texto + botón */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4 z-10">
            <AnimatedFadeDown>
              <h3 className="text-lg sm:text-xl md:text-4xl font-black tracking-widest mb-2 md:mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                {cat.titulo}
              </h3>
              <Link
                href={cat.link}
                className="inline-block text-xs sm:text-sm md:text-base border-b-2 border-white pb-1 hover:border-marca-crema transition"
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
