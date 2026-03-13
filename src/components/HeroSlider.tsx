"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import AnimatedButton2 from "@/components/AnimatedButton2"

const IMGS = ["/J1.jpg", "/J2.jpg", "/J3.jpg", "/J4.jpg", "/J5.jpg"]

const POSITIONS_DESKTOP: Record<string, string> = {
  "/J1.jpg": "center 60%",
  "/J2.jpg": "center 25%",
  "/J3.jpg": "center 20%",
  "/J4.jpg": "center 25%",
  "/J5.jpg": "center 20%",
}

const POSITIONS_MOBILE: Record<string, string> = {
  "/J1.jpg": "68% 18%",
  "/J2.jpg": "66% 18%",
  "/J3.jpg": "64% 16%",
  "/J4.jpg": "66% 18%",
  "/J5.jpg": "68% 16%",
}

function isNear(activeIdx: number, i: number, radius = 1) {
  // renderiza imagen real solo para: idx-1, idx, idx+1
  return Math.abs(i - activeIdx) <= radius
}

export default function HeroSlider() {
  const [idx, setIdx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)

  // mantenemos tu loop duplicado (IGUAL)
  const slides = useMemo(() => [...IMGS, ...IMGS], [])
  const step = 100

  // mobile detection (igual)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  // slider auto (igual, pero pausamos si tab oculta para bajar carga)
  useEffect(() => {
    let id: any

    const start = () => {
      if (id) return
      id = setInterval(() => setIdx((i) => i + 1), 5000)
    }
    const stop = () => {
      if (!id) return
      clearInterval(id)
      id = null
    }

    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVis)

    start()
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVis)
    }
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
    <section className="relative h-[78vh] md:h-[90vh] overflow-hidden">
      {/* TRACK */}
      
      <div
        className={`absolute inset-0 flex h-full ${
          withTransition ? "transition-transform duration-700 ease-out" : ""
        }`}
        style={{ transform: `translateX(-${idx * step}%)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((src, i) => {
          const shouldRenderRealImage = isNear(idx, i, 1) // 3 imágenes reales

          return (
            <div key={`${src}-${i}`} className="relative flex-[0_0_100%] h-full">
              {/* Placeholder liviano (siempre) */}
              <div className="absolute inset-0 bg-slate-300" />

              {/* Imagen real SOLO cerca del slide visible */}
              {shouldRenderRealImage && (
                <Image
                  src={src}
                  alt="Goodfla"
                  fill
                  // solo la primera visible: priority
                  priority={i === 0}
                  // las demás (siguiente/anterior) lazy
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    objectPosition: isMobile
                      ? POSITIONS_MOBILE[src] ?? "center"
                      : POSITIONS_DESKTOP[src] ?? "center",
                  }}
                  draggable={false}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* OVERLAY + CONTENIDO */}
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center text-center px-4">
       <div className="absolute inset-0 bg-black/35">
  <div className="flex h-full items-center px-6 sm:px-10 md:px-16 lg:px-24">
    <div className="max-w-[720px] text-left">
      <p className="mb-3 text-white/80 text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.35em] font-medium">
        Promo exclusiva online
      </p>

      <h1 className="font-extrabold leading-[0.9] drop-shadow-lg">
        <span className="block text-white text-5xl sm:text-6xl md:text-7xl lg:text-[88px]">
          LLEVÁ 2
        </span>
        <span className="block text-white text-4xl sm:text-5xl md:text-6xl lg:text-[74px]">
          ZAPATILLAS
        </span>
        <span className="block text-marca-amarillo text-5xl sm:text-6xl md:text-7xl lg:text-[96px] mt-2">
          $59.999
        </span>
      </h1>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-6 text-white">
        <div className="text-base sm:text-lg md:text-xl font-semibold">
          3 cuotas sin interés
        </div>
        <div className="text-base sm:text-lg md:text-xl font-semibold text-white/90">
          Envío gratis
        </div>
      </div>

      <div className="mt-8">
        <Link href="/productos/zapatillas">
          <AnimatedButton2 />
        </Link>
      </div>
    </div>
  </div>
</div>

  
      </div>
    </section>
  )
}
