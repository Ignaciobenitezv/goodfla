'use client'

export default function SeccionContacto() {
  // WhatsApp: número en formato internacional sin "+" ni guiones
  const phone = '5403624545344' // +5403624545344
  const presetMessage = 'Necesito consultar sobre..'
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(presetMessage)}`

  return (
    <section className="bg-white py-20 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      
<section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-marca-amarillo py-12">
  <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-widest text-black">
    CONTACTANOS
  </h1>
</section>
      <hr className="border-t border-gray-300" />

      {/* Texto */}
      <div className="bg-white py-12 px-4 md:px-8 text-center text-justify text-black space-y-6 max-w-4xl mx-auto text-lg leading-relaxed">
        <p>
          Hola, estamos aquí para ayudarte a responder cualquier pregunta sobre nuestros productos, envíos, devoluciones, guías de tamaño,
          fechas de entrega o cualquier otra duda que tengas en mente.
        </p>
        <p>
          Explícanos el problema que estás experimentando detallando tu dirección de correo electrónico, número de pedido y el nombre
          vinculado a tu cuenta Goodfla para que podamos ayudarte.
        </p>
        <p>
          Si tienes problemas técnicos para completar la orden, puedes enviarnos una grabación o captura de pantalla del error que muestra el sitio web, y nuestro equipo de soporte técnico te ayudará a resolverlo.
        </p>
        <p>
          Podés escribirnos por WhatsApp y te respondemos dentro de 1 a 2 días hábiles.
        </p>

        {/* Botón WhatsApp */}
        <div className="pt-8 justify-center flex">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex items-center justify-center rounded-full bg-marca-amarillo px-6 py-3 font-bold text-black shadow-sm transition hover:bg-marca-gris focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
            aria-label="Abrir WhatsApp para consultas"
          >
            Consultar por Whatsapp
          </a>
        </div>
      </div>
    </section>
  )
}
