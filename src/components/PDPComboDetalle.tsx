// src/components/PDPComboDetalle.tsx
"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import Modal from "@/components/Modal"
import ServiciosDiferencia from "@/components/ServiciosDiferencia"
import AccordionInfo from "@/components/AccordionInfo"
import { useCart } from "@/context/CartContext"
import { useUi } from "@/context/UiContext"
import ProductMediaGallery from "@/components/ProductMediaGallery"


interface PDPComboDetalleProps {
  combo: any
  productosPorCategoria: Record<string, any[]>
  mode?: "combo" | "mayorista"
}

// 🔹 helper para detectar videos

type DraftSelections = Record<string, { talle?: string; color?: string }>

export default function PDPComboDetalle({
  combo,
  productosPorCategoria,
  mode = "combo",
}: PDPComboDetalleProps) {
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

  const comboSlots = combo.categoriasIncluidas.flatMap((cat: any) =>
    Array.from({ length: cat.cantidad }).map((_, i) => ({
      cat: cat.categoria.slug,
      index: i,
    }))
  )

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
    nuevos[index] = {
      ...prod,
      talle: d.talle || null,
      color: d.color || null,
    }

    const nextSelected = {
      ...selected,
      [categoriaSlug]: nuevos,
    }

    setSelected(nextSelected)

    const currentPos = comboSlots.findIndex(
      (slot: any) => slot.cat === categoriaSlug && slot.index === index
    )

    if (currentPos !== -1) {
      for (let i = currentPos + 1; i < comboSlots.length; i++) {
        const slot = comboSlots[i]
        const yaSeleccionado = nextSelected[slot.cat]?.[slot.index]

        if (!yaSeleccionado) {
          setActiveModal({ cat: slot.cat, index: slot.index })
          return
        }
      }
    }

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

    const precioOferta = Number(combo?.precio ?? 0)
  const precioHabitual = Number(combo?.precioAnterior ?? 0)

  const esMayorista = mode === "mayorista"
  const aplicaTransferenciaPromo = mode === "combo"

  const precioTransferencia = aplicaTransferenciaPromo
    ? Math.round(precioOferta * 0.7)
    : precioOferta

  const cuotaExacta = precioOferta / 3
  const cuotaTexto = cuotaExacta.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const precioOfertaTexto = precioOferta.toLocaleString("es-AR")
  const precioHabitualTexto = precioHabitual.toLocaleString("es-AR")
  const precioTransferenciaTexto = precioTransferencia.toLocaleString("es-AR")
  // ================= RENDER =================
  return (
    <>
      {/* CONTENEDOR CENTRAL IGUAL QUE MAYORISTA */}
      <main className="max-w-[1300px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-base leading-relaxed mt-20">
                <div className="flex flex-col h-full">
          <ProductMediaGallery
            galeria={combo.galeria}
            imagen={combo.imagen}
            nombre={combo.nombre}
          />
        </div>

        {/* ===== DETALLE DERECHA (SIN CAMBIAR LA LÓGICA) ===== */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{combo.nombre}</h1>

          <div className="mb-6 space-y-3">

  {/* Precio habitual */}
  {precioHabitual > 0 && (
    <p className="text-sm text-gray-400 line-through">
      Antes ${precioHabitualTexto}
    </p>
  )}

  {/* Precio oferta (protagonista) */}
  <div className="flex items-center gap-3">
    <p className="text-3xl md:text-4xl font-extrabold text-black">
      ${precioOfertaTexto}
    </p>

    <span className="bg-red-600 text-white text-xs md:text-sm px-2 py-1 rounded font-semibold">
      OFERTA
    </span>
  </div>

  {/* Cuotas */}
  {!esMayorista && (
    <p className="text-sm text-gray-700">
      o 3x de <span className="font-semibold">${cuotaTexto}</span> sin interés
    </p>
  )}

  {/* Transferencia (HERO SECONDARY) */}
  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
    <p className="text-green-800 font-bold text-base md:text-lg">
      ${precioTransferenciaTexto}{" "}
      {esMayorista ? "SOLO TRANSFERENCIA" : "CON TRANSFERENCIA + ENVIO GRATIS"}
    </p>

    {!esMayorista && (
      <p className="text-xs text-green-700 mt-1">
         Ahorrás pagando en efectivo / transferencia
      </p>
    )}
  </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 max-w-[980px] mb-12">
  {combo.categoriasIncluidas.flatMap((cat: any) =>
    Array.from({ length: cat.cantidad }).map((_, i) => {
      const seleccionado = selected[cat.categoria.slug]?.[i]

      return seleccionado ? (
        <div
          key={`${String(cat?.categoria?.slug ?? "sin-cat")}__box__${i}`}
          className="border-2 border-dashed border-gray-400 rounded-lg p-2 bg-white cursor-pointer hover:border-black transition h-[220px] md:h-[235px] flex flex-col"
          onClick={() => setActiveModal({ cat: cat.categoria.slug, index: i })}
        >
          <div className="relative w-full h-[150px] md:h-[160px] bg-white rounded-lg overflow-hidden">
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

            <Image
              src={seleccionado.imagen || "/placeholder.png"}
              alt={seleccionado.nombre || "producto"}
              fill
              className="object-cover"
            />
          </div>

          <div className="w-full bg-gray-100 text-center py-2 mt-2 rounded">
            <span className="text-sm md:text-base font-bold">
              {seleccionado.talle || "—"}
            </span>
          </div>
        </div>
      ) : (
        <div
          key={`${String(cat?.categoria?.slug ?? "sin-cat")}__box__${i}`}
          className="border-2 border-dashed border-gray-400 rounded-lg bg-white cursor-pointer hover:border-black transition h-[220px] md:h-[235px] flex flex-col items-center justify-center text-center px-3"
          onClick={() => setActiveModal({ cat: cat.categoria.slug, index: i })}
        >
          <span className="text-2xl md:text-3xl font-bold text-gray-500 leading-none">+</span>
          <span className="text-xs text-gray-500 leading-snug mt-2">
            Agregar {cat.categoria.titulo} {i + 1}
          </span>
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
  precio: unitPrice,
  cantidad: 1,
  imagen: prod.imagen || "/placeholder.png",
  slug: prod.slug ?? undefined,
  talle: prod.talle ?? undefined,
  stock: stockTalle,
  comboId: mode === "combo" ? combo._id : undefined,
  packMayoristaId: mode === "mayorista" ? combo._id : undefined,
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
           <div className="sticky top-0 z-20 bg-white pb-2 mb-3 border-b">
              <div className="pt-1 text-center">
                <p className="text-[11px] sm:text-xs text-gray-500 mb-0.5">
                  Estás seleccionando
                </p>
                <p className="text-sm sm:text-base font-bold">
                  {
                    combo.categoriasIncluidas.find(
                      (cat: any) => cat.categoria.slug === activeModal.cat
                    )?.categoria.titulo
                  }{" "}
                  {activeModal.index + 1}
                </p>
              </div>

           <div className="mt-2 -mx-1 px-1 overflow-x-auto">   
                <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0 sm:justify-center">
                  {combo.categoriasIncluidas.flatMap((cat: any) =>
                    Array.from({ length: cat.cantidad }).map((_, i) => (
                      <button
                        key={`${String(cat?.categoria?.slug ?? "sin-cat")}__tab__${i}`}
                        className={`px-2.5 py-1.5 text-xs rounded-full border transition ${
                          activeModal.cat === cat.categoria.slug && activeModal.index === i
                            ? "bg-black text-white border-black"
                            : selected[cat.categoria.slug]?.[i]
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-white text-black border-gray-300"
                        }`}
                        onClick={() => setActiveModal({ cat: cat.categoria.slug, index: i })}
                      >
                        {selected[cat.categoria.slug]?.[i] ? "✓ " : ""}
                        {cat.categoria.titulo} {i + 1}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {productosPorCategoria[activeModal.cat]?.map((prod: any, i: number) => {
                const sizeOptions = normalizeSizes(prod.talles)
                const hasColors = Array.isArray(prod.colores) && prod.colores.length > 0
                const d = draft[prod._id] || {}

                return (
                  <div
                    key={`${String(prod._id ?? prod.slug ?? prod.nombre)}__${activeModal.cat}__${i}`}
                   className="rounded-xl border p-3 bg-white flex flex-row sm:flex-col gap-3 sm:gap-0"
                  >
                    <div className="relative w-[110px] h-[110px] sm:w-full sm:h-auto sm:aspect-square shrink-0 bg-gray-50 rounded-md overflow-hidden mb-0 sm:mb-3">
                      <Image
                        src={prod.imagen || "/placeholder.png"}
                        alt={prod.nombre}
                        fill
                        className="object-contain"
                        sizes="200px"
                      />
                    </div>

                   <div className="flex-1 flex flex-col min-w-0">
  <p className="font-semibold text-sm mb-2 leading-tight text-left sm:text-center sm:min-h-[40px]">
    {prod.nombre}
  </p>

  {hasColors && (
    <select
      className="border rounded px-2 py-2 text-sm mb-2 w-full bg-white"
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
      className="border rounded px-2 py-2 text-sm mb-3 w-full bg-white"
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
          {t.label} {getStockRestante(prod, t.label) <= 0 ? "(Sin stock)" : ""}
        </option>
      ))}
    </select>
  )}

  <button
    type="button"
    className="mt-auto bg-black text-white px-3 py-2.5 rounded w-full text-sm font-medium"
    onClick={() => handleAddToCombo(activeModal.cat, activeModal.index, prod)}
  >
    Agregar al combo
  </button>
</div>
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
