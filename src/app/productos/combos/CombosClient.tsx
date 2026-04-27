"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import SectionTitle from "@/components/SectionTitle" // ajustá la ruta si es distinta
import { List, LayoutGrid, Grid3X3, Grid2X2 } from "lucide-react"

const BADGE_MAP: Record<string, string> = {
  MAS_VENDIDO: "MÁS VENDIDO",
  NUEVO: "NUEVO",
  OFERTA: "OFERTA",
  LIMITADA: "EDICIÓN LIMITADA",
  ULTIMAS: "ÚLTIMAS UNIDADES",
  NONE: "",
}



export default function CombosClient({
  combos,
  basePath = "/combo",
  mode = "combo",
}: {
  combos: any[]
  basePath?: string
  mode?: "combo" | "individual" | "mayorista"
}) {
  const safeCombos = Array.isArray(combos) ? combos : []

  const [sort, setSort] = useState("manual")
  const [minPrice, setMinPrice] = useState(0)

  const priceMaxFromData = useMemo(
    () => Math.max(0, ...safeCombos.map((c) => Number(c.precio) || 0)),
    [safeCombos]
  )
  const [maxPrice, setMaxPrice] = useState<number>(priceMaxFromData)

  useEffect(() => {
    setMaxPrice((prev) => {
      if (!prev) return priceMaxFromData
      return Math.max(prev, priceMaxFromData)
    })
  }, [priceMaxFromData])

  const [inStock, setInStock] = useState(false)
  const [view, setView] = useState<"list" | "grid2" | "grid3" | "grid4">("grid3")

  // Mostrar / ocultar filtros en MOBILE (acordeón)
  const [showMobileFilters, setShowMobileFilters] = useState(false)


  /* 🔒 Sync de vista para mobile */
useEffect(() => {
  const syncViewForMobile = () => {
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile && (view === "grid3" || view === "grid4")) {
      setView("grid2")
    }
  }

  syncViewForMobile()
  window.addEventListener("resize", syncViewForMobile)
  return () => window.removeEventListener("resize", syncViewForMobile)
}, [view])

  const combosFiltrados = useMemo(() => {
    let data = [...safeCombos]

    data = data.filter((c) => {
      const p = Number(c.precio ?? c.precioActual ?? 0)
      if (!Number.isFinite(p)) return true
      return p >= minPrice && p <= maxPrice
    })

    if (inStock) data = data.filter((c) => c.inStock !== false)

    switch (sort) {
      case "manual":
        break
      case "precio-asc":
        data.sort(
          (a, b) => (Number(a.precio ?? a.precioActual) || Infinity) - (Number(b.precio ?? b.precioActual) || Infinity)

        )
        break
      case "precio-desc":
        data.sort(
          (a, b) => (Number(b.precio ?? b.precioActual) || -Infinity) - (Number(a.precio ?? a.precioActual) || -Infinity)

        )
        break
      case "alfabetico":
        data.sort((a, b) =>
          String(a.nombre || "").localeCompare(String(b.nombre || ""))
        )
        break
      case "nuevos":
        data.sort((a, b) => (a._createdAt < b._createdAt ? 1 : -1))
        break
      default:
        data.sort((a, b) => (a._createdAt < b._createdAt ? 1 : -1))
    }
    return data
  }, [safeCombos, sort, minPrice, maxPrice, inStock])

  const limpiarFiltros = () => {
    setMinPrice(0)
    setMaxPrice(priceMaxFromData)
    setInStock(false)
  }

 const gridClass =
  view === "list"
    ? "flex flex-col gap-6"
    : view === "grid2"
    ? "grid grid-cols-2 gap-4"
    : view === "grid3"
    ? "grid grid-cols-2 sm:grid-cols-3 gap-4 items-stretch"
    : "grid grid-cols-2 sm:grid-cols-4 gap-4"


  const imageSizes =
    view === "list"
      ? "(min-width:1024px) 208px, (min-width:640px) 176px, 144px"
      : "(min-width:1280px) calc((100vw - 250px - 48px)/4), (min-width:1024px) calc((100vw - 250px - 48px)/3), (min-width:640px) calc((100vw - 250px - 32px)/2), 100vw"

  return (
    <div className="min-h-screen bg-white py-10">
      <main className="max-w-[1400px] mx-auto px-4 mt-20">
        <SectionTitle basePath={basePath} />
        {/* BOTÓN FILTROS SOLO MOBILE */}
        <div className="md:hidden flex justify-end mb-3">
          <button
            onClick={() => setShowMobileFilters((v) => !v)}
            className="px-4 py-2 rounded-xl bg-white shadow-md border border-slate-200 text-sm font-medium text-slate-800"
          >
            {showMobileFilters ? "Ocultar filtros" : "Filtrar por"}
          </button>
        </div>

        {/* PANEL DE FILTROS MOBILE EN ACORDEÓN */}
        {showMobileFilters && (
          <div className="md:hidden mb-6 rounded-2xl bg-white/90 backdrop-blur-lg border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.18)] p-6">
            {/* Header filtros mobile */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  Filtrar por
                </p>
                <h2 className="mt-1 font-semibold text-lg text-slate-900">
                  Preferencias
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ajustá la vista para encontrar el combo ideal.
                </p>
              </div>
              <button
                onClick={limpiarFiltros}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Limpiar
              </button>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-4" />

            {/* Disponibilidad */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Disponibilidad
              </h3>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm text-slate-800">
                  Mostrar solo productos en stock
                </span>

                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-300 peer-checked:bg-emerald-500 transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transform peer-checked:translate-x-5 transition-transform" />
                </span>
              </label>
            </div>

            {/* Precio */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rango de precio
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Deslizá para ajustar el mínimo y máximo.
                  </p>
                </div>
                <div className="flex flex-col items-end text-[11px] text-slate-600">
                  <span>Mín: ${minPrice.toLocaleString("es-AR")}</span>
                  <span>Máx: ${maxPrice.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <input
                    type="range"
                    min={0}
                    max={priceMaxFromData}
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full accent-black"
                  />
                  <input
                    type="range"
                    min={0}
                    max={priceMaxFromData}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-black"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(0)
                      setMaxPrice(priceMaxFromData)
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(0)
                      setMaxPrice(Math.round(priceMaxFromData * 0.5))
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Más económicos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(Math.round(priceMaxFromData * 0.5))
                      setMaxPrice(priceMaxFromData)
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Premium
                  </button>
                </div>
              </div>
            </div>

            {/* Tipo de producto */}
            <div className="space-y-3 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo de producto
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 hover:border-slate-400 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-black rounded border-gray-400"
                  />
                  <span>Producto</span>
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowMobileFilters(false)}
              className="w-full mt-1 py-3 rounded-xl bg-black text-white text-sm font-medium"
            >
              Aplicar filtros
            </button>
          </div>
        )}

        {/* GRID PRINCIPAL (sidebar + productos) */}
        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-10">
          {/* ==== SIDEBAR DESKTOP ==== */}
          <aside className="hidden md:block space-y-8 p-6 rounded-2xl bg-white/70 backdrop-blur-lg border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  Filtrar por
                </p>
                <h2 className="mt-1 font-semibold text-lg text-slate-900">
                  Preferencias
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ajustá la vista para encontrar el combo ideal.
                </p>
              </div>
              <button
                onClick={limpiarFiltros}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Limpiar todo
              </button>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Disponibilidad */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Disponibilidad
              </h3>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm text-slate-800">
                  Mostrar solo productos en stock
                </span>

                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="w-10 h-5 rounded-full bg-slate-300 peer-checked:bg-emerald-500 transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transform peer-checked:translate-x-5 transition-transform" />
                </span>
              </label>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Precio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rango de precio
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Deslizá para ajustar el mínimo y máximo.
                  </p>
                </div>
                <div className="flex flex-col items-end text-[11px] text-slate-600">
                  <span>Mín: ${minPrice.toLocaleString("es-AR")}</span>
                  <span>Máx: ${maxPrice.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <input
                    type="range"
                    min={0}
                    max={priceMaxFromData}
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full accent-black"
                  />
                  <input
                    type="range"
                    min={0}
                    max={priceMaxFromData}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-black"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(0)
                      setMaxPrice(priceMaxFromData)
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(0)
                      setMaxPrice(Math.round(priceMaxFromData * 0.5))
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Más económicos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(Math.round(priceMaxFromData * 0.5))
                      setMaxPrice(priceMaxFromData)
                    }}
                    className="px-3 py-1 rounded-full text-[11px] border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-600 hover:text-slate-900"
                  >
                    Premium
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Tipo de producto */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo de producto
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 hover:border-slate-400 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-black rounded border-gray-400"
                  />
                  <span>Producto</span>
                </label>
              </div>
            </div>
          </aside>

          {/* ==== PRODUCTOS ==== */}
          <section>
            {/* Barra superior productos */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Ordenar por:
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-marca-crema/60 bg-white/80"
                >
                  <option value="manual">Destacados</option>
                  <option value="nuevos">Más nuevos</option>
                  <option value="precio-asc">Precio: Menor a mayor</option>
                  <option value="precio-desc">Precio: Mayor a menor</option>
                  <option value="alfabetico">Alfabéticamente</option>
                </select>
              </div>

            <div className="flex items-center gap-2">
  <button
    onClick={() => setView("list")}
    className={`p-2 rounded-md transition-colors ${
      view === "list"
        ? "bg-black text-white"
        : "text-slate-500 hover:text-black"
    }`}
    title="Lista"
    aria-label="Vista lista"
    type="button"
  >
    <List size={18} />
  </button>

  <button
    onClick={() => setView("grid2")}
    className={`p-2 rounded-md transition-colors ${
      view === "grid2"
        ? "bg-black text-white"
        : "text-slate-500 hover:text-black"
    }`}
    title="2 columnas"
    aria-label="Vista 2 columnas"
    type="button"
  >
    <LayoutGrid size={18} />
  </button>

  {/* Solo desktop (sm+) */}
  <button
    onClick={() => setView("grid3")}
    className={`hidden sm:inline-flex p-2 rounded-md transition-colors ${
      view === "grid3"
        ? "bg-black text-white"
        : "text-slate-500 hover:text-black"
    }`}
    title="3 columnas"
    aria-label="Vista 3 columnas"
    type="button"
  >
    <Grid3X3 size={18} />
  </button>

  {/* Solo desktop (sm+) */}
  <button
    onClick={() => setView("grid4")}
    className={`hidden sm:inline-flex p-2 rounded-md transition-colors ${
      view === "grid4"
        ? "bg-black text-white"
        : "text-slate-500 hover:text-black"
    }`}
    title="4 columnas"
    aria-label="Vista 4 columnas"
    type="button"
  >
    <Grid2X2 size={18} />
  </button>
</div>

</div>


            {combosFiltrados.length === 0 && (
              <p className="text-gray-600">No se encontraron resultados.</p>
            )}

            <div className={gridClass}>
 {combosFiltrados.map((combo: any) => {
 
    const precio = Number(combo.precio ?? combo.precioActual ?? 0)
  const precioViejo = Number(combo.precioAnterior ?? combo.precioAntes ?? 0)

  const cuotaTexto = (precio / 3).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

 
  const precioTexto = precio.toLocaleString("es-AR")
  const precioViejoTexto = precioViejo.toLocaleString("es-AR")

  const packQty =
    Array.isArray(combo.categoriasIncluidas) && combo.categoriasIncluidas.length > 0
      ? combo.categoriasIncluidas.reduce(
          (acc: number, item: any) => acc + (Number(item?.cantidad) || 0),
          0
        )
      : 1

  const showPackPrice = packQty > 1
  
  const rating = Math.max(0, Math.min(5, Number(combo.rating ?? 0)))   
   const votes = Math.max(0, Number(combo.ratingCount ?? 0))
    const envioGratis = combo.envioGratis === true

    const badgeCode = String(combo.badge ?? "NONE").trim()
const badgeText = BADGE_MAP[badgeCode] ?? ""



    const isDark = false

    return (
      <Link
        key={combo._id}
        href={`${basePath}/${combo.slug}`}
        className="group block bg-transparent text-zinc-900 flex flex-col h-full"
      >
        {/* Imagen */}
        <div className="relative w-full aspect-[4/5] overflow-hidden bg-transparent">
          {combo.imagen ? (
            <Image
              src={combo.imagen}
              alt={combo.nombre}
              fill
              sizes={imageSizes}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Sin imagen
            </span>
          )}

          {/* ENVÍO GRATIS */}
          {envioGratis ? (
            <div className="absolute left-4 top-4 z-10">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border shadow-sm bg-white text-zinc-900 border-zinc-200">
                🚚 GRATIS
              </span>
            </div>
          ) : null}
        </div>

        {/* Contenido */}
        <div className="px-3 pb-3 flex flex-col flex-1">
          {/* BADGE */}
          <div className="mt-2 min-h-[28px]">
            {badgeText ? (
              <span className="inline-flex rounded px-2 py-1 text-[11px] font-bold bg-marca-amarillo text-black">
                {badgeText}
              </span>
            ) : null}
          </div>

          {/* Título */}
          <h3 className="mt-2 text-[14px] sm:text-[20px] leading-snug font-bold text-zinc-900 line-clamp-2 min-h-[38px]">
  {combo.nombre}
</h3>

          {/* Rating */}
          {(rating > 0 || votes > 0) ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-center leading-none">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const filled = idx < Math.round(rating)
                  return (
                    <span
                      key={idx}
                      className={filled ? "text-[26px] text-amber-400" : "text-[16px] text-zinc-300"}
                    >
                      ★
                    </span>
                  )
                })}
              </div>

              {votes > 0 ? <span className="text-[18px] text-zinc-500">({votes})</span> : null}
            </div>
          ) : null}

         {/* Precio */}
<div className="mt-2 min-h-[150px] space-y-2">
  {showPackPrice && (
    <div className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-2.5 py-1">
      <p className="text-[16px] sm:text-[24px] font-extrabold text-red-600 leading-none">
        {packQty} pares por
      </p>
    </div>
  )}

  {precioViejo > 0 && (
    <p className="text-[13px] sm:text-[20px] text-zinc-400 line-through font-medium">
  ${precioViejoTexto} ARS
</p>
  )}



  {/* 🔽 PRECIO SECUNDARIO */}
 <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
    Precio final
  </p>

  <p className="mt-1 text-[28px] sm:text-[32px] font-black leading-none tracking-tight text-emerald-700">
    ${precioTexto}
  </p>

  {mode !== "mayorista" && (
    <p className="mt-2 inline-flex rounded-full bg-red-600 px-3 py-1 text-[12px] sm:text-[13px] font-bold text-white">
      3 cuotas sin interés de ${cuotaTexto}
    </p>
  )}
</div>

  

  
</div>

          {/* Botón */}
          <div className="mt-auto pt-3">
            <span className="inline-flex w-full justify-center rounded-full bg-marca-amarillo text-black font-semibold py-2 text-[14px] transition-colors hover:bg-marca-amarillo/50">
              Comprar
            </span>
          </div>
        </div>
      </Link>
    )
  })}
</div>


          </section>
        </div>
      </main>
    </div>
  )
}
