'use client'

import Link from 'next/link'
import Image from 'next/image'

type Categoria = {
  label: string
  img: string
}

const categorias: Categoria[] = [
  { label: 'Calzas', img: '/calza1.jpg' },
  { label: 'Tops', img: '/top1.jpg' },
  { label: 'Conjuntos', img: '/conjunto.jpg' },
  { label: 'Accesorios', img: '/accesorio.jpg' },
]

export default function CategoriasGrid() {
  return (
    <section className="py-20 px-6 bg-marca-crema">
      <h2 className="text-3xl font-bold text-center text-marca-gris mb-12">Explorá por categoría</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {categorias.map((cat) => (
          <Link key={cat.label} href={`/productos/${cat.label.toLowerCase()}`}>
            <div className="cursor-pointer group">
              <Image
                src={cat.img}
                alt={cat.label}
                width={300}
                height={200}
                className="w-full h-48 object-cover rounded-xl group-hover:opacity-90 transition"
              />
              <p className="mt-2 font-semibold text-marca-gris text-center">{cat.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
