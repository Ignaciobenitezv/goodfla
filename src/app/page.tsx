'use client'

import Link from 'next/link'
import LogoMarquee from '@/components/LogoMarquee'
import CategoriasDestacadas from '@/components/CategoriasDestacadas'
import { motion } from 'framer-motion'
import AnimatedButton from '@/components/AnimatedButton'
import BeneficiosGrid from '@/components/BeneficiosGrid'
import ProductosDestacados from '@/components/ProductosDestacados'
import CategoriasGrid from '@/components/CategoriasGrid'
import FooterSeccion from '@/components/FooterSeccion'

const productos = [
  {
    id: 1,
    nombre: 'Top Flex Negro',
    precio: 13999,
    imagen: 'https://via.placeholder.com/400x500',
  },
  {
    id: 2,
    nombre: 'Calza Move Gris',
    precio: 18999,
    imagen: 'https://via.placeholder.com/400x500',
  },
  {
    id: 3,
    nombre: 'Conjunto Power Pink',
    precio: 25999,
    imagen: 'https://via.placeholder.com/400x500',
  },
]

export default function Home() {
  return (
    <>
      {/* HERO principal */}
      <section
        className="relative h-[90vh] bg-cover bg-center"
        style={{ backgroundImage: 'url(/jean.jpg)' }} // Reemplazá con tu imagen real
      >
        <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center text-center text-white ">
          <p className="text-lg md:text-2xl mb-6 mt-80 max-w-xl">
            Esta semana 20% off en Tops
          </p>
          <Link href="/productos">
  <AnimatedButton />
</Link>
        </div>
      </section>
      <LogoMarquee />
      <CategoriasDestacadas />
      <BeneficiosGrid />

      {/* Sección de beneficios */}
      {/* Sección de categorías destacadas */}
      {/* Presentación de marca */}
      <section className="bg-marca-crema text-marca-gris py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Hecho para moverte</h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed">
          Cada prenda de VUCAS nace con un propósito: acompañarte en tu entrenamiento, darte confianza y adaptarse a vos. 
          Diseñamos pensando en cada detalle, combinando funcionalidad y estilo para que entrenar sea más cómodo, más tuyo.
        </p>
      </section>

      <ProductosDestacados />


      {/* Categorías */}
      <CategoriasGrid />


      {/* Imagen de campaña */}
      <section className="relative h-[60vh] bg-cover bg-center" style={{ backgroundImage: 'url(/post.png)' }}>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-center">
          <h2 className="text-4xl md:text-5xl font-bold">#VUCASmovement</h2>
        </div>
      </section>
<FooterSeccion />

    </>
  )
}
