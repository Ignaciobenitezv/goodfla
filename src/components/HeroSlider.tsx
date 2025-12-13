'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AnimatedButton from '@/components/AnimatedButton'
import AnimatedButton2 from '@/components/AnimatedButton2'

const IMGS = ['/J1.jpg', '/J2.jpg', '/J3.jpg', '/J4.jpg', '/J5.jpg']

const POSITIONS_DESKTOP: Record<string, string> = {
  '/J1.jpg': 'center 60%',
  '/J2.jpg': 'center 25%',
  '/J3.jpg': 'center 20%',
  '/J4.jpg': 'center 25%',
  '/J5.jpg': 'center 20%',
}

const POSITIONS_MOBILE: Record<string, string> = {
  '/J1.jpg': '32% 0%',
  '/J2.jpg': '38% 0%', // izquierda + abajo
  '/J3.jpg': '50% 0%',
  '/J4.jpg': '45% 0%',
  '/J5.jpg': '55% 0%',
}

export default function HeroSlider() {
  const [idx, setIdx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const slides = useMemo(() => [...IMGS, ...IMGS], [])
  const step = 100

  // ================= MOBILE DETECTION (CORRECTA) =================
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  // ================= SLIDER AUTO =================
  useEffect(() => {
    const id = setInterval(() => setIdx(i => i + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const onTransitionEnd = () => {
    if (idx >= IMGS.length) {
      setWithTransition(false)
      setIdx(0)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setWithTransition(true))
      )
    }
  }

  return (
    <section className="relative h-[90vh] overflow-hidden mt-10">
      {/* TRACK */}
      <div
        className={`absolute inset-0 flex h-full ${
          withTransition ? 'transition-transform duration-700 ease-out' : ''
        }`}
        style={{ transform: `translateX(-${idx * step}%)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((src, i) => (
          <div key={`${src}-${i}`} className="relative flex-[0_0_100%] h-full">
            <Image
              src={src}
              alt="Goodfla"
              fill
              priority={i < 1}
              sizes="100vw"
              className="object-cover"
              style={{
                objectPosition: isMobile
                  ? POSITIONS_MOBILE[src] ?? 'center'
                  : POSITIONS_DESKTOP[src] ?? 'center',
              }}
              draggable={false}
              aria-hidden
            />
          </div>
        ))}
      </div>

      {/* OVERLAY + CONTENIDO */}
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center text-center px-4">
        {/* Texto */}
        <div className="mt-[25vh]">
          <h1 className="font-extrabold text-white drop-shadow-lg text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-3">
            HASTA <span className="text-marca-amarillo">80% OFF</span>
          </h1>

          <p className="text-white text-lg sm:text-xl md:text-2xl drop-shadow mb-2 max-w-2xl mx-auto">
            Últimas rebajas en jeans, remeras y combos. Pocas unidades disponibles.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16">
          <Link href="/mayorista">
            <AnimatedButton2 />
          </Link>
        </div>
      </div>
    </section>
  )
}
