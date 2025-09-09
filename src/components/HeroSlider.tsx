'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AnimatedButton from '@/components/AnimatedButton'

const IMGS = ['/BANER1.jpeg', '/BANER2.jpeg', '/BANER3.jpeg', '/BANER4.jpeg', '/BANER5.jpeg']

export default function HeroSlider() {
  const [idx, setIdx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const slides = useMemo(() => [...IMGS, ...IMGS], [])
  const step = 100 // 1 slide = 100%

  useEffect(() => {
    const id = setInterval(() => setIdx(i => i + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const onTransitionEnd = () => {
    if (idx >= IMGS.length) {
      setWithTransition(false)
      setIdx(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setWithTransition(true)))
    }
  }

  return (
    <section className="relative h-[90vh] overflow-hidden">
      {/* Track */}
      <div
        className={`absolute inset-0 flex h-full ${withTransition ? 'transition-transform duration-700 ease-out' : ''}`}
        style={{ transform: `translateX(-${idx * step}%)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((src, i) => (
          <div key={`${src}-${i}`} className="relative flex-[0_0_100%] h-full">
            <Image
              src={src}
              alt="Campaña VUCAS"
              fill
              priority={i < 1}
              sizes="100vw"
              className="object-cover"
              draggable={false}
              aria-hidden
            />
          </div>
        ))}
      </div>

      {/* Overlay + copy + CTA */}
      <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center text-center text-marca-amarillo">
        <p className="text-marca-amarillo text-outline-fill font-black whitespace-nowrap max-w-none text-3xl sm:text-6xl md:text-8xl mb-6 mt-80">
          txt:Titulo
        </p>
        <Link href="/productos">
          <AnimatedButton />
        </Link>
      </div>
    </section>
  )
}
