"use client"
import AccordionInfo from "./AccordionInfo"
import Image from "next/image"
import { useState } from "react"
import { FiInfo } from "react-icons/fi"
import GuiaDeTallesTabs from "./GuiaDeTallesTabs"
import ServiciosDiferencia from "./ServiciosDiferencia"
import { useCart } from "../context/CartContext" // 👈 importa tu contexto

type Producto = {
  _id?: string
  nombre: string
  precio: number
  descripcion?: string
  galeria?: string[]
  talles?: { label: string; stock: number }[]
  composicion?: string
  slug?: string
}

type Section = {
  title: string
  content: React.ReactNode
}

type Props = {
  producto: Producto
  accordionSections?: Section[]
}

export default function PDPBase({ producto, accordionSections }: Props) {
  const galeria = producto.galeria?.length ? producto.galeria : ["/placeholder.jpg"]
  const [imagenActiva, setImagenActiva] = useState(galeria[0])
  const [cantidad, setCantidad] = useState(1)
  const [openModal, setOpenModal] = useState(false)
  const [talleSeleccionado, setTalleSeleccionado] = useState<{ label: string; stock: number } | null>(null)

  const { addItem, items } = useCart() // 👈 ahora también usamos items del carrito

  // 🔹 calcular stock restante considerando lo que ya está en carrito
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

  const handleAddToCart = () => {
    if (!talleSeleccionado) return
    if (cantidad > stockRestante) {
      alert("❌ No hay stock suficiente")
      return
    }
    addItem({
      id: producto._id!,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      talle: talleSeleccionado.label,
      imagen: galeria[0],
      slug: producto.slug,
    })
    alert("✅ Producto añadido al carrito")
  }

  return (
    <>
      <main className="max-w-[1300px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-base leading-relaxed">
        {/* GALERÍA */}
        <div className="flex flex-col h-full">
          <div className="sticky top-24">
            <div className="flex gap-6">
              {/* Miniaturas */}
              <div className="flex flex-col gap-3 w-24">
                {galeria.map((img, i) => (
  <button
    key={`${img}-${i}`}   // ✅ ahora es único aunque la URL se repita
    onClick={() => setImagenActiva(img)}
    className={`border rounded-md overflow-hidden ${
      imagenActiva === img ? "ring-2 ring-black" : ""
    }`}
                  >
                    <Image
                      src={img}
                      alt={`${producto.nombre} ${i + 1}`}
                      width={90}
                      height={120}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
              {/* Imagen principal */}
              <div className="flex-1 flex items-start justify-center">
                <div className="overflow-hidden rounded-md">
                  <Image
                    src={imagenActiva}
                    alt={producto.nombre}
                    width={600}
                    height={800}
                    className="object-cover transition-transform duration-500 ease-in-out hover:scale-110 cursor-zoom-in"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INFO */}
        <div className="flex flex-col h-full space-y-8">
          {/* Nombre y precio */}
          <div>
            <h1 className="text-4xl font-semibold">{producto.nombre}</h1>
            <p className="text-3xl font-bold mt-2">
              ${producto.precio.toLocaleString("es-AR")}
            </p>
          </div>

          {/* Botón guía de talles */}
          <button
            className="flex items-center gap-2 underline text-lg text-gray-700"
            onClick={() => setOpenModal(true)}
          >
            <FiInfo /> GUIA DE TALLES
          </button>

          {/* Talles */}
          {producto.talles?.length ? (
            <div>
              <h3 className="font-medium mb-2 text-lg">Talle:</h3>
              <div className="flex gap-2 flex-wrap">
                {producto.talles.map((t, i) => (
  <button
    key={`${t.label}-${i}`}   // ✅ combina label + índice
    onClick={() => {
      setTalleSeleccionado(t)
      setCantidad(1)
    }}
    disabled={t.stock <= 0}
    className={`px-6 py-2 border rounded-md text-base ${
      talleSeleccionado?.label === t.label
        ? "bg-black text-white"
        : "bg-white text-black"
    } ${t.stock <= 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-black hover:text-white"}`}
  >
    {t.label}
  </button>
))}
              </div>
              {talleSeleccionado && (
                <p className="mt-2 text-gray-600 text-sm">
                  Stock disponible: {stockRestante}
                </p>
              )}
            </div>
          ) : null}

          {/* Cantidad */}
          <div>
            <h3 className="font-medium mb-2 text-lg">Cantidad</h3>
            <div className="flex items-center border rounded-md w-48">
              <button
                onClick={() => handleCantidad(-1)}
                disabled={cantidad <= 1}
                className="px-4 py-2 text-xl"
              >
                –
              </button>
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

          {/* Botón carrito */}
          <button
            onClick={handleAddToCart}
            disabled={!talleSeleccionado || stockRestante <= 0}
            className="w-full bg-black text-white py-4 rounded-md font-medium text-lg disabled:bg-gray-400"
          >
            Añadir al carrito
          </button>

          {/* Calcular envío */}
          <div className="text-gray-700 space-y-2">
            <p>
              <strong>IMPORTANTE!</strong> Calcula los tiempos estimados de
              despacho y entrega ✨
            </p>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Ingresa tu código postal"
                className="border px-3 py-2 rounded-md text-base w-64"
              />
              <button className="ml-2 bg-gray-900 text-white px-4 py-2 rounded-md text-base">
                Calcular
              </button>
            </div>
            <p className="pt-2">
              Nuestros métodos de pago y envío, con devolución dentro de 30 días
            </p>
          </div>

          {/* Descripción */}
          {producto.descripcion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Descripción y Calce:</h3>
              <p>{producto.descripcion}</p>
            </div>
          )}

          {/* Composición */}
          {producto.composicion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Composición:</h3>
              <p>{producto.composicion}</p>
            </div>
          )}

          {/* AccordionInfo */}
          <AccordionInfo
            sections={accordionSections && accordionSections.length > 0 ? accordionSections : []}
          />
        </div>

        {/* Modal guía de talles */}
        <GuiaDeTallesTabs
          abierto={openModal}
          onClose={() => setOpenModal(false)}
          imagen={imagenActiva}
        />
      </main>

      {/* Servicios */}
      <ServiciosDiferencia />
    </>
  )
}
