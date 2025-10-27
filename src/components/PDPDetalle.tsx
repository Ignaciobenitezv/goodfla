'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ProductoDetalle } from '@/lib/getProductos'

const DEFAULT_TALLES = [
  { label: 'XS', inStock: true },
  { label: 'S',  inStock: true },
  { label: 'M',  inStock: true },
  { label: 'L',  inStock: true },
  { label: 'XL', inStock: false },
]

export default function PDPDetalle({ producto }: { producto: ProductoDetalle }) {
  // Galería (fallback a imagen principal si no hay galería)
  const imgs = useMemo(
    () => (producto.galeria?.length ? producto.galeria : producto.imagen ? [producto.imagen] : []),
    [producto.galeria, producto.imagen]
  )
  // Talles (fallback por defecto si no hay)
  const talles = producto.talles?.length ? producto.talles : DEFAULT_TALLES

  const [idx, setIdx] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const mainImg = imgs[Math.min(idx, imgs.length - 1)]

  return (
    <main className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ===== Galería con miniaturas ===== */}
        <section className="grid grid-cols-[84px_1fr] gap-4">
          {/* Thumbs */}
          <div className="flex lg:flex-col gap-3 overflow-auto max-h-[70vh] pr-1">
            {imgs.map((src, i) => (
              <button
                key={`${src}-${i}`}
                onClick={() => setIdx(i)}
                className={`relative h-20 w-20 rounded-lg overflow-hidden border transition
                  ${i === idx ? 'border-black' : 'border-black/10 hover:border-black/40'}`}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <Image src={src} alt={`${producto.nombre} ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>

          {/* Imagen principal */}
          <div className="relative w-full aspect-[1.1] rounded-2xl overflow-hidden bg-[#f5f5f5]">
            {mainImg && (
              <Image
                src={mainImg}
                alt={producto.nombre}
                fill
                className="object-contain p-6"
                sizes="(min-width:1024px) 45vw, 90vw"
                priority
              />
            )}

            {imgs.length > 1 && (
              <>
                <button
                  onClick={() => setIdx((p) => (p - 1 + imgs.length) % imgs.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 hover:bg-white shadow"
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={() => setIdx((p) => (p + 1) % imgs.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 hover:bg-white shadow"
                  aria-label="Siguiente"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </section>

        {/* ===== Info + CTA ===== */}
        <section>
          {/* Título + precio */}
          <div className="mb-4">
            <p className="text-sm text-red-600 font-semibold mb-1">Lo nuevo</p>
            <h1 className="text-2xl md:text-3xl font-bold text-marca-gris">{producto.nombre}</h1>
            {producto.categoria && (
              <p className="text-marca-gris/70 text-sm mt-1 capitalize">{producto.categoria}</p>
            )}

            <div className="mt-3">
              <p className="text-2xl font-bold text-marca-gris">
                ${typeof producto.precio === 'number' ? producto.precio.toLocaleString() : producto.precio}
              </p>
              <p className="text-xs text-marca-gris/60 mt-1">
                Hasta 6x sin interés con bancos seleccionados
              </p>
            </div>
          </div>

          {/* Selector de talles */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-marca-gris/80">Seleccionar Talle (AR/EU)</span>
            <Link href="#" className="ml-auto text-sm underline">Guía de talles</Link>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {talles.map((t, i) => {
              const active = size === t.label
              const disabled = t.inStock === false
              return (
                <button
                  key={`${t.label}-${i}`}
                  disabled={disabled}
                  onClick={() => setSize(t.label)}
                  className={`h-11 rounded-md border text-sm font-medium transition
                    ${disabled
                      ? 'bg-black/5 text-black/30 border-dashed border-black/20 cursor-not-allowed'
                      : active
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 hover:border-black'}`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="mt-3">
            <Link href="#" className="text-xs text-marca-gris/70 underline">
              Solicitá tu talle si está agotado
            </Link>
          </div>

          <button
            disabled={!size}
            className={`mt-6 w-full h-12 rounded-full font-semibold transition
              ${!size ? 'bg-black/10 text-black/50 cursor-not-allowed'
                      : 'bg-black text-white hover:opacity-90'}`}
            onClick={() => size && alert(`Agregado: ${producto.nombre} - Talle ${size}`)}
          >
            Agregar al Carrito
          </button>

          <div className="mt-6 text-sm text-marca-gris/80 space-y-2">
            <p>Envío gratis a partir de $229.999</p>
            <p>Devolución dentro de los 30 días.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
