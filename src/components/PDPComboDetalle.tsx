'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ProductoDetalle } from '@/lib/getProductos'

const DEFAULT_TALLES = ['XS', 'S', 'M', 'L', 'XL']
const DEFAULT_COLORES = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde']

function formatCurrency(n: number) {
  try { return n.toLocaleString('es-AR') } catch { return String(n) }
}

export default function PDPComboDetalle({ producto }: { producto: ProductoDetalle }) {
  const imgs = useMemo(
    () => (producto.galeria?.length ? producto.galeria : producto.imagen ? [producto.imagen] : []),
    [producto.galeria, producto.imagen]
  )

  const talles = (producto.talles?.map(t => t.label) ?? DEFAULT_TALLES).filter(Boolean)
  const colores = producto.colores ?? DEFAULT_COLORES
  const comboCount = producto.comboCantidad ?? 3

  const [sizes, setSizes]   = useState<(string | undefined)[]>(Array(comboCount).fill(undefined))
  const [colors, setColors] = useState<(string | undefined)[]>(Array(comboCount).fill(undefined))
  const [idx, setIdx] = useState(0)
  const mainImg = imgs[Math.min(idx, imgs.length - 1)]

  const base = Number(producto.precio ?? 0) * comboCount
  const discountRate = 0.15
  const discounted = Math.round(base * (1 - discountRate))
  const ready = sizes.every(Boolean)

  return (
    <main className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galería */}
        <section className="grid grid-cols-[84px_1fr] gap-4">
          <div className="flex lg:flex-col gap-3 overflow-auto max-h-[70vh] pr-1">
            {imgs.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setIdx(i)}
                className={`relative h-20 w-20 rounded-lg overflow-hidden border transition
                  ${i === idx ? 'border-black' : 'border-black/10 hover:border-black/40'}`}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <Image src={src} alt={`${producto.nombre} ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>

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
                >‹</button>
                <button
                  onClick={() => setIdx((p) => (p + 1) % imgs.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 hover:bg-white shadow"
                  aria-label="Siguiente"
                >›</button>
              </>
            )}
          </div>
        </section>

        {/* Panel derecho (combos) */}
        <section>
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-bold text-marca-gris">{producto.nombre}</h1>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-[#e60023] font-bold text-xl">${formatCurrency(discounted)}</span>
              <span className="line-through text-sm text-marca-gris/60">${formatCurrency(base)}</span>
              <span className="text-xs bg-[#e60023]/10 text-[#e60023] px-2 py-1 rounded-full">
                AHORRÁS {Math.round(discountRate * 100)}%
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button className="px-4 py-1 rounded-full bg-black text-white text-sm">Elegí colores y talles</button>
              <Link href="#" className="text-xs underline">GUÍA DE TALLES</Link>
              <button className="text-xs border px-2 py-1 rounded-full hover:bg-black/5">¿Cuál es el mejor talle para mí?</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {Array.from({ length: comboCount }).map((_, i) => (
              <div key={i} className="border-2 border-dashed border-black/30 rounded-xl p-4 h-[160px] flex flex-col items-center justify-center text-center">
                <div className="text-3xl leading-none">＋</div>
                <p className="mt-2 text-sm font-medium">Agregar producto</p>
                <p className="text-xs text-marca-gris/70">{producto.nombre} {i + 1}</p>

                <div className="mt-3 w-full flex items-center justify-center gap-2">
                  <select
                    value={colors[i] ?? ''}
                    onChange={(e) => { const c = [...colors]; c[i] = e.target.value || undefined; setColors(c) }}
                    className="h-9 px-2 border rounded-md text-sm"
                  >
                    <option value="">Color</option>
                    {colores.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={sizes[i] ?? ''}
                    onChange={(e) => { const s = [...sizes]; s[i] = e.target.value || undefined; setSizes(s) }}
                    className="h-9 px-2 border rounded-md text-sm"
                  >
                    <option value="">Talle</option>
                    {talles.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            disabled={!ready}
            className={`w-full h-12 rounded-md font-semibold transition
              ${!ready ? 'bg-black/10 text-black/50 cursor-not-allowed' : 'bg-black text-white hover:opacity-90'}`}
            onClick={() => ready && alert('Combo agregado. (Demo)')}
          >
            IR A PAGAR
          </button>

          <div className="mt-5 text-sm text-marca-gris/80">
            <div className="flex flex-wrap gap-3 items-center mb-3">
              <span className="px-2 py-1 rounded bg-black/5">Visa</span>
              <span className="px-2 py-1 rounded bg-black/5">Mastercard</span>
              <span className="px-2 py-1 rounded bg-black/5">Mercado Pago</span>
              <span className="px-2 py-1 rounded bg-black/5">OCA</span>
            </div>
            <details className="border-t py-3">
              <summary className="cursor-pointer font-medium">Origen y Cuidados</summary>
              <p className="mt-2 text-sm">100% Algodón jersey. Lavar con colores similares. No usar lavandina.</p>
            </details>
            <details className="border-t py-3">
              <summary className="cursor-pointer font-medium">Retiros y Envios a toda Argentina</summary>
              <p className="mt-2 text-sm">Envíos a todo el país. Devoluciones dentro de los 30 días.</p>
            </details>
          </div>
        </section>
      </div>
    </main>
  )
}
