"use client"

import { useCart } from "@/context/CartContext"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function CarritoPage() {
  const { items } = useCart()
  const router = useRouter()

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tu carrito</h1>

      {items.length === 0 ? (
        <p className="text-gray-500">Tu carrito está vacío 🛒</p>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-center border-b pb-3">
              <Image
                src={item.imagen}
                alt={item.nombre}
                width={70}
                height={90}
                className="rounded object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">{item.nombre}</p>
                <p className="text-sm text-gray-500">
                  ${item.precio} × {item.cantidad}
                </p>
              </div>
            </div>
          ))}

          <div className="flex justify-between font-bold text-lg mt-4">
            <span>Total:</span>
            <span>${total}</span>
          </div>

          <button
            className="w-full bg-black text-white py-3 rounded mt-6"
            onClick={() => router.push("/checkout")}
          >
            Finalizar compra
          </button>
        </>
      )}
    </main>
  )
}
