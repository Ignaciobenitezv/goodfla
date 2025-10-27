"use client"

import { useState } from "react"
import Image from "next/image"
import { FiInfo } from "react-icons/fi"
import ZoomImage from "./ZoomImage"
import GuiaDeTallesTabs from "./GuiaDeTallesTabs"
import ServiciosDiferencia from "./ServiciosDiferencia"
import AccordionInfo from "./AccordionInfo"
import Modal from "@/components/Modal"
import { useCart } from "@/context/CartContext"

type Talle = { label: string; stock: number }

type ProductoBase = {
  _id?: string
  nombre: string
  precio: number
  descripcion?: string
  galeria?: string[]
  talles?: Talle[]
  composicion?: string
  slug?: string

  // 👇 extra de producto para “combo”
  esCombo?: boolean
  comboCantidad?: number // ej: 2 para 2x1
}

type PDPZapatillasProps = {
  producto: ProductoBase
  /**
   * Para el modo combo: catálogo de zapatillas a mostrar en el modal.
   * Si no se pasa o está vacío, se muestra aviso.
   */
  productosZapatillas?: Array<{
    _id: string
    nombre: string
    precio?: number
    imagen?: string
    galeria?: string[]
    slug?: string
    talles?: Talle[]
    colores?: string[]
  }>
}

type DraftSelections = Record<string, { talle?: string; color?: string }>

export default function PDPZapatillas({
  producto,
  productosZapatillas = [],
}: PDPZapatillasProps) {
  const galeria =
    producto.galeria && producto.galeria.length > 0 ? producto.galeria : ["/placeholder.jpg"]

  const [imagenActiva, setImagenActiva] = useState(galeria[0])
  const [cantidad, setCantidad] = useState(1)
  const [openModalTalles, setOpenModalTalles] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [talleSeleccionado, setTalleSeleccionado] = useState<Talle | null>(null)

  // 🔸 estado para MODO COMBO
  const esCombo = producto.esCombo === true && (producto.comboCantidad ?? 0) >= 2
  const slots = esCombo ? Math.max(2, Number(producto.comboCantidad)) : 0
  const [selected, setSelected] = useState<any[]>(Array.from({ length: slots }).map(() => null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftSelections>({})

  const { addItem, items } = useCart()

  // ====== UTILIDADES COMUNES ======
  const carritoActual = items.find(
    (i) => i.id === (producto._id || producto.nombre) && i.talle === talleSeleccionado?.label
  )
  const stockRestante = talleSeleccionado
    ? talleSeleccionado.stock - (carritoActual?.cantidad || 0)
    : 0

  const handleCantidad = (n: number) => {
    if (!talleSeleccionado) return
    const nueva = cantidad + n
    if (nueva >= 1 && nueva <= stockRestante) setCantidad(nueva)
  }

  const handleAddToCartSimple = () => {
    if (!talleSeleccionado) {
      alert("⚠️ Seleccioná un talle antes de agregar al carrito.")
      return
    }
    if (cantidad > stockRestante) {
      alert("❌ No hay stock suficiente")
      return
    }
    addItem({
      id: producto._id || producto.nombre,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      imagen: galeria[0] || "/placeholder.jpg",
      slug: producto.slug,
      talle: talleSeleccionado.label,
    })
    alert("✅ Producto añadido al carrito")
  }

  // ====== MODO COMBO (2x1, 3x1, …) ======
  const setDraftValue = (prodId: string, key: "talle" | "color", value: string) =>
    setDraft((d) => ({ ...d, [prodId]: { ...(d[prodId] || {}), [key]: value } }))

  const normalizeSizes = (raw: any): { label: string; stock?: number }[] => {
    if (!raw) return []
    if (Array.isArray(raw))
      return raw.map((t) => (typeof t === "string" ? { label: t } : { label: t.label, stock: t.stock }))
    return []
  }

  const getStockRestante = (prod: any, talle?: string) => {
    const sizes = normalizeSizes(prod.talles)
    if (!sizes.length) return 1
    const t = sizes.find((x) => x.label === talle)
    if (!t) return 0
    const enCarrito = items.find((i) => i.id.startsWith(prod._id) && i.talle === talle)
    return (t.stock ?? 0) - (enCarrito?.cantidad || 0)
  }

  const handleAddToSlot = (slotIndex: number, prod: any) => {
    const d = draft[prod._id] || {}
    const sizeOptions = normalizeSizes(prod.talles)

    if (sizeOptions.length && !d.talle) {
      alert("Seleccioná un talle antes de agregar.")
      return
    }
    if (d.talle && getStockRestante(prod, d.talle) <= 0) {
      alert("❌ No hay stock disponible para este talle.")
      return
    }

    const nuevos = [...selected]
    nuevos[slotIndex] = { ...prod, talle: d.talle || null }
    setSelected(nuevos)
    setActiveSlot(null)
  }

  const allSelected = esCombo ? selected.every(Boolean) : false
  const allWithStock = allSelected
    ? selected.every((prod: any) => (prod.talle ? getStockRestante(prod, prod.talle) > 0 : true))
    : false

  const handleAddToCartCombo = () => {
    if (!esCombo) return
    if (!allWithStock) {
      alert("❌ Faltan completar selecciones o no hay stock suficiente.")
      return
    }
    const itemsCombo = selected.filter(Boolean)
    itemsCombo.forEach((prod: any, idx: number) => {
      addItem({
        id: `${prod._id || prod.nombre}-${prod.talle || idx}`,
        nombre: `${prod.nombre}${prod.talle ? ` (Talle ${prod.talle})` : ""}`,
        // 👉 repartimos el precio total en partes iguales
        precio: producto.precio / itemsCombo.length,
        cantidad: 1,
        imagen: prod.imagen || "/placeholder.png",
        talle: prod.talle || null,
      })
    })
    alert("✅ Combo añadido al carrito")
  }

  // ====== RENDER ======
  return (
    <>
      <main className="max-w-[1300px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-base leading-relaxed">
        {/* GALERÍA IZQ. (igual para ambos modos) */}
        <div className="flex flex-col h-full">
          <div className="sticky top-24">
            <div className="flex gap-6">
              {/* Miniaturas */}
              <div className="flex flex-col gap-3 w-24">
                {galeria.map((img, i) => (
                  <button
                    type="button"
                    key={`${producto._id || producto.nombre}-img-${i}`}
                    onClick={() => setImagenActiva(img)}
                    className={`border rounded-md overflow-hidden ${imagenActiva === img ? "ring-2 ring-black" : ""}`}
                  >
                    <Image src={img} alt={`${producto.nombre} ${i + 1}`} width={90} height={120} className="object-cover" />
                  </button>
                ))}
              </div>

              {/* Imagen principal */}
              <div className="flex-1 flex items-start justify-center">
                <div className="overflow-hidden rounded-md cursor-zoom-in" onClick={() => setZoomOpen(true)}>
                  <Image
                    src={imagenActiva}
                    alt={producto.nombre}
                    width={600}
                    height={800}
                    className="object-cover transition-transform duration-500 ease-in-out hover:scale-110"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DERECHA */}
        <div className="flex flex-col h-full space-y-8">
          <div>
            <h1 className="text-4xl font-semibold">{producto.nombre}</h1>
            <p className="text-3xl font-bold mt-2">
              ${producto.precio.toLocaleString("es-AR")}
            </p>
          </div>

          {/* Guía de talles (se deja visible en ambos modos, por si las zapas usan talles) */}
          <button className="flex items-center gap-2 underline text-lg text-gray-700" onClick={() => setOpenModalTalles(true)}>
            <FiInfo /> GUIA DE TALLES
          </button>

          {/* ========= MODO COMBO ========= */}
          {esCombo ? (
            <>
              {/* Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[800px]">
                {selected.map((sel, i) => (
                  <div
                    key={`slot-${i}`}
                    className="border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-black transition"
                    onClick={() => setActiveSlot(i)}
                  >
                    {sel ? (
                      <div className="relative w-full h-full flex flex-col">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const copia = [...selected]
                            copia[i] = null
                            setSelected(copia)
                          }}
                          className="absolute top-2 right-2 z-10 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                        <div className="relative flex-1 aspect-square bg-white rounded-lg">
                          <Image src={sel.imagen || "/placeholder.png"} alt={sel.nombre} fill className="object-cover" />
                        </div>
                        <div className="w-full bg-gray-100 text-center py-1 mt-1 rounded">
                          <span className="text-sm font-bold">{sel.talle || "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-500">+</span>
                        <span className="text-xs text-gray-500 text-center">Agregar Zapatillas {i + 1}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón carrito para combo */}
              <button
                disabled={!allWithStock}
                onClick={handleAddToCartCombo}
                className={`w-full mt-6 py-4 rounded-md font-medium text-lg text-white ${
                  allWithStock ? "bg-black hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                AÑADIR AL CARRITO
              </button>
            </>
          ) : (
            /* ========= MODO SIMPLE (lo que ya tenías) ========= */
            <>
              {/* Talles */}
              {producto.talles && producto.talles.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-lg">Talle:</h3>
                  <div className="flex gap-2 flex-wrap">
                    {producto.talles.map((t, i) => (
                      <button
                        type="button"
                        key={`${producto._id || producto.nombre}-talle-${t.label}-${i}`}
                        disabled={t.stock <= 0}
                        onClick={() => {
                          setTalleSeleccionado(t)
                          setCantidad(1)
                        }}
                        className={`px-6 py-2 border rounded-md text-base transition-colors ${
                          talleSeleccionado?.label === t.label ? "bg-black text-white border-black" : "hover:bg-black hover:text-white"
                        } ${t.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {talleSeleccionado && (
                    <p className="mt-2 text-gray-600 text-sm">Stock disponible: {stockRestante}</p>
                  )}
                </div>
              )}

              {/* Cantidad */}
              <div>
                <h3 className="font-medium mb-2 text-lg">Cantidad</h3>
                <div className="flex items-center border rounded-md w-48">
                  <button onClick={() => handleCantidad(-1)} disabled={cantidad <= 1} className="px-4 py-2 text-xl">–</button>
                  <span className="flex-1 text-center">{cantidad}</span>
                  <button
                    onClick={() => handleCantidad(1)}
                    disabled={!talleSeleccionado || cantidad >= stockRestante}
                    className="px-4 py-2 text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botón carrito simple */}
              <button
                onClick={handleAddToCartSimple}
                disabled={!talleSeleccionado || stockRestante <= 0}
                className="w-full bg-black text-white py-4 rounded-md font-medium text-lg disabled:bg-gray-400"
              >
                Añadir al carrito
              </button>
            </>
          )}

          {/* Info extra (igual) */}
          <div className="text-gray-700 space-y-2">
            <p><strong>IMPORTANTE!</strong> Calcula los tiempos estimados de despacho y entrega ✨</p>
            <div className="flex items-center">
              <input type="text" placeholder="Ingresa tu código postal" className="border px-3 py-2 rounded-md text-base w-64" />
              <button className="ml-2 bg-gray-900 text-white px-4 py-2 rounded-md text-base">Calcular</button>
            </div>
            <div className="pt-2">
              <p>Métodos de pago y envío, con devolución dentro de 30 días</p>
            </div>
          </div>

          {producto.descripcion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Descripción:</h3>
              <p>{producto.descripcion}</p>
            </div>
          )}

          <AccordionInfo
            sections={[
              {
                title: "Origen y Cuidados",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p><strong>Origen</strong></p>
                    <p>
                      Nuestras prendas son 100% argentinas tanto en su materia prima como en su elaboración artesanal.
                      Creemos en el valor de lo hecho a mano, y al no ser un proceso mecanizado,
                      cada prenda puede contar con pequeñas diferencias o imperfecciones.
                    </p>
                    <p><strong>Cuidados*</strong></p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Lavado a máquina en agua fría (máx. 30ºC), del revés.</li>
                      <li>Secado al aire libre; evitar la secadora.</li>
                      <li>Plancha a baja temperatura (máx. 110ºC), del revés.</li>
                      <li>No usar lavandina ni cloro.</li>
                      <li>Lavar con colores similares; evitar limpieza en seco.</li>
                    </ul>
                  </div>
                ),
              },
              {
                title: "Retiros y Envios",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p>Enviamos a todo el país excepto Tierra del Fuego.</p>
                    <p>Nuestros tiempos de despacho son de 48hs a 72hs hábiles luego de acreditado el pago.</p>
                    <p><strong>Tipos de envío:</strong></p>
                    <p><strong>Retiros</strong>: Retiro en Resistencia, Chaco.</p>
                  </div>
                ),
              },
              {
                title: "Cambios y Devoluciones",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p>Tenés hasta 30 días desde la recepción del pedido para solicitar un cambio o devolución.</p>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* ===== Modal guía de talles ===== */}
        <GuiaDeTallesTabs abierto={openModalTalles} onClose={() => setOpenModalTalles(false)} imagen={imagenActiva} />
      </main>

      <ServiciosDiferencia />

      {/* ===== Modal selección para MODO COMBO ===== */}
      {esCombo && activeSlot !== null && (
        <Modal onClose={() => setActiveSlot(null)}>
          {productosZapatillas.length === 0 ? (
            <p className="p-4 text-center text-gray-600">No hay zapatillas para seleccionar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-2">
              {productosZapatillas.map((prod) => {
                const sizeOptions = normalizeSizes(prod.talles)
                const d = draft[prod._id] || {}
                return (
                  <div key={prod._id} className="flex flex-col rounded-xl border p-3 bg-white min-h-[360px]">
                    <div className="relative w-full aspect-square bg-gray-50 rounded-md overflow-hidden mb-3">
                      <Image src={prod.imagen || "/placeholder.png"} alt={prod.nombre} fill className="object-contain" sizes="200px" />
                    </div>
                    <p className="font-semibold text-sm mb-2 min-h-[20px] text-center">{prod.nombre}</p>

                    {sizeOptions.length > 0 && (
                      <select
                        className="border rounded p-1 text-sm mb-3 w-full"
                        value={d.talle || ""}
                        onChange={(e) => setDraftValue(prod._id, "talle", e.target.value)}
                      >
                        <option value="">Seleccionar talle</option>
                        {sizeOptions.map((t) => (
                          <option key={t.label} value={t.label} disabled={getStockRestante(prod, t.label) <= 0}>
                            {t.label} {getStockRestante(prod, t.label) <= 0 ? "(Sin stock)" : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    <button className="mt-auto bg-black text-white px-3 py-2 rounded w-full"
                      onClick={() => handleAddToSlot(activeSlot, prod)}>
                      Agregar al combo
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* ===== Modal zoom ===== */}
      {zoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setZoomOpen(false)}>
          <div className="relative bg-white rounded-lg p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomOpen(false)} className="absolute top-2 right-2 text-black text-2xl">×</button>
            <ZoomImage src={imagenActiva} alt={producto.nombre} width={500} height={700} zoom={2.5} lens={200} />
          </div>
        </div>
      )}
    </>
  )
}
