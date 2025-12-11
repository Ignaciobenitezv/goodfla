"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import SectionTitle from "@/components/SectionTitle" // ajustá la ruta si es distinta


export default function CombosClient({
  combos,
  basePath = "/combo",
}: {
  combos: any[]
  basePath?: string
}) {
  const safeCombos = Array.isArray(combos) ? combos : []

  const [sort, setSort] = useState("mas-vendidos")
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

  const combosFiltrados = useMemo(() => {
    let data = [...safeCombos]

    data = data.filter((c) => {
      const p = Number(c.precio)
      if (!Number.isFinite(p)) return true
      return p >= minPrice && p <= maxPrice
    })

    if (inStock) data = data.filter((c) => c.inStock !== false)

    switch (sort) {
      case "precio-asc":
        data.sort(
          (a, b) => (Number(a.precio) || Infinity) - (Number(b.precio) || Infinity)
        )
        break
      case "precio-desc":
        data.sort(
          (a, b) => (Number(b.precio) || -Infinity) - (Number(a.preccio) || -Infinity)
        )
        break
      case "alfabetico":
        data.sort((a, b) =>
          String(a.nombre || "").localeCompare(String(b.nombre || ""))
        )
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
      ? "grid grid-cols-3 gap-4"
      : "grid grid-cols-4 gap-4"

  const imageSizes =
    view === "list"
      ? "(min-width:1024px) 208px, (min-width:640px) 176px, 144px"
      : "(min-width:1280px) calc((100vw - 250px - 48px)/4), (min-width:1024px) calc((100vw - 250px - 48px)/3), (min-width:640px) calc((100vw - 250px - 32px)/2), 100vw"

  return (
    <div className="min-h-screen bg-slate-200 py-10">
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
                  <option value="mas-vendidos">Más vendidos</option>
                  <option value="precio-asc">Precio: Menor a mayor</option>
                  <option value="precio-desc">Precio: Mayor a menor</option>
                  <option value="alfabetico">Alfabéticamente</option>
                </select>
              </div>

              {/* Botones vista */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView("list")}
                  className={`p-2 border rounded-md text-sm shadow-sm bg-white/80 ${
                    view === "list"
                      ? "border-marca-crema ring-1 ring-marca-crema/50"
                      : "border-slate-200 text-gray-600"
                  }`}
                  title="Lista"
                  aria-label="Vista lista"
                >
                  <Image
                    src="/g1.png"
                    alt="Lista"
                    width={18}
                    height={18}
                    className="pointer-events-none select-none"
                  />
                </button>

                <button
                  onClick={() => setView("grid2")}
                  className={`p-2 border rounded-md text-sm shadow-sm bg-white/80 ${
                    view === "grid2"
                      ? "border-marca-crema ring-1 ring-marca-crema/50"
                      : "border-slate-200 text-gray-600"
                  }`}
                  title="2 columnas"
                  aria-label="Vista 2 columnas"
                >
                  <Image
                    src="/g2.png"
                    alt="2 columnas"
                    width={18}
                    height={18}
                    className="pointer-events-none select-none"
                  />
                </button>

                <button
                  onClick={() => setView("grid3")}
                  className={`p-2 border rounded-md text-sm shadow-sm bg-white/80 ${
                    view === "grid3"
                      ? "border-marca-crema ring-1 ring-marca-crema/50"
                      : "border-slate-200 text-gray-600"
                  }`}
                  title="3 columnas"
                  aria-label="Vista 3 columnas"
                >
                  <Image
                    src="/g3.png"
                    alt="3 columnas"
                    width={18}
                    height={18}
                    className="pointer-events-none select-none"
                  />
                </button>

                <button
                  onClick={() => setView("grid4")}
                  className={`p-2 border rounded-md text-sm shadow-sm bg-white/80 ${
                    view === "grid4"
                      ? "border-marca-crema ring-1 ring-marca-crema/50"
                      : "border-slate-200 text-gray-600"
                  }`}
                  title="4 columnas"
                  aria-label="Vista 4 columnas"
                >
                  <Image
                    src="/g4.png"
                    alt="4 columnas"
                    width={18}
                    height={18}
                    className="pointer-events-none select-none"
                  />
                </button>
              </div>
            </div>

            {combosFiltrados.length === 0 && (
              <p className="text-gray-600">No se encontraron resultados.</p>
            )}

            <div className={gridClass}>
              {combosFiltrados.map((combo: any) => (
                <Link
                  key={combo._id}
                  href={`${basePath}/${combo.slug}`}
                  className="
                    group
                    block 
                    rounded-2xl 
                    overflow-hidden 
                    bg-white/70 
                    backdrop-blur-xl 
                    border border-white/20 
                    shadow-[0_18px_45px_rgba(0,0,0,0.15)]
                    transition-transform duration-300 
                    hover:-translate-y-1 
                    hover:shadow-[0_24px_60px_rgba(0,0,0,0.25)]
                  "
                >
                  <div className="relative w-full aspect-[4/5] bg-black/10 overflow-hidden">
                    {combo.imagen ? (
                      <Image
                        src={combo.imagen}
                        alt={combo.nombre}
                        fill
                        sizes={imageSizes}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        Sin imagen
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="font-semibold text-base text-slate-900">
                      {combo.nombre}
                    </h2>
                    {typeof combo.precio === "number" ? (
                      <p className="text-red-600 font-bold text-lg">
                        ${combo.precio.toLocaleString("es-AR")}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-sm">Consultar precio</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
