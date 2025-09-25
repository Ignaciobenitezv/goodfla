"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"

export default function CombosClient({ combos }: { combos: any[] }) {
  const safeCombos = Array.isArray(combos) ? combos : []

  const [sort, setSort] = useState("mas-vendidos")
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(75000)
  const [inStock, setInStock] = useState(false)
  const [view, setView] = useState<"list" | "grid2" | "grid3" | "grid4">("grid3")

  const combosFiltrados = useMemo(() => {
    let data = [...safeCombos]
    data = data.filter((c) => c.precio >= minPrice && c.precio <= maxPrice)
    if (inStock) data = data.filter((c) => c.inStock !== false)

    switch (sort) {
      case "precio-asc":
        data.sort((a, b) => a.precio - b.precio)
        break
      case "precio-desc":
        data.sort((a, b) => b.precio - a.precio)
        break
      case "alfabetico":
        data.sort((a, b) => a.nombre.localeCompare(b.nombre))
        break
      default:
        data.sort((a, b) => (a._createdAt < b._createdAt ? 1 : -1))
    }
    return data
  }, [safeCombos, sort, minPrice, maxPrice, inStock])

  const limpiarFiltros = () => {
    setMinPrice(0)
    setMaxPrice(75000)
    setInStock(false)
  }

  // Clases dinámicas para el grid
  const gridClass =
    view === "list"
      ? "flex flex-col gap-6"
      : view === "grid2"
      ? "grid grid-cols-2 gap-4"
      : view === "grid3"
      ? "grid grid-cols-3 gap-4"
      : "grid grid-cols-4 gap-4"

  // Contenedor de imagen (la tarjeta tendrá el mismo alto)
  const imageWrapClass =
    view === "list"
      ? "relative bg-gray-50 shrink-0 w-36 sm:w-44 lg:w-52 aspect-square rounded-md overflow-hidden"
      : "relative bg-gray-50 w-full aspect-[4/5] rounded-md overflow-hidden"

  const imageSizes =
    view === "list"
      ? "(min-width:1024px) 208px, (min-width:640px) 176px, 144px"
      : "(min-width:1280px) calc((100vw - 250px - 48px)/4), (min-width:1024px) calc((100vw - 250px - 48px)/3), (min-width:640px) calc((100vw - 250px - 32px)/2), 100vw"

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-[250px,1fr] gap-10">
        {/* ==== Sidebar ==== */}
        <aside className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-xl">Filtros</h2>
            <button
              onClick={limpiarFiltros}
              className="text-sm text-gray-600 hover:underline"
            >
              Limpiar todo
            </button>
          </div>

          {/* Disponibilidad */}
          <div>
            <h3 className="font-semibold mb-2">Disponibilidad</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="w-4 h-4 accent-black rounded border-gray-400"
              />
              <span className="text-sm">En existencia</span>
            </label>
          </div>

          {/* Precio */}
          <div>
            <h3 className="font-semibold mb-2">Precio</h3>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={0}
                max={75000}
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value))}
                className="w-full accent-black"
              />
              <input
                type="range"
                min={0}
                max={75000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>${minPrice}</span>
                <span>${maxPrice}</span>
              </div>
            </div>
          </div>

          {/* Tipo de producto */}
          <div>
            <h3 className="font-semibold mb-2">Tipo de producto</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-black rounded border-gray-400"
              />
              <span className="text-sm">Producto</span>
            </label>
          </div>
        </aside>

        {/* ==== Main productos ==== */}
        <section>
          {/* Barra superior */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ordenar por:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border rounded px-2 py-1 text-sm focus:outline-none"
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
                className={`p-2 border rounded text-sm ${
                  view === "list" ? "bg-black text-white" : "bg-white text-gray-600"
                }`}
                title="Lista"
              >
                📋
              </button>
              <button
                onClick={() => setView("grid2")}
                className={`p-2 border rounded text-sm ${
                  view === "grid2" ? "bg-black text-white" : "bg-white text-gray-600"
                }`}
                title="2 columnas"
              >
                ▭▭
              </button>
              <button
                onClick={() => setView("grid3")}
                className={`p-2 border rounded text-sm ${
                  view === "grid3" ? "bg-black text-white" : "bg-white text-gray-600"
                }`}
                title="3 columnas"
              >
                ▭▭▭
              </button>
              <button
                onClick={() => setView("grid4")}
                className={`p-2 border rounded text-sm ${
                  view === "grid4" ? "bg-black text-white" : "bg-white text-gray-600"
                }`}
                title="4 columnas"
              >
                ▭▭▭▭
              </button>
            </div>
          </div>

          {/* Lista productos */}
          {combosFiltrados.length === 0 && (
            <p className="text-gray-600">No se encontraron combos.</p>
          )}

          <div className={gridClass}>
  {combosFiltrados.map((combo: any) => (
    <Link
      key={combo._id}
      href={`/combo/${combo.slug}`}
      className="block shadow hover:shadow-lg transition rounded-2xl overflow-hidden bg-white"
    >
      {/* Imagen: ahora ocupa TODO el ancho y alto de la tarjeta */}
      <div className="relative w-full aspect-[4/5]">
        {combo.imagen ? (
          <Image
            src={combo.imagen}
            alt={combo.nombre}
            fill
            sizes={imageSizes}
            className="object-cover"  // 👈 clave para que rellene sin bordes
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Sin imagen
          </span>
        )}
      </div>

      {/* Texto debajo */}
      <div className="p-4">
        <h2 className="font-semibold text-base">{combo.nombre}</h2>
        <p className="text-red-600 font-bold text-lg">
          ${combo.precio.toLocaleString("es-AR")}
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
