import Image from 'next/image'
import Link from 'next/link'
import { sanityClient } from '@/lib/sanity'

export const revalidate = 60

// ---- Tipos locales (lo justo para esta página) ----
type Item = {
  _id: string
  nombre: string
  precio: number
  imagen: string
  slug: string
  createdAt: string
  talles?: string[] // ['XS','S',...]
}

// Trae productos de la categoría con talles (para filtrar) y fecha
async function fetchByCategory(slug: string): Promise<Item[]> {
  const query = `*[_type=="producto" && categoria->slug.current==$slug] | order(_createdAt desc){
    _id,
    nombre,
    precio,
    "imagen": imagen.asset->url,
    "slug": slug.current,
    "_createdAt": _createdAt,
    "talles": talles[].label
  }`
  return sanityClient.fetch(query, { slug })
}

// Helpers para armar URLs con query params
function withParams(
  base: string,
  current: Record<string, string | string[] | undefined>,
  patch: Record<string, string | null | undefined>
) {
  const sp = new URLSearchParams()

  // copiar actuales
  for (const [k, v] of Object.entries(current)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach((vv) => sp.append(k, vv))
    else sp.set(k, v)
  }

  // aplicar parches
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) sp.delete(k)
    else sp.set(k, v)
  }

  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

function formatCurrency(n: number) {
  try {
    return n.toLocaleString('es-AR')
  } catch {
    return String(n)
  }
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: { categoria: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const raw = await fetchByCategory(params.categoria)

  // ---- Leer filtros de la URL ----
  const order = (searchParams.order as string) || 'recientes'
  const min = Number(searchParams.min ?? '')
  const max = Number(searchParams.max ?? '')
  const sizeFromQP = searchParams.size
  const sizesSelected = Array.isArray(sizeFromQP)
    ? sizeFromQP
    : sizeFromQP
    ? [sizeFromQP]
    : []

  // ---- Aplicar filtros en memoria (ideal para demo) ----
  let items = [...raw]

  if (!Number.isNaN(min)) items = items.filter((p) => p.precio >= min)
  if (!Number.isNaN(max) && max > 0) items = items.filter((p) => p.precio <= max)

  if (sizesSelected.length) {
    items = items.filter((p) =>
      (p.talles ?? []).some((t) => sizesSelected.includes(t))
    )
  }

  if (order === 'precio-asc') items.sort((a, b) => a.precio - b.precio)
  else if (order === 'precio-desc') items.sort((a, b) => b.precio - a.precio)
  else if (order === 'recientes')
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  // ---- UI ----
  const basePath = `/productos/${params.categoria}`
  const TALLE_OPTS = ['XS', 'S', 'M', 'L', 'XL']

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb + header */}
      <nav className="text-sm text-marca-gris/60 mb-2">
        <Link href="/">Inicio</Link> <span>/</span>{' '}
        <Link href="/productos">Productos</Link> <span>/</span>{' '}
        <span className="capitalize">{params.categoria}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-marca-gris capitalize">
          {params.categoria}
        </h1>

        {/* Controles derecha: ocultar filtros + ordenar */}
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={withParams(basePath, searchParams, {
              hide: searchParams.hide ? null : '1',
            })}
            className="underline"
          >
            {searchParams.hide ? 'Mostrar Filtros' : 'Ocultar Filtros'}
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-marca-gris/70">Ordenar por</span>
            <div className="relative">
              <div className="flex rounded-full border border-black/20 overflow-hidden">
                <Link
                  href={withParams(basePath, searchParams, { order: 'recientes' })}
                  className={`px-3 py-1 ${
                    order === 'recientes'
                      ? 'bg-black text-white'
                      : 'hover:bg-black/5'
                  }`}
                >
                  Más reciente
                </Link>
                <Link
                  href={withParams(basePath, searchParams, { order: 'precio-asc' })}
                  className={`px-3 py-1 ${
                    order === 'precio-asc' ? 'bg-black text-white' : 'hover:bg-black/5'
                  }`}
                >
                  Precio ↑
                </Link>
                <Link
                  href={withParams(basePath, searchParams, { order: 'precio-desc' })}
                  className={`px-3 py-1 ${
                    order === 'precio-desc' ? 'bg-black text-white' : 'hover:bg-black/5'
                  }`}
                >
                  Precio ↓
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout: filtros + grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* ----- Sidebar filtros ----- */}
        {!searchParams.hide && (
          <aside className="border-r border-black/10 pr-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-marca-gris">Filtros</h3>
              <Link href={basePath} className="text-sm underline">
                Limpiar filtros
              </Link>
            </div>

            {/* Rango de precio (presets) */}
            <details open className="mb-6">
              <summary className="cursor-pointer font-medium text-marca-gris">
                Precio
              </summary>
              <div className="mt-3 space-y-2">
                <Link
                  href={withParams(basePath, searchParams, { min: null, max: '10000' })}
                  className="block text-sm hover:underline"
                >
                  Hasta $10.000
                </Link>
                <Link
                  href={withParams(basePath, searchParams, { min: '10000', max: '20000' })}
                  className="block text-sm hover:underline"
                >
                  $10.000 – $20.000
                </Link>
                <Link
                  href={withParams(basePath, searchParams, { min: '20000', max: null })}
                  className="block text-sm hover:underline"
                >
                  Más de $20.000
                </Link>
              </div>
            </details>

            {/* Talle */}
            <details open className="mb-6">
              <summary className="cursor-pointer font-medium text-marca-gris">
                Talle
              </summary>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {TALLE_OPTS.map((t) => {
                  const active = sizesSelected.includes(t)
                  return (
                    <Link
                      key={t}
                      href={withParams(basePath, searchParams, {
                        // toggle del talle en el query param (single valor)
                        size: active ? null : t,
                      })}
                      className={`h-9 rounded-md border text-sm flex items-center justify-center
                        ${active ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black'}`}
                    >
                      {t}
                    </Link>
                  )
                })}
              </div>
            </details>
          </aside>
        )}

        {/* ----- Grid ----- */}
        <section>
          <p className="text-sm text-marca-gris/70 mb-4">
            {items.length} producto{items.length === 1 ? '' : 's'}
          </p>

          {items.length === 0 && (
            <p className="text-marca-gris/70">No hay resultados con los filtros aplicados.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {items.map((p) => (
              <Link
                key={p._id}
                href={`/producto/${p.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition"
              >
                <div className="relative w-full aspect-[3/4] bg-[#f5f5f5]">
                  <Image
                    src={p.imagen}
                    alt={p.nombre}
                    fill
                    sizes="(min-width:1280px) 30vw, (min-width:640px) 45vw, 100vw"
                    className="object-cover group-hover:scale-[1.02] transition-transform"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-red-600 font-semibold mb-1">Lo nuevo</p>
                  <h3 className="text-base font-semibold text-marca-gris leading-tight">
                    {p.nombre}
                  </h3>
                  <p className="text-marca-amarillo font-bold text-lg mt-1">
                    ${formatCurrency(p.precio)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
