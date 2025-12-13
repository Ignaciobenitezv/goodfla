'use client'

export default function SeccionContacto() {
  // WhatsApp: número en formato internacional sin "+"
  const phone = '5403624545344'
  const presetMessage = 'Hola! Quiero hacer una consulta sobre Goodfla 😊'
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(presetMessage)}`

  return (
    <section className="bg-white">
      {/* HERO */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-marca-amarillo py-16 mt-20">
        <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-widest text-black">
          CONTACTÁNOS
        </h1>
        <p className="mt-4 text-center text-black/80 text-base md:text-lg">
          Estamos para ayudarte 
        </p>
      </section>

      {/* CONTENIDO */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-20">
        <div
          className="
            bg-white
            rounded-2xl
            shadow-[0_20px_60px_rgba(0,0,0,0.08)]
            border border-gray-200
            p-8 md:p-12
            text-center
            space-y-6
          "
        >
          <p className="text-lg md:text-xl text-black leading-relaxed">
            ¿Tenés alguna duda sobre nuestros productos, talles, envíos o cambios?
            <br />
            <strong>Estamos acá para ayudarte.</strong>
          </p>

          <p className="text-base text-gray-700 leading-relaxed">
            Podés escribirnos con total tranquilidad.  
            Si ya hiciste una compra, contanos tu número de pedido y el nombre con el que compraste
            para poder asistirte más rápido.
          </p>

          <p className="text-base text-gray-700 leading-relaxed">
            ¿Tuviste algún inconveniente técnico al comprar?
            Si querés, podés enviarnos una captura o video y lo resolvemos juntos.
          </p>

          <p className="text-sm text-gray-500 pt-2">
            Respondemos dentro de <strong>1 a 2 días hábiles</strong>.
          </p>

          {/* CTA WhatsApp */}
          <div className="pt-8 flex justify-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener nofollow"
              className="
                inline-flex
                items-center
                gap-3
                rounded-full
                bg-marca-amarillo
                px-8
                py-4
                font-semibold
                text-black
                text-base
                shadow-md
                hover:shadow-lg
                hover:scale-[1.02]
                transition
                focus:outline-none
                focus:ring-2
                focus:ring-black/30
                focus:ring-offset-2
              "
              aria-label="Abrir WhatsApp para consultas"
            >
              💬 Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
