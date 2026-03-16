// src/components/SectionTitle.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SectionTitleProps {
  basePath?: string; // ahora acepta esta prop (la usamos solo para typing)
}

// Orden de navegación circular
const SECTIONS = [
  {
    label: "Zapatillas 10 x $250.000",
    href: "/productos/mayorista",
    paths: ["/productos/mayorista"],
  },
  {
    label: "Zapatillas 2 x $59.999",
    href: "/productos/zapatillas",
    paths: ["/productos/zapatillas"],
  },
  {
    label: "Zapatillas x $35.000",
    href: "/productos/zapatillas-individuales",
    paths: ["/productos/zapatillas-individuales"],
  },
]

// Animación pulse suave cada 5s
const pulseAnimation = `
  @keyframes pulseSlow {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.95; }
  }
`

export default function SectionTitle({ basePath: _basePath }: SectionTitleProps) {
  const pathname = usePathname() || "/"

  // Buscar la sección actual según la URL
  let currentIndex = SECTIONS.findIndex((section) =>
    section.paths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  )

  // Si no coincide con nada, arrancamos en la primera (Mayorista)
  if (currentIndex === -1) currentIndex = 0

  const total = SECTIONS.length
  const current = SECTIONS[currentIndex]

  // Índices circularmente (pila infinita)
  const prevIndex = (currentIndex - 1 + total) % total
  const nextIndex = (currentIndex + 1) % total

  const prev = SECTIONS[prevIndex]
  const next = SECTIONS[nextIndex]

  return (
  <div className="w-full flex justify-center items-center gap-4 sm:gap-6 mb-10 relative">
    <style>{pulseAnimation}</style>

    {/* Flecha izquierda */}
    <Link href={prev.href}>
      <button
        className="
          w-10 h-10 sm:w-11 sm:h-11
          inline-flex items-center justify-center
          rounded-full bg-black text-white shadow
          hover:scale-110 transition
          shrink-0
        "
        aria-label={`Ir a ${prev.label}`}
      >
        <ChevronLeft size={22} />
      </button>
    </Link>

    {/* Título */}
    <span
      className="
        relative
        px-6 sm:px-8 py-3
        rounded-full
        bg-black text-white
        font-semibold
        shadow-[0_0_25px_rgba(0,0,0,0.35)]
        whitespace-nowrap
        leading-none
        text-[clamp(18px,5vw,32px)]
      "
      style={{ animation: "pulseSlow 5s ease-in-out infinite" }}
    >
      {current.label}
    </span>

    {/* Flecha derecha */}
    <Link href={next.href}>
      <button
        className="
          w-10 h-10 sm:w-11 sm:h-11
          inline-flex items-center justify-center
          rounded-full bg-black text-white shadow
          hover:scale-110 transition
          shrink-0
        "
        aria-label={`Ir a ${next.label}`}
      >
        <ChevronRight size={22} />
      </button>
    </Link>
  </div>
)

}
