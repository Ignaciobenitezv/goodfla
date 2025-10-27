"use client";

import Image from "next/image";
import { useState } from "react";
import ZoomImage from "./ZoomImage";
import ServiciosDiferencia from "./ServiciosDiferencia";
import AccordionInfo from "./AccordionInfo";
import { useCart } from "@/context/CartContext";

type MayoristaProducto = {
  _id?: string;
  nombre: string;
  precioActual: number;
  precioAntes?: number | null;
  descripcion?: string;
  galeria?: string[]; // portada + galería ya mapeadas como array de urls
  slug?: string;
};

export default function PDPMayoristaDetalle({ producto }: { producto: MayoristaProducto }) {
  const galeria =
    producto.galeria && producto.galeria.length > 0
      ? producto.galeria
      : ["/placeholder.jpg"];

  const [imagenActiva, setImagenActiva] = useState(galeria[0]);
  const [cantidad, setCantidad] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);

  const { addItem } = useCart();

  const handleCantidad = (n: number) => {
    const nueva = cantidad + n;
    if (nueva >= 1) setCantidad(nueva);
  };

  const handleAddToCart = () => {
    // para mayorista no hay talle; agregamos por pack
    addItem({
      id: producto._id || producto.nombre,
      nombre: producto.nombre,
      precio: producto.precioActual,
      cantidad,
      imagen: galeria[0] || "/placeholder.jpg",
      slug: producto.slug,
      // sin talle
    });
    alert("✅ Pack añadido al carrito");
  };

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
                    key={`${producto._id || producto.nombre}-img-${i}`}
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
            <div className="mt-2 flex items-baseline gap-3">
              {typeof producto.precioAntes === "number" && (
                <span className="text-2xl text-gray-500 line-through">
                  ${producto.precioAntes.toLocaleString("es-AR")}
                </span>
              )}
              <p className="text-3xl font-bold">
                ${producto.precioActual.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

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
              <button onClick={() => handleCantidad(1)} className="px-4 py-2 text-xl">
                +
              </button>
            </div>
          </div>

          {/* Botón carrito */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-4 rounded-md font-medium text-lg"
          >
            Añadir al carrito
          </button>

          {/* Info extra */}
          <div className="text-gray-700 space-y-2">
            <p>
              <strong>IMPORTANTE!</strong> Calcula los tiempos estimados de despacho y
              entrega ✨
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
                    <p>
                      <strong>Origen</strong>
                    </p>
                    <p>
                      Nuestras prendas son 1000% argentinas tanto en su materia prima
                      como en su elaboración artesanal. Creemos en el valor de lo hecho a
                      mano, y al no ser un proceso mecanizado, cada prenda puede contar
                      con pequeñas diferencias o imperfecciones.
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
                      <li>
                        Lavar con colores similares; evitar limpieza en seco.
                      </li>
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
                title: "Retiros y Envíos",
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
                      Podés hacer tu pedido en la web y retirarlo en nuestra ubicación en
                      Resistencia, Chaco ni bien se acredite tu pago.
                    </p>

                    <ul className="list-disc ml-6 space-y-1">
                      <li>
                        Hacé tu pedido y pagalo antes de las 11 am y recibilo en el día,
                        sino al día siguiente hábil.
                      </li>
                      <li>Entrega en 24 hs luego de acreditado el pago* y despachado.</li>
                      <li>
                        <strong>Correo Argentino:</strong> A domicilio o a sucursal.
                      </li>
                    </ul>

                    <p className="italic text-gray-500">
                      *Una vez despachado, los tiempos dependen 100% de la empresa de
                      logística. Mercado Pago se acredita automáticamente, transferencia
                      puede demorar hasta 48hs.
                    </p>
                    <p className="italic text-gray-500">
                      *Importante sobre envíos con Correo Argentino: no cuentan con
                      seguro. Cualquier inconveniente comprobable que sea
                      responsabilidad de Correo Argentino no será asumido por Goodfla.
                    </p>
                  </div>
                ),
              },
              {
                title: "Cambios y Devoluciones",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p>
                      <strong>Cambios</strong>
                    </p>
                    <p>
                      Tenés hasta 30 días desde la recepción del pedido para solicitar un
                      cambio, y recibirás confirmación por email en cada etapa del
                      proceso.
                    </p>
                    <p>Los cambios se realizan a través de OCA.</p>

                    <p>
                      <strong>Devoluciones</strong>
                    </p>
                    <p>
                      Disponés de 30 días desde la recepción del pedido para realizar la
                      devolución, y recibirás notificaciones por email.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>

      <ServiciosDiferencia />

      {/* Modal zoom */}
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
  );
}
