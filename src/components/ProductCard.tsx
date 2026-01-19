import Image from 'next/image'
import Link from 'next/link'

type ProductCardProps = {
  product: {
    _id?: string
    nombre?: string
    precio?: number
    imagen?: string
    slug?: string

    // Opcionales (por si en el futuro los traés desde Sanity)
    precioViejo?: number | null
    badges?: string[] | null
    envioGratis?: boolean | null
    cuotasTexto?: string | null
    medioPagoTexto?: string | null
    rating?: number | null
    reviewsCount?: number | null
  }
  view: 'list' | 'grid2' | 'grid3' | 'grid4'
}

function formatARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export default function ProductCard({ product, view }: ProductCardProps) {
  if (!product || !product._id || !product.slug) return null

  const isList = view === 'list'

  // Defaults suaves (NO inventan promos): sólo completan si faltan
  const badges = Array.isArray(product.badges) ? product.badges.filter(Boolean) : []
  const envioGratis = product.envioGratis === true

  const rating =
    typeof product.rating === 'number'
      ? Math.max(0, Math.min(5, product.rating))
      : null

  const reviewsCount =
    typeof product.reviewsCount === 'number' ? product.reviewsCount : null

  const cardClass = isList
    ? 'grid grid-cols-[160px_1fr] gap-4'
    : 'flex flex-col'

  const imageWrapClass = isList
    ? 'relative bg-white w-[160px] sm:w-[180px] aspect-[4/5] rounded-3xl overflow-hidden'
    : 'relative bg-white w-full aspect-[4/5] rounded-3xl overflow-hidden'

  const imageSizes = isList
    ? '(min-width:1024px) 180px, (min-width:640px) 180px, 160px'
    : '(min-width:1280px) calc((100vw - 250px - 48px)/4), (min-width:1024px) calc((100vw - 250px - 48px)/3), (min-width:640px) calc((100vw - 250px - 32px)/2), 100vw'

  return (
    <Link
      href={`/producto/${product.slug}`}
      className={[
        'group block overflow-hidden',
        'rounded-3xl bg-white',
        'shadow-[0_10px_30px_rgba(0,0,0,0.10)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.14)]',
        'transition-shadow',
        cardClass,
      ].join(' ')}
    >
      {/* Imagen */}
      <div className={imageWrapClass}>
        {product.imagen ? (
          <Image
            src={product.imagen}
            alt={product.nombre || 'Producto'}
            fill
            sizes={imageSizes}
            // CLAVE: para look “catálogo” tipo ejemplo
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Sin imagen
          </span>
        )}

        {/* Chip envío gratis (si existe) */}
        {envioGratis && (
          <div className="absolute left-4 top-4 z-10">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/90 text-zinc-900 border border-zinc-200 shadow-sm">
              <span className="text-base leading-none">🚚</span>
              GRATIS
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className={isList ? 'pr-4 py-4' : 'px-5 pb-5'}>
        {/* Badges (solo si vienen) */}
        {badges.length > 0 && (
          <div className={isList ? 'flex flex-wrap gap-2 mt-1' : 'flex flex-col items-start gap-2 mt-3'}>
            {badges.slice(0, 2).map((label, i) => {
              const isPrimary = /más vendido/i.test(label)
              return (
                <span
                  key={i}
                  className={[
                    'rounded-xl px-3 py-2 text-xs font-extrabold tracking-wide',
                    isPrimary
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-700 border border-red-200',
                  ].join(' ')}
                >
                  {label}
                </span>
              )
            })}
          </div>
        )}

        {/* Título */}
        <h3 className="mt-4 text-[18px] leading-tight font-semibold text-zinc-900">
          {product.nombre || 'Sin nombre'}
        </h3>

        {/* Rating (solo si viene) */}
        {rating !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, idx) => {
                const filled = idx < Math.floor(rating)
                return (
                  <span
                    key={idx}
                    className={`text-lg ${filled ? 'text-amber-400' : 'text-zinc-200'}`}
                  >
                    ★
                  </span>
                )
              })}
            </div>
            {reviewsCount !== null && (
              <span className="text-sm text-zinc-500">({reviewsCount})</span>
            )}
          </div>
        )}

        {/* Precio tipo ejemplo */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-extrabold text-zinc-900">
              {typeof product.precio === 'number'
                ? `$ ${formatARS(product.precio)}`
                : 'Consultar'}
            </span>

            {/* Si tenés medioPagoTexto, muestra “por Transferencia” */}
            {product.medioPagoTexto ? (
              <>
                <span className="text-xl text-zinc-500">por</span>
                <span className="text-2xl font-semibold text-zinc-900">
                  {product.medioPagoTexto}
                </span>
              </>
            ) : null}
          </div>

          {/* Precio viejo tachado */}
          {typeof product.precioViejo === 'number' && (
            <div className="mt-2 text-lg text-zinc-400 line-through">
              $ {formatARS(product.precioViejo)}
            </div>
          )}
        </div>

        {/* Cuotas (solo si vienen) */}
        {product.cuotasTexto ? (
          <div className="mt-4 text-[18px] font-extrabold text-red-600">
            {product.cuotasTexto}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
