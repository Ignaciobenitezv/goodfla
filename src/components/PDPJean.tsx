"use client"
import AccordionInfo from "./AccordionInfo"
import Image from "next/image"
import { useState } from "react"
import { FiInfo } from "react-icons/fi"
import GuiaDeTallesTabs from "./GuiaDeTallesTabs"
import ServiciosDiferencia from "./ServiciosDiferencia"
import ZoomImage from "./ZoomImage"
import { useCart } from "@/context/CartContext"

type PDPJeanProps = {
  producto: {
    _id?: string
    nombre: string
    precio: number
    descripcion?: string
    galeria?: string[]
    talles?: { label: string; inStock?: boolean }[]
    composicion?: string
  }
}

export default function PDPJean({ producto }: PDPJeanProps) {
  const galeria =
    producto.galeria && producto.galeria.length > 0
      ? producto.galeria
      : ["/placeholder.jpg"]

  const [imagenActiva, setImagenActiva] = useState(galeria[0])
  const [cantidad, setCantidad] = useState(1)
  const [openModal, setOpenModal] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [selectedTalle, setSelectedTalle] = useState<string | null>(null)
  const { addItem } = useCart()

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
                    type="button"
                    key={i}
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
                <div
                  className="overflow-hidden rounded-md cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                >
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

        {/* INFO */}
        <div className="flex flex-col h-full space-y-8">
          <div>
            <h1 className="text-4xl font-semibold">{producto.nombre}</h1>
            <p className="text-3xl font-bold mt-2">
              ${producto.precio.toLocaleString("es-AR")}
            </p>
          </div>

          <button
            className="flex items-center gap-2 underline text-lg text-gray-700"
            onClick={() => setOpenModal(true)}
          >
            <FiInfo /> GUIA DE TALLES
          </button>

          {producto.talles && producto.talles.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 text-lg">Talle:</h3>
              <div className="flex gap-2 flex-wrap">
                {producto.talles.map((t, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={!t.inStock}
                    onClick={() => setSelectedTalle(t.label)}
                    className={`px-6 py-2 border rounded-md text-base transition-colors ${
                      !t.inStock
                        ? "opacity-40 cursor-not-allowed"
                        : selectedTalle === t.label
                        ? "bg-black text-white border-black"
                        : "hover:bg-black hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2 text-lg">Cantidad</h3>
            <div className="flex items-center border rounded-md w-48">
              <button
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="px-4 py-2 text-xl"
              >
                –
              </button>
              <span className="flex-1 text-center">{cantidad}</span>
              <button
                onClick={() => setCantidad((c) => c + 1)}
                className="px-4 py-2 text-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* AÑADIR AL CARRITO */}
          <button
            onClick={() => {
              if (!selectedTalle) {
                alert("⚠️ Seleccioná un talle antes de agregar al carrito.")
                return
              }
              addItem({
                id: `${producto._id || producto.nombre}-${selectedTalle}`,
                nombre: `${producto.nombre} (Talle ${selectedTalle})`,
                precio: producto.precio,
                cantidad: cantidad,
                imagen: galeria[0] || "/placeholder.jpg",
              })
              alert("✅ Producto añadido al carrito")
            }}
            className="w-full bg-black text-white py-4 rounded-md font-medium text-lg"
          >
            Añadir al carrito
          </button>

          {/* INFO EXTRA */}
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
            <div className="pt-2">
              <p>
                Nuestros métodos de pago y envío, con devolución dentro de 30 días
              </p>
            </div>
          </div>

          {producto.descripcion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Descripción y Calce:</h3>
              <p>{producto.descripcion}</p>
            </div>
          )}

          {producto.composicion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Composición:</h3>
              <p>{producto.composicion}</p>
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
              // ... tus otras secciones iguales
            ]}
          />
        </div>

        {/* MODAL TALLE */}
        <GuiaDeTallesTabs
          abierto={openModal}
          onClose={() => setOpenModal(false)}
          imagen={imagenActiva}
        />
      </main>

      <ServiciosDiferencia />

      {/* MODAL ZOOM */}
      {zoomOpen && (
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
              src={imagenActiva}
              alt={producto.nombre}
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
