"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import AnimatedButton2 from "@/components/AnimatedButton2"

const SLIDES = [
  {
    img: "/puma3.JPG",
    line1: "LLEVÁ 1",
    line2: "ZAPATILLA",
    price: "$35.000",
    href: "/productos/zapatillas-individuales",
  },
  {
    img: "/dcc.JPG",
    line1: "LLEVÁ 2",
    line2: "ZAPATILLAS",
    price: "$59.999",
    href: "/productos/zapatillas",
  },
  {
    img: "/rayo.JPG",
    line1: "LLEVÁ 10",
    line2: "ZAPATILLAS",
    price: "$250.000",
    href: "/productos/mayorista",
  },
]

const POSITIONS_DESKTOP: Record<string, string> = {
  "/puma3.JPG": "10% 60%",
  "/dcc.JPG": "center",
  "/rayo.JPG": "50% 50%",
}

const POSITIONS_MOBILE: Record<string, string> = {
  "/puma3.JPG": "20% 70%",
  "/dcc.JPG": "center",
  "/rayo.JPG": "50% 40%",
}

function isNear(activeIdx: number, i: number, radius = 1) {
  return Math.abs(i - activeIdx) <= radius
}

export default function HeroSlider() {
  const [idx, setIdx] = useState(0)
  const [withTransition, setWithTransition] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const slides = useMemo(() => [...SLIDES, ...SLIDES], [])
  const step = 100

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener("change", update)

    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (id) return

      id = setInterval(() => {
        setIdx((i) => i + 1)
      }, 5000)
    }

    const stop = () => {
      if (!id) return
      clearInterval(id)
      id = null
    }

    const onVis = () => {
      if (document.hidden) {
        stop()
      } else {
        start()
      }
    }

    document.addEventListener("visibilitychange", onVis)
    start()

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  const onTransitionEnd = () => {
    if (idx >= SLIDES.length) {
      setWithTransition(false)
      setIdx(0)

      requestAnimationFrame(() =>
        requestAnimationFrame(() => setWithTransition(true))
      )
    }
  }

  const visibleIndex = idx % SLIDES.length
  const currentSlide = SLIDES[visibleIndex]

  return (
    <section className="relative h-[78vh] md:h-[90vh] overflow-hidden">
      {/* SLIDER */}
      <div
        className={`absolute inset-0 flex h-full ${
          withTransition
            ? "transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : ""
        }`}
        style={{ transform: `translateX(-${idx * step}%)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((slide, i) => {
          const shouldRenderRealImage = isNear(idx, i, 1)

          return (
            <div
              key={`${slide.img}-${i}`}
              className="relative flex-[0_0_100%] h-full"
            >
              <div className="absolute inset-0 bg-slate-300" />

              {shouldRenderRealImage && (
                <Image
                  src={slide.img}
                  alt="Goodfla"
                  fill
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    objectPosition: isMobile
                      ? POSITIONS_MOBILE[slide.img] ?? "center"
                      : POSITIONS_DESKTOP[slide.img] ?? "center",
                  }}
                  draggable={false}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/40 flex items-center">
        <div className="px-6 sm:px-10 md:px-16 lg:px-24 w-full">
          <div className="max-w-[720px] text-left">
            <div key={`${currentSlide.line1}-${currentSlide.price}`}>
              <p className="hero-meta mb-3 text-white/80 text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.35em] font-medium">
                Promo exclusiva online
              </p>

              <h1 className="font-extrabold leading-[0.9] drop-shadow-lg">
                <span className="hero-line-1 block text-white text-5xl sm:text-6xl md:text-7xl lg:text-[88px]">
                  {currentSlide.line1}
                </span>
                <span className="hero-line-2 block text-white text-4xl sm:text-5xl md:text-6xl lg:text-[74px]">
                  {currentSlide.line2}
                </span>
                <span className="hero-line-3 block text-marca-amarillo text-5xl sm:text-6xl md:text-7xl lg:text-[96px] mt-2">
                  {currentSlide.price}
                </span>
              </h1>

              <div className="hero-meta mt-6 flex flex-col gap-2 sm:flex-row sm:gap-6 text-white">
                <div className="text-base sm:text-lg md:text-xl font-semibold">
                  3 cuotas sin interés
                </div>
                <div className="text-base sm:text-lg md:text-xl font-semibold text-white/90">
                  Envío gratis
                </div>
              </div>

              <div className="hero-meta mt-8">
                <Link href={currentSlide.href}>
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