// app/politica-de-cambios/page.tsx
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Cambios | Goodfla",
  description:
    "Conocé los plazos, condiciones y proceso para solicitar cambios o devoluciones de tus compras en Goodfla.",
  openGraph: {
    title: "Política de Cambios | Goodfla",
    description:
      "Información clara y transparente sobre cambios y devoluciones.",
    type: "article",
    url: "/politica-de-cambios",
  },
}

export default function PoliticaDeCambiosPage() {
  const phone = "5403624545344"
  const presetMessage = "Hola! Quiero consultar sobre un cambio o devolución 😊"
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(presetMessage)}`

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-marca-amarillo py-16 mt-20">
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-black">
          POLÍTICA DE CAMBIOS
        </h1>
        <p className="mt-4 text-center text-black/80 text-base md:text-lg">
          Transparencia, claridad y acompañamiento
        </p>
      </section>

      {/* CONTENIDO */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-20 space-y-8">
        <p className="text-lg text-center text-zinc-700 leading-relaxed">
          Queremos que tu experiencia con <strong>Goodfla</strong> sea excelente.
          Por eso te dejamos toda la información sobre cambios y devoluciones,
          explicada de forma simple y clara.
        </p>

        {/* PLAZOS */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Plazos</h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-700">
            <li>
              <strong>Cambios:</strong> hasta <strong>15 días corridos</strong> desde
              la fecha de entrega.
            </li>
            <li>
              <strong>Devoluciones:</strong> hasta <strong>10 días</strong> por
              arrepentimiento de compra, según normativa vigente.
            </li>
          </ul>
        </div>

        {/* CONDICIONES */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Condiciones</h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-700">
            <li>La prenda debe estar <strong>sin uso</strong> y en perfecto estado.</li>
            <li>Conservar <strong>etiquetas</strong> y <strong>packaging original</strong>.</li>
            <li>Presentar <strong>comprobante de compra</strong>.</li>
            <li>Los cambios están sujetos a <strong>disponibilidad de stock</strong>.</li>
          </ul>
        </div>

        {/* COSTOS */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Costos de envío</h2>
          <p className="text-zinc-700 leading-relaxed">
            Si el cambio es por talle o preferencia personal, los costos de envío
            corren por cuenta del comprador.  
            <br />
            Si se trata de un error nuestro o una falla de fábrica,
            <strong> Goodfla se hace cargo</strong> del retiro y reenvío.
          </p>
        </div>

        {/* PROCESO */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">
            ¿Cómo solicitar un cambio?
          </h2>
          <ol className="list-decimal pl-5 space-y-2 text-zinc-700">
            <li>
              Escribinos por WhatsApp indicando <strong>número de pedido</strong>,
              <strong> prenda</strong> y <strong>motivo</strong>.
            </li>
            <li>
              Te confirmamos disponibilidad y coordinamos el retiro o envío.
            </li>
            <li>
              Una vez recibido el producto, enviamos el reemplazo o gestionamos la
              devolución.
            </li>
          </ol>
        </div>

        {/* EXCEPCIONES */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Excepciones</h2>
          <p className="text-zinc-700 leading-relaxed">
            No se aceptan cambios de prendas usadas, lavadas, manchadas o dañadas.
            Los productos en <strong>promo o liquidación</strong> pueden tener
            condiciones especiales indicadas en su ficha.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-marca-amarillo/20 border border-marca-amarillo p-10 text-center">
          <h3 className="text-xl font-semibold text-black">
            ¿Necesitás ayuda con tu pedido?
          </h3>
          <p className="mt-2 text-black/80">
            Escribinos y te asesoramos con cambios, talles o seguimiento.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href={waUrl}
              target="_blank"
              rel="noopener nofollow"
              className="
                inline-flex items-center gap-2
                rounded-full
                bg-black
                text-white
                px-8 py-4
                font-semibold
                shadow-md
                hover:shadow-lg
                hover:scale-[1.02]
                transition
              "
            >
              💬 Consultar por WhatsApp
            </Link>
          </div>

          <p className="mt-3 text-xs text-black/60">
            Respondemos dentro de 1 a 2 días hábiles
          </p>
        </div>
      </section>
    </main>
  )
}
