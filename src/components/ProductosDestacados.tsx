'use client'

import Image from 'next/image'

type Producto = {
  id: number
  nombre: string
  precio: number
  imagen: string
}

const productos: Producto[] = [
  {
    id: 1,
    nombre: 'Top Flex Negro',
    precio: 13999,
    imagen: '/top.jpg',
  },
  {
    id: 2,
    nombre: 'Calza Move Gris',
    precio: 18999,
    imagen: '/calzag.jpg',
  },
  {
    id: 3,
    nombre: 'Conjunto Power Pink',
    precio: 25999,
    imagen: '/conjunto.jpg',
  },
]

export default function ProductosDestacados() {
  return (
    <section className="bg-marca-blanco py-20 px-4">
      <h2 className="text-3xl font-bold text-center text-marca-gris mb-12">Destacados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {productos.map((prod) => (
          <div key={prod.id} className="bg-white rounded-3xl overflow-hidden shadow hover:shadow-xl transition">
            <Image
              src={prod.imagen}
              alt={prod.nombre}
              width={400}
              height={500}
              className="w-full h-[450px] object-cover"
            />
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-marca-crema mb-2">{prod.nombre}</h3>
              <p className="text-marca-beige font-bold text-xl mb-4">${prod.precio}</p>
              <button className="bg-marca-piedra text-white py-2 px-6 rounded-full hover:bg-marca-gris transition">
                Agregar al carrito
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
