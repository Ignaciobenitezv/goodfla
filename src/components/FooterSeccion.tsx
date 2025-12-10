'use client'

import Link from 'next/link'
import { FaWhatsapp } from 'react-icons/fa'

const WHATSAPP_MAYORISTA =
  'https://wa.me/5493624545344?text=Hola%20quiero%20unirme%20al%20grupo%20mayorista%20de%20Goodfla'

export default function FooterSeccion() {
  return (
    <section
      className="
        relative
        -mt-8
        bg-[url('/glow.png')]     /* Fondo desde /public */
        bg-cover
        bg-center
        bg-no-repeat

        before:absolute before:inset-0
        before:bg-black/75        /* Overlay negro */
        before:backdrop-blur-lg

        border-t border-white/15
        text-white
        py-12 md:py-16
        px-6
      "
    >
      {/* CONTENIDO — se mantiene igual, solo agrego z-10 para que quede arriba del overlay */}
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 text-center md:text-left">
        
        {/* COLUMNA 1 – CUIDADOS Y DETALLES */}
        <div>
          <h3 className="uppercase font-semibold tracking-[0.18em] text-xs md:text-sm mb-4">
            Cuidados y detalles
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <Link href="/cuidado-prendas" className="hover:text-marca-amarillo transition">
                Cuidado de las prendas
              </Link>
            </li>
            <li>
              <Link href="/guia-de-talles" className="hover:text-marca-amarillo transition">
                Guía de talles
              </Link>
            </li>
            <li>
              <Link href="/politica-de-devoluciones" className="hover:text-marca-amarillo transition">
                Política de devoluciones
              </Link>
            </li>
          </ul>
        </div>

        {/* COLUMNA 2 – GOODFLA CLUB */}
        <div>
          <h3 className="uppercase font-semibold tracking-[0.18em] text-xs md:text-sm mb-4">
            Goodfla Club
          </h3>

          <p className="text-sm text-white/80 mb-4 max-w-sm mx-auto md:mx-0">
            <span className="block text-base font-semibold mb-1">Suscribite</span>
            Unite a nuestro grupo exclusivo de mayoristas en WhatsApp para recibir
            lanzamientos, reposiciones y ofertas antes que nadie.
          </p>

          <a
            href={WHATSAPP_MAYORISTA}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center justify-center gap-2
              rounded-full
              border border-marca-amarillo/80
              bg-black/40
              px-5 py-2.5
              text-xs md:text-sm font-semibold tracking-wide
              text-marca-amarillo
              hover:bg-marca-amarillo hover:text-black
              hover:shadow-lg
              transition
            "
          >
            <FaWhatsapp className="w-4 h-4" />
            Unirme al grupo mayorista
          </a>
        </div>

        {/* COLUMNA 3 – CONECTAR */}
        <div>
          <h3 className="uppercase font-semibold tracking-[0.18em] text-xs md:text-sm mb-4">
            Conectar
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <Link href="/contacto" className="hover:text-marca-amarillo transition">
                Contacto
              </Link>
            </li>
            <li className="hover:text-marca-amarillo transition">
              Encontranos en:
              <br />
              <span className="text-white/70 text-xs">
                Av. Ejemplo 123, Resistencia, Chaco
              </span>
            </li>
            <li>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-marca-amarillo transition"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-marca-amarillo transition"
              >
                Tik Tok
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Línea inferior */}
      <div className="relative z-10 mt-10 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} Goodfla. Todos los derechos reservados.
      </div>
    </section>
  )
}
