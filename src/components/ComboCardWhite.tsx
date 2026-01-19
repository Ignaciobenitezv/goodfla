'use client'

import Image from 'next/image'
import Link from 'next/link'

type Combo = {
  _id: string
  nombre: string
  precio: number | null
  imagen?: string
  slug: string
  inStock?: boolean
}

function formatARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export default function ComboCardWhite({
  combo,
  hrefBase = '/producto',
}: {
  combo: Combo
  hrefBase?: string
}) {
  const precio = typeof combo.precio === 'number' ? combo.precio : 0
  const cuota = Math.round(precio / 6)
  const oldPrice = Math.round(precio * 1.25)

  return (
    <Link
      href={`${hrefBase}/${combo.slug}`}
      className="
        group block overflow-hidden
        rounded-3xl bg-white
        shadow-[0_10px_30px_rgba(0,0,0,0.10)]
        hover:shadow-[0_16px_40px_rgba(0,0,0,0.14)]
        transition-shadow
      "
    >
      {/* Imagen */}
      <div className="relative bg-white w-full aspect-[4/5] rounded-3xl overflow-hidden">
        {combo.imagen ? (
          <Image
            src={combo.imagen}
            alt={combo.nombre}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Sin imagen
          </div>
        )}

        {/* ENVÍO GRATIS (default) */}
        <div className="absolute left-4 top-4 z-10">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/90 text-zinc-900 border border-zinc-200 shadow-sm">
            🚚 GRATIS
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-5 pb-5">
        {/* BADGES (default) */}
        <div className="flex flex-col items-start gap-2 mt-3">
          <span className="rounded-xl px-3 py-2 text-xs font-extrabold tracking-wide bg-red-100 text-red-700 border border-red-200">
            LLEVÁ 3 Y PAGÁ 1
          </span>
          <span className="rounded-xl px-3 py-2 text-xs font-extrabold tracking-wide bg-red-600 text-white">
            MÁS VENDIDO
          </span>
        </div>

        {/* Título */}
        <h3 className="mt-4 text-[18px] leading-tight font-semibold text-zinc-900">
          {combo.nombre}
        </h3>

        {/* Rating (default) */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, idx) => (
              <span key={idx} className="text-lg text-amber-400">★</span>
            ))}
          </div>
          <span className="text-sm text-zinc-500">(1)</span>
        </div>

        {/* Precio */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-extrabold text-zinc-900">
              $ {formatARS(precio)}
            </span>
            <span className="text-xl text-zinc-500">por</span>
          </div>

          <div className="text-2xl font-semibold text-zinc-900 mt-1">
            Transferencia
          </div>

          <div className="mt-2 text-lg text-zinc-400 line-through">
            $ {formatARS(oldPrice)}
          </div>
        </div>

        {/* Cuotas */}
        <div className="mt-4 text-[18px] font-extrabold text-red-600">
          6 x $ {formatARS(cuota)} sin interés
        </div>
      </div>
    </Link>
  )
}
