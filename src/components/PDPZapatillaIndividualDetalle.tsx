"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import ZoomImage from "@/components/ZoomImage";
import ServiciosDiferencia from "@/components/ServiciosDiferencia";
import AccordionInfo from "@/components/AccordionInfo";
import { useCart } from "@/context/CartContext";
import { useUi } from "@/context/UiContext";

type Talle = {
  label: string;
  stock: number;
};

type ProductoZapatilla = {
  _id?: string;
  nombre: string;
  precioActual?: number;
  precio?: number;
  precioAntes?: number | null;
  descripcion?: string;
  galeria?: string[];
  imagen?: string;
  slug?: string;
  talles?: Talle[];
  colores?: string[];
};

export default function PDPZapatillaIndividualDetalle({
  producto,
}: {
  producto: ProductoZapatilla;
}) {
  const galeria =
    producto.galeria && producto.galeria.length > 0
      ? producto.galeria
      : [producto.imagen || "/placeholder.jpg"];

  const [activeIndex, setActiveIndex] = useState(0);
  const imagenActiva = galeria[activeIndex];

  const [cantidad, setCantidad] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [talleSeleccionado, setTalleSeleccionado] = useState("");
  const [colorSeleccionado, setColorSeleccionado] = useState("");

  const { addItem, items } = useCart();
  const { showAddedDialog } = useUi();

  const precioFinal = Number(producto.precioActual ?? producto.precio ?? 0);
  const talles = useMemo(() => normalizeSizes(producto.talles), [producto.talles]);
  const tieneColores = Array.isArray(producto.colores) && producto.colores.length > 0;

  const getStockTalle = (talle?: string) => {
    if (!talle) return 0;
    const t = producto.talles?.find((x) => x.label === talle);
    return typeof t?.stock === "number" ? t.stock : 0;
  };

  const getStockRestante = (talle?: string) => {
    if (!talle) return 0;

    const stock = getStockTalle(talle);

    const enCarrito = items
      .filter((i: any) => i.productId === producto._id && i.talle === talle)
      .reduce((acc: number, i: any) => acc + (i.cantidad || 0), 0);

    return stock - enCarrito;
  };

  const stockDisponible = talleSeleccionado ? getStockRestante(talleSeleccionado) : 0;

  const handleCantidad = (delta: number) => {
    const nueva = cantidad + delta;
    if (nueva < 1) return;

    if (talleSeleccionado && nueva > stockDisponible) return;

    setCantidad(nueva);
  };

  const handleAddToCart = () => {
    if (!precioFinal || precioFinal <= 0) {
      alert("Este producto no tiene un precio válido.");
      return;
    }

    if (talles.length > 0 && !talleSeleccionado) {
      alert("Seleccioná un talle.");
      return;
    }

    if (tieneColores && !colorSeleccionado) {
      alert("Seleccioná un color.");
      return;
    }

    if (!talleSeleccionado) {
      alert("Seleccioná un talle.");
      return;
    }

    const restante = getStockRestante(talleSeleccionado);

    if (restante <= 0) {
      alert("No hay stock disponible para ese talle.");
      return;
    }

    if (cantidad > restante) {
      alert(`Solo hay ${restante} unidad(es) disponible(s) para ese talle.`);
      return;
    }

    addItem({
      productId: producto._id ?? producto.slug ?? producto.nombre,
      nombre: `${producto.nombre}${talleSeleccionado ? ` (Talle ${talleSeleccionado})` : ""}${
        colorSeleccionado ? ` - ${colorSeleccionado}` : ""
      }`,
      precio: precioFinal,
      cantidad,
      imagen: imagenActiva || producto.galeria?.[0] || producto.imagen,
      slug: producto.slug,
      talle: talleSeleccionado || undefined,
      color: colorSeleccionado || undefined,
      stock: getStockTalle(talleSeleccionado),
    } as any);

    showAddedDialog({
      title: producto.nombre,
      image: imagenActiva || producto.galeria?.[0] || producto.imagen,
    });
  };

  return (
    <>
      <main className="max-w-[1300px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-base leading-relaxed mt-20">
        <div className="flex flex-col h-full">
          <div className="sticky top-24">
            <div className="flex gap-6">
              <div className="flex flex-col gap-3 w-24">
                {galeria.map((img, i) => {
                  const isActive = activeIndex === i;
                  return (
                    <button
                      type="button"
                      key={`${producto._id || producto.nombre}-img-${i}`}
                      onClick={() => setActiveIndex(i)}
                      className={`group relative overflow-hidden rounded-md border-2 transition-all duration-200 ${
                        isActive
                          ? "border-black shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      aria-pressed={isActive}
                    >
                      <Image
                        src={img}
                        alt={`${producto.nombre} ${i + 1}`}
                        width={90}
                        height={120}
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 flex items-start justify-center">
                <div
                  className="overflow-hidden rounded-md cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                >
                  <Image
                    key={imagenActiva}
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
                ${precioFinal.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="mt-3">
              <Link
                href="/guia-de-talles"
                className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
              >
                <span aria-hidden="true">📏</span>
                <span>Guía de talles</span>
              </Link>
            </div>
          </div>

          {talles.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 text-lg">Talle</h3>
              <div className="flex flex-wrap gap-2">
                {talles.map((t) => {
                  const restante = getStockRestante(t.label);
                  const disabled = restante <= 0;
                  const active = talleSeleccionado === t.label;

                  return (
                    <button
                      key={t.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setTalleSeleccionado(t.label);
                        if (cantidad > Math.max(restante, 1)) {
                          setCantidad(1);
                        }
                      }}
                      className={`min-w-[56px] px-4 py-2 rounded-md border text-sm font-medium transition ${
                        active
                          ? "bg-black text-white border-black"
                          : disabled
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-black border-gray-300 hover:border-black"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {talleSeleccionado && (
                <p className="mt-2 text-sm text-gray-600">
                  Stock disponible: {Math.max(stockDisponible, 0)}
                </p>
              )}
            </div>
          )}

          {tieneColores && (
            <div>
              <h3 className="font-medium mb-3 text-lg">Color</h3>
              <select
                className="border rounded-md px-3 py-2 w-full max-w-xs"
                value={colorSeleccionado}
                onChange={(e) => setColorSeleccionado(e.target.value)}
              >
                <option value="">Seleccionar color</option>
                {producto.colores!.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2 text-lg">Cantidad</h3>
            <div className="flex items-center border rounded-md w-48">
              <button
                type="button"
                onClick={() => handleCantidad(-1)}
                disabled={cantidad <= 1}
                className="px-4 py-2 text-xl"
              >
                –
              </button>
              <span className="flex-1 text-center">{cantidad}</span>
              <button
                type="button"
                onClick={() => handleCantidad(1)}
                disabled={talleSeleccionado ? cantidad >= stockDisponible : true}
                className="px-4 py-2 text-xl disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-4 rounded-md font-medium text-lg hover:bg-gray-900 transition"
          >
            Añadir al carrito
          </button>

          {producto.descripcion && (
            <div className="pt-4 border-t text-gray-700 space-y-2">
              <h3 className="font-semibold text-lg">Descripción</h3>
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
                      Nuestros productos están pensados para combinar diseño, calidad y uso diario.
                    </p>
                    <p><strong>Cuidados</strong></p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Limpiar con paño húmedo o cepillo suave.</li>
                      <li>No usar lavandina ni productos abrasivos.</li>
                      <li>Secar a la sombra.</li>
                    </ul>
                  </div>
                ),
              },
              {
                title: "Retiros y Envíos",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p>Enviamos a todo el país excepto Tierra del Fuego.</p>
                    <p>Despacho de 48hs a 72hs hábiles luego de acreditado el pago.</p>
                  </div>
                ),
              },
              {
                title: "Cambios y Devoluciones",
                content: (
                  <div className="space-y-3 text-base leading-relaxed">
                    <p>Tenés hasta 30 días desde la recepción del pedido para solicitar cambios o devoluciones.</p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>

      <ServiciosDiferencia />

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

function normalizeSizes(raw: any): { label: string; inStock?: boolean }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) =>
      typeof t === "string"
        ? { label: t, inStock: true }
        : { label: t.label, inStock: t.inStock }
    );
  }
  return [];
}