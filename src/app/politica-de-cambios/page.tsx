// app/politica-de-cambios/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cambios | Goodfla",
  description:
    "Conocé los plazos, condiciones y proceso para solicitar cambios o devoluciones de tus compras.",
  openGraph: {
    title: "Política de Cambios | Goodfla",
    description:
      "Información clara sobre cambios y devoluciones: plazos, condiciones y pasos a seguir.",
    type: "article",
    url: "/politica-de-cambios",
  },
};

export default function PoliticaDeCambiosPage() {
  // WhatsApp
  // Para wa.me se usa el número en formato internacional sin + ni guiones.
  const phone = "5403624545344"; // dado por el cliente: +5403624545344
  const presetMessage = "Quiero consultarte sobre ..";
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(presetMessage)}`;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">

      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-marca-amarillo py-12">
  <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-widest text-black">
    Política de Cambios
  </h1>
</section>

      <p className="mt-2 text-zinc-600">
        Queremos que tengas una experiencia excelente. A continuación, te
        dejamos nuestra política de cambios y devoluciones de forma clara y
        transparente.
      </p>

      <section className="mt-8 space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Plazos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
            <li>
              <strong>Cambios:</strong> hasta <strong>15 días corridos</strong>
              {" "}desde la fecha de entrega.
            </li>
            <li>
              <strong>Devoluciones:</strong> dentro de los{" "}
              <strong>10 días</strong> por arrepentimiento de compra conforme a
              la normativa vigente.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Condiciones</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
            <li>La prenda debe estar <strong>sin uso</strong>, limpia y en perfecto estado.</li>
            <li>Conservar <strong>etiquetas</strong> y <strong>packaging</strong> original.</li>
            <li>Presentar <strong>comprobante de compra</strong> (pedido o ticket).</li>
            <li>
              Los cambios están sujetos a <strong>disponibilidad de stock</strong>.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Costos de envío</h2>
          <p className="mt-2 text-zinc-700">
            Si el cambio es por talle o preferencia, el costo de envío y
            reenvío corre por cuenta del comprador. Si la causa es un error
            nuestro o una falla de fábrica, <strong>nos hacemos cargo</strong> del
            retiro y reenvío.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Proceso para solicitar un cambio</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-zinc-700">
            <li>
              Escribinos por WhatsApp indicando <strong>número de pedido</strong>,
              <strong> prenda</strong> y el <strong>motivo</strong> del cambio.
            </li>
            <li>
              Te confirmamos la <strong>disponibilidad</strong> y coordinamos el
              retiro/envío.
            </li>
            <li>
              Una vez recibido y verificado el estado, enviamos la{" "}
              <strong>prenda de reemplazo</strong> o gestionamos la devolución según corresponda.
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Excepciones</h2>
          <p className="mt-2 text-zinc-700">
            No se aceptan cambios de prendas usadas, manchadas, lavadas o
            con roturas. Los productos en <strong>promo o liquidación</strong> pueden
            tener políticas especiales, detalladas en la página del producto.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <h3 className="text-lg font-semibold">¿Necesitás ayuda con un cambio?</h3>
          <p className="mt-1">
            Escribinos y te asesoramos con el talle, disponibilidad o el
            seguimiento del pedido.
          </p>

          <div className="mt-4">
            <Link
              href={waUrl}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-600 px-5 py-3 font-medium text-emerald-50 bg-emerald-600 hover:bg-emerald-700 transition"
            >
              Consultar por WhatsApp
            </Link>
          </div>

          <p className="mt-3 text-xs opacity-80">
            Al hacer clic se abrirá WhatsApp con el mensaje: “{presetMessage}”
          </p>
        </div>
      </section>
    </main>
  );
}
