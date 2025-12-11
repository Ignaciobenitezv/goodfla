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
    label: "Mayorista",
    href: "/mayorista",
    // Todas las rutas que deberían considerarse "Mayorista"
    paths: ["/mayorista", "/productos/mayorista"],
  },
  {
    label: "Combos",
    href: "/productos/combos",
    paths: ["/productos/combos", "/combos"],
  },
  {
    label: "Zapatillas 2x1",
    href: "/productos/zapatillas",
    paths: ["/productos/zapatillas", "/zapatillas"],
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
    <div className="w-full flex justify-center items-center gap-6 mb-10 relative">
      {/* Inyectamos la animación pulse */}
      <style>{pulseAnimation}</style>

      {/* Flecha izquierda - SIEMPRE lleva a la sección anterior */}
      <Link href={prev.href}>
        <button className="p-2 rounded-full bg-black text-white shadow hover:scale-110 transition">
          <ChevronLeft size={22} />
        </button>
      </Link>

      {/* Título con pill negro y efecto pulse cada 5s */}
      <span
        className="
          relative
          px-8 py-3
          rounded-full
          bg-black
          text-white
          text-3xl sm:text-4xl
          font-semibold
          shadow-[0_0_25px_rgba(0,0,0,0.35)]
        "
        style={{ animation: "pulseSlow 5s ease-in-out infinite" }}
      >
        {current.label}
      </span>

      {/* Flecha derecha - SIEMPRE lleva a la siguiente sección */}
      <Link href={next.href}>
        <button className="p-2 rounded-full bg-black text-white shadow hover:scale-110 transition">
          <ChevronRight size={22} />
        </button>
      </Link>
    </div>
  )
}
