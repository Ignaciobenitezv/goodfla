// src/components/PDPComboDetalle.tsx
"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import Modal from "@/components/Modal"
import ServiciosDiferencia from "@/components/ServiciosDiferencia"
import AccordionInfo from "@/components/AccordionInfo"
import ZoomImage from "./ZoomImage"
import { useCart } from "@/context/CartContext"
import { useUi } from "@/context/UiContext"

interface PDPComboDetalleProps {
  combo: any
  productosPorCategoria: Record<string, any[]>
}

interface PDPComboDetalleProps {
  combo: any
  productosPorCategoria: Record<string, any[]>
}

// 🔹 helper para detectar videos
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)$/i.test(url)

type DraftSelections = Record<string, { talle?: string; color?: string }>

export default function PDPComboDetalle({ combo, productosPorCategoria }: PDPComboDetalleProps) {
  // ================= GALERÍA (igual que mayorista) =================
  const galeria =
    combo.galeria && combo.galeria.length > 0 ? combo.galeria : ["/placeholder.jpg"]

  const [activeIndex, setActiveIndex] = useState(0)
const mediaActiva = galeria[activeIndex]
const esVideoActivo = isVideoUrl(mediaActiva)
const [zoomOpen, setZoomOpen] = useState(false)


  // ================= ESTADOS COMBO =================
  const [selected, setSelected] = useState<{ [key: string]: any[] }>({})
  const [activeModal, setActiveModal] = useState<{ cat: string; index: number } | null>(null)
  const [draft, setDraft] = useState<DraftSelections>({})

  const { addItem, items } = useCart()
  const { showAddedDialog } = useUi()


  useEffect(() => {
  if (combo?._id) {
    localStorage.setItem("activeComboId", String(combo._id))
  }
  return () => {
    localStorage.removeItem("activeComboId")
  }
}, [combo?._id])

  const setDraftValue = (prodId: string, key: "talle" | "color", value: string) =>
    setDraft((d) => ({ ...d, [prodId]: { ...(d[prodId] || {}), [key]: value } }))

  // Stock restante considerando carrito
  // Stock restante considerando:
// - stock en Sanity
// - lo que ya hay en el carrito
// - lo que ya seleccionaste en ESTE combo (otros slots)
const getStockRestante = (prod: any, talle?: string) => {
  const t = prod?.talles?.find((x: any) => x.label === talle)
  const stock = typeof t?.stock === "number" ? t.stock : 0

  // 1) En carrito: mismo productId + mismo talle
  const enCarrito = items
    .filter((i: any) => i.productId === prod._id && i.talle === talle)
    .reduce((acc: number, i: any) => acc + (i.cantidad || 0), 0)

  // 2) En el combo actual (selected): contar cuántas veces ya elegiste este prod+talle
  const enCombo = Object.values(selected)
    .flat()
    .filter(Boolean)
    .filter((p: any) => p._id === prod._id && p.talle === talle).length

  return stock - enCarrito - enCombo
}


  // 🔹 Stock real por talle (para pasar al carrito)
const getStockTalle = (prod: any, talle?: string) => {
  if (!talle) return typeof prod.stock === "number" ? prod.stock : undefined

  const t = prod.talles?.find((x: any) => x.label === talle)
  return typeof t?.stock === "number" ? t.stock : undefined
}

  // 🔹 Valida que el combo completo tenga stock suficiente
const hasStockForCombo = () => {
  const picks = Object.values(selected).flat().filter(Boolean)

  // agrupar por productId + talle
  const neededMap = new Map<string, { prod: any; qty: number }>()

  for (const p of picks) {
    const key = `${p._id}__${p.talle || "default"}`
    neededMap.set(key, {
      prod: p,
      qty: (neededMap.get(key)?.qty || 0) + 1,
    })
  }

  // validar cada grupo contra stock - carrito
  for (const { prod, qty } of neededMap.values()) {
    const talle = prod.talle
    const t = prod?.talles?.find((x: any) => x.label === talle)
    const stock = typeof t?.stock === "number" ? t.stock : 0

    const enCarrito = items
      .filter((i: any) => i.productId === prod._id && i.talle === talle)
      .reduce((acc: number, i: any) => acc + (i.cantidad || 0), 0)

    if (stock - enCarrito < qty) return false
  }

  return true
}


  const handleAddToCombo = (categoriaSlug: string, index: number, prod: any) => {
    const d = draft[prod._id] || {}
    const sizeOptions = normalizeSizes(prod.talles)

    if (sizeOptions.length && !d.talle) {
      alert("Seleccioná un talle antes de agregar.")
      return
    }
    if (Array.isArray(prod.colores) && prod.colores.length && !d.color) {
      alert("Seleccioná un color antes de agregar.")
      return
    }

    if (d.talle && getStockRestante(prod, d.talle) <= 0) {
  alert("❌ No hay stock disponible para este talle.")
  return
}


    const nuevos = [...(selected[categoriaSlug] || [])]
    nuevos[index] = { ...prod, talle: d.talle || null, color: d.color || null }
    setSelected({ ...selected, [categoriaSlug]: nuevos })
    setActiveModal(null)
  }

  // Todos seleccionados
  const allSelected = combo.categoriasIncluidas.every(
    (cat: any) =>
      selected[cat.categoria.slug]?.length === cat.cantidad &&
      selected[cat.categoria.slug].every((v: any) => v)
  )

  // Todos con stock
  const allWithStock = allSelected ? hasStockForCombo() : false


  // ================= RENDER =================
  return (
    <>
      {/* CONTENEDOR CENTRAL IGUAL QUE MAYORISTA */}
      <main className="max-w-[1300px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-base leading-relaxed mt-20">
        {/* ===== GALERÍA IZQUIERDA (MISMOS ESTILOS QUE MAYORISTA) ===== */}
        <div className="flex flex-col h-full">
          <div className="sticky top-24">
            <div className="flex gap-6">
              {/* Miniaturas */}
              <div className="flex flex-col gap-3 w-24">
                {galeria.map((img: string, i: number) => {
                  const isActive = activeIndex === i
                  return (
                    <button
                      type="button"
                      key={`${combo._id || combo.nombre}-img-${i}`}
                      onClick={() => setActiveIndex(i)}
                      className={`
                        group relative overflow-hidden rounded-md border-2 
                        transition-all duration-200
                        ${
                          isActive
                            ? "border-black shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                            : "border-gray-200 hover:border-gray-400"
                        }
                      `}
                      aria-pressed={isActive}
                    >
                      {isVideoUrl(img) ? (
  <div className="relative w-[90px] h-[120px]">
    <video
      src={img}
      muted
      playsInline
      preload="metadata"
      className="w-[90px] h-[120px] object-cover"
    />
    {/* Icono play para indicar que es video */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
        VIDEO
      </div>
    </div>
  </div>
) : (
  <Image
    src={img}
    alt={`${combo.nombre} ${i + 1}`}
    width={90}
    height={120}
    className="object-cover"
  />
)}


                    </button>
                  )
                })}
              </div>

              {/* Imagen principal */}
              <div className="flex-1 flex items-start justify-center">
                <div
  className={`overflow-hidden rounded-md ${esVideoActivo ? "" : "cursor-zoom-in"}`}
  onClick={() => {
    if (!esVideoActivo) setZoomOpen(true)
  }}
>
  {esVideoActivo ? (
  <video
    key={mediaActiva}
    src={mediaActiva}
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    controls={false}
    className="w-full h-auto object-cover"
  />
) : (

    <Image
      key={mediaActiva}
      src={mediaActiva}
      alt={combo.nombre}
      width={600}
      height={800}
      className="object-cover transition-transform duration-500 ease-in-out hover:scale-110"
    />
  )}
</div>

              </div>
            </div>
          </div>
        </div>

        {/* ===== DETALLE DERECHA (SIN CAMBIAR LA LÓGICA) ===== */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{combo.nombre}</h1>

          <div className="flex items-center gap-3 mb-4">
            {combo.precioAnterior && (
              <p className="text-gray-400 line-through">${combo.precioAnterior}</p>
            )}
            <p className="text-2xl text-red-600 font-bold">${combo.precio}</p>
            {combo.precioAnterior && (
              <span className="bg-red-600 text-white text-sm px-2 py-1 rounded">
                AHORRÁS ${combo.precioAnterior - combo.precio}
              </span>
            )}
          </div>

          {/* 👉 Guía de talles como Link */}
          <div className="mb-6">
            <Link
              href="/guia-de-talles"
              className="inline-flex items-center gap-2 text-sm text-marca-gris hover:text-marca-gris/80 underline-offset-2 hover:underline"
            >
              <span aria-hidden="true">📏</span>
              <span>Guía de talles</span>
            </Link>
          </div>

          {/* Cajas de selección */}
          <div className="grid grid-cols-3 gap-6 max-w-[800px] mx-auto mb-12">
            {combo.categoriasIncluidas.flatMap((cat: any) =>
              Array.from({ length: cat.cantidad }).map((_, i) => {
                const seleccionado = selected[cat.categoria.slug]?.[i]
                return (
                  <div
                    key={`${String(cat?.categoria?.slug ?? "sin-cat")}__box__${i}`}
                    className="border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-black transition"
                    onClick={() => setActiveModal({ cat: cat.categoria.slug, index: i })}
                  >
                    {seleccionado ? (
                      <div className="relative w-full h-full flex flex-col">
                        {/* Botón X */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const nuevos = [...(selected[cat.categoria.slug] || [])]
                            nuevos[i] = null
                            setSelected({ ...selected, [cat.categoria.slug]: nuevos })
                          }}
                          className="absolute top-2 right-2 z-10 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>

                        {/* Imagen */}
                        <div className="relative flex-1 aspect-square bg-white rounded-lg">
                          <Image
                            src={seleccionado.imagen || "/placeholder.png"}
                            alt={seleccionado.nombre || "producto"}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Footer */}
                        <div className="w-full bg-gray-100 text-center py-1 mt-1 rounded">
                          <span className="text-sm md:text-base font-bold">
                            {seleccionado.talle || "—"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl md:text-3xl font-bold text-gray-500">
                          +
                        </span>
                        <span className="text-xs text-gray-500 text-center">
                          Agregar {cat.categoria.titulo} {i + 1}
                        </span>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Botón pagar */}
          <button
            type="button"
            disabled={!allWithStock}
            onClick={() => {
              if (!allWithStock) {
                alert("❌ No hay stock suficiente para completar este combo.")
                return
              }

              const itemsCombo = Object.values(selected).flat().filter(Boolean)

             itemsCombo.forEach((prod: any) => {
  const stockTalle = getStockTalle(prod, prod.talle)

  const unitPrice = Number(prod?.precioActual ?? prod?.precio ?? 0)

  if (!unitPrice || unitPrice <= 0) {
    alert("Este producto no tiene precio válido.")
    return
  }

  addItem({
    productId: prod._id,
    nombre: `${prod.nombre}${prod.talle ? ` (Talle ${prod.talle})` : ""}`,
    precio: unitPrice, // ✅ precio unitario real
    cantidad: 1,
    imagen: prod.imagen || "/placeholder.png",
    slug: prod.slug ?? undefined,
    talle: prod.talle ?? undefined,
    stock: stockTalle,
    comboId: combo._id,
  })
})

              showAddedDialog({
                title: combo.nombre,
                image: combo.galeria?.[0],
              })
            }}
            className={`w-full mt-6 py-3 rounded-lg font-bold text-white ${
              allSelected ? "bg-black hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            AÑADIR AL CARRITO
          </button>

          {/* Acordeón */}
          <div className="mt-8 border-t">
            <AccordionInfo
              sections={[
                {
                  title: "Origen y Cuidados",
                  content: (
                    <div className="space-y-3 text-base leading-relaxed">
                      <p>
                        <strong>Origen</strong>
                      </p>
                      <p>
                        Nuestras prendas son 100% argentinas tanto en su materia prima
                        como en su elaboración artesanal. Creemos en el valor de lo hecho
                        a mano, y al no ser un proceso mecanizado, cada prenda puede
                        contar con pequeñas diferencias o imperfecciones.
                      </p>
                      <p>
                        <strong>Cuidados*</strong>
                      </p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>Lavado a máquina en agua fría (máx. 30ºC), del revés.</li>
                        <li>
                          Secado al aire libre; evitar la secadora o usar ciclo frío y
                          retirar al 80% seco.
                        </li>
                        <li>Plancha a baja temperatura (máx. 110ºC), del revés.</li>
                        <li>No usar lavandina ni cloro.</li>
                        <li>Lavar con colores similares; evitar limpieza en seco.</li>
                      </ul>
                      <p className="italic text-gray-500">
                        Aclaraciones: Nuestros productos no se encuentran prelavados (a
                        excepción de los de Jean), por lo que aquellos que contienen
                        algodón pueden encoger hasta un 5%.
                      </p>
                    </div>
                  ),
                },
                {
                  title: "Retiros y Envios a toda Argentina",
                  content: (
                    <div className="space-y-3 text-base leading-relaxed">
                      <p>Enviamos a todo el país excepto Tierra del Fuego.</p>
                      <p>
                        Nuestros tiempos de despacho son de 48hs a 72hs hábiles luego de
                        acreditado el pago.
                      </p>
                      <p>
                        <strong>Tipos de envío:</strong>
                      </p>
                      <p>
                        <strong>Retiros</strong>
                      </p>
                      <p>
                        Podés hacer tu pedido en la web y retirarlo en nuestra ubicación
                        en Resistencia, Chaco ni bien se acredite tu pago.
                      </p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li>
                          Hace tu pedido y pagalo antes de las 11 am y recibilo en el
                          día, sino al día siguiente hábil.
                        </li>
                        <li>Entrega en 24 hs luego de acreditado el pago* y despachado.</li>
                        <li>
                          <strong>Correo Argentino:</strong> A domicilio o a sucursal en
                          todo el país.
                        </li>
                      </ul>
                      <p className="italic text-gray-500">
                        Aclaraciones: Una vez despachado, los tiempos dependen 100% de la
                        empresa de logística. Mercado Pago se acredita automáticamente,
                        transferencia puede demorar hasta 48hs.
                      </p>
                      <p className="italic text-gray-500">
                        Importante sobre envíos con Correo Argentino: Los envíos no
                        cuentan con seguro, ya que este servicio no es ofrecido por dicha
                        empresa. Ante cualquier inconveniente comprobable que sea
                        responsabilidad de Correo Argentino, los costos derivados no
                        serán asumidos por Goodfla.
                      </p>
                    </div>
                  ),
                },
                {
                  title: "Cambios y Devoluciones",
                  content: (
                    <div className="space-y-3 text-base leading-relaxed">
                      <p>
                        Nuestro sistema automatizado facilita el proceso de cambios a
                        domicilio, con un plazo de aprobación de 24 a 72 horas hábiles
                        desde que se completa la solicitud.
                      </p>
                      <p>
                        Tenés hasta 30 días desde la recepción del pedido para solicitar
                        un cambio, y recibirás confirmación por email en cada etapa del
                        proceso.
                      </p>
                      <p>
                        <strong>Cambios</strong>
                      </p>
                      <p>
                        Los cambios se realizan a través de la logística OCA, y el costo
                        de este servicio es más alto que un envío convencional.
                      </p>
                      <p>
                        <strong>Devoluciones</strong>
                      </p>
                      <p>
                        Para devoluciones, contamos con un proceso automatizado y
                        eficiente. Cualquier inconveniente recibirá prioridad urgente
                        para asegurar una solución rápida.
                      </p>
                      <p>
                        Disponés de 30 días desde la recepción del pedido para realizar
                        la devolución, y recibirás notificaciones por email.
                      </p>
                      <p>
                        Los retiros de paquetes por devolución se realizan mediante OCA,
                        y este servicio tiene un costo mayor que un envío estándar.
                      </p>
                      <p>
                        <strong>Política de Descuentos en Cambios y Devoluciones</strong>
                      </p>
                      <p>
                        Los descuentos aplicados al pedido original también se aplicarán
                        en caso de devoluciones o cambios solicitados.
                      </p>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        {/* Modal productos (sin cambios) */}
        {activeModal && (
          <Modal onClose={() => setActiveModal(null)}>
            <div className="flex justify-center gap-2 sm:gap-4 mb-6 flex-wrap">
              {combo.categoriasIncluidas.flatMap((cat: any) =>
                Array.from({ length: cat.cantidad }).map((_, i) => (
                  <button
                    key={`${String(cat?.categoria?.slug ?? "sin-cat")}__tab__${i}`}
                    className={`px-3 py-2 text-sm rounded-full border ${
                      activeModal.cat === cat.categoria.slug && activeModal.index === i
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                    onClick={() => setActiveModal({ cat: cat.categoria.slug, index: i })}
                  >
                    {cat.categoria.titulo} {i + 1}
                  </button>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {productosPorCategoria[activeModal.cat]?.map((prod: any, i: number) => {
                const sizeOptions = normalizeSizes(prod.talles)
                const hasColors = Array.isArray(prod.colores) && prod.colores.length > 0
                const d = draft[prod._id] || {}

                return (
                  <div
                    key={`${String(prod._id ?? prod.slug ?? prod.nombre)}__${activeModal.cat}__${i}`}
                    className="flex flex-col rounded-xl border p-3 bg-white min-h-[360px]"
                  >
                    <div className="relative w-full aspect-square bg-gray-50 rounded-md overflow-hidden mb-3">
                      <Image
                        src={prod.imagen || "/placeholder.png"}
                        alt={prod.nombre}
                        fill
                        className="object-contain"
                        sizes="200px"
                      />
                    </div>

                    <p className="font-semibold text-sm mb-2 min-h-[20px] text-center">
                      {prod.nombre}
                    </p>

                    {hasColors && (
                      <select
                        className="border rounded p-1 text-sm mb-2 w-full"
                        value={d.color || ""}
                        onChange={(e) => setDraftValue(prod._id, "color", e.target.value)}
                      >
                        <option value="">Seleccionar color</option>
                        {prod.colores.map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    {sizeOptions.length > 0 && (
                      <select
                        className="border rounded p-1 text-sm mb-3 w-full"
                        value={d.talle || ""}
                        onChange={(e) => setDraftValue(prod._id, "talle", e.target.value)}
                      >
                        <option value="">Seleccionar talle</option>
                        {sizeOptions.map((t) => (
                          <option
                            key={t.label}
                            value={t.label}
                            disabled={getStockRestante(prod, t.label) <= 0}
                          >
                            {t.label}{" "}
                            {getStockRestante(prod, t.label) <= 0 ? "(Sin stock)" : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      className="mt-auto bg-black text-white px-3 py-2 rounded w-full"
                      onClick={() => handleAddToCombo(activeModal.cat, activeModal.index, prod)}
                    >
                      Agregar al combo
                    </button>
                  </div>
                )
              })}
            </div>
          </Modal>
        )}
      </main>

      {/* Servicios que marcan la diferencia */}
      <div className="mt-16">
        <ServiciosDiferencia />
      </div>

      {/* Modal zoom de la imagen principal */}
      {zoomOpen && !esVideoActivo && (

        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative bg-white rounded-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-2 right-2 text-black text-2xl"
            >
              ×
            </button>
            <ZoomImage
              src={mediaActiva}
              alt={combo.nombre}
              width={500}
              height={700}
              zoom={2.5}
              lens={200}
            />
          </div>
        </div>
      )}
    </>
  )
}

/** Normaliza talles */
function normalizeSizes(raw: any): { label: string; inStock?: boolean }[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((t) =>
      typeof t === "string"
        ? { label: t, inStock: true }
        : { label: t.label, inStock: t.inStock }
    )
  }
  return []
}
