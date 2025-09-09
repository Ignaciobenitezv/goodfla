'use client'

import { motion, useAnimation } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

export default function BeneficiosGrid() {
  const controls = useAnimation()
  const { ref, inView } = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } })
    } else {
      controls.start({ opacity: 0, y: 50, transition: { duration: 0.4, ease: 'easeIn' } })
    }
  }, [inView, controls])

  return (
    <section className="bg-white py-16 px-6 border-t border-gray-200" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={controls}
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-300 text-center gap-8"
      >
        {[
          {
            titulo: 'PRIMERA COMPRA',
            descripcion: 'Unite a nuestro canal de WhatsApp y ganate un descuento en tu primera compra.',
            linkText: 'Unirse',
            linkHref: '#',
          },
          {
            titulo: '#COMBOSGOODFLA',
            descripcion: '¡Armá tu combo como más te guste con prendas en tendencia!',
            linkText: 'Arma tu combo',
            linkHref: '#',
          },
          {
            titulo: 'MÉTODOS DE PAGO',
            descripcion: 'Aboná tu compra de la forma más conveniente. ',
            linkText: 'Ver más',
            linkHref: '#',
          },
          {
            titulo: 'ENVÍOS GRATIS',
            descripcion: 'Con tus compras mayores a $100.000.',
            linkText: '+ Info',
            linkHref: '#',
          },
        ].map((item, i) => (
          <div key={i} className="px-6">
            <h3 className="text-base font-bold tracking-wide text-marca-gris mb-2">{item.titulo}</h3>
            <p className="text-sm text-marca-gris mb-4 whitespace-pre-line">{item.descripcion}</p>
            <a
              href={item.linkHref}
              className="text-sm font-semibold text-marca-gris underline underline-offset-4 hover:text-marca-gris transition"
            >
              {item.linkText}
            </a>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
