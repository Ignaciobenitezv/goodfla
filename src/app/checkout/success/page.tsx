"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { useCart } from "@/context/CartContext"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment_id")
  const status = searchParams.get("status")
  const merchantOrder = searchParams.get("merchant_order_id")
  const alreadyRan = useRef(false)

  const { clearCart } = useCart()

  useEffect(() => {
    if (alreadyRan.current) return
    alreadyRan.current = true

    // Solo si approved
    if (status !== "approved") return

    // 🔹 Ya no llamamos a /api/updateStock porque el webhook lo hace.
    // Solo limpiamos el carrito y el localStorage.

    localStorage.removeItem("lastOrder")
    localStorage.removeItem("cart")
    clearCart()
  }, [status, clearCart])

  return (
    <main className="max-w-2xl mx-auto text-center py-20">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ ¡Pago aprobado!
      </h1>
      <p className="text-lg">Gracias por tu compra. Tu pago fue procesado con éxito.</p>

      <div className="mt-6 bg-gray-100 p-4 rounded text-left">
        <p><strong>ID de pago:</strong> {paymentId}</p>
        <p><strong>Estado:</strong> {status}</p>
        <p><strong>Orden:</strong> {merchantOrder}</p>
      </div>

      <a href="/" className="mt-8 inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800">
        Volver a la tienda
      </a>
    </main>
  )
}
