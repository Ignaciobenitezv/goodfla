"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useCart } from "@/context/CartContext"

type UiState = "checking" | "cleared" | "not_approved" | "error"

export default function SuccessClient() {
  const sp = useSearchParams()
  const { clearCart } = useCart()
  const [ui, setUi] = useState<UiState>("checking")

  // MP suele enviar estos params
  const paymentId =
    sp.get("payment_id") || sp.get("collection_id") || sp.get("preference_id")
  const status = sp.get("status") || sp.get("collection_status") || "approved"
  const merchantOrderId = sp.get("merchant_order_id") || ""
  const preferenceId = sp.get("preference_id") || ""

  useEffect(() => {
    ;(async () => {
      try {
        // ✅ Confirmación server-side (más seguro que fiarse del query param)
        const qs = new URLSearchParams()
        if (merchantOrderId) qs.set("merchant_order_id", merchantOrderId)
        if (preferenceId) qs.set("preference_id", preferenceId)

        // Si MP no mandó ningún id, igual vaciamos solo si status dice approved (fallback)
        // pero lo ideal es que venga merchant_order_id
        if (!merchantOrderId && !preferenceId) {
          if (String(status).toLowerCase() === "approved") {
            clearCart()
            localStorage.removeItem("cart")
            localStorage.removeItem("lastOrder")
            setUi("cleared")
          } else {
            setUi("not_approved")
          }
          return
        }

        const res = await fetch(`/api/checkout/confirm?${qs.toString()}`, {
          cache: "no-store",
        })
        const data = await res.json()

        if (!res.ok || !data?.ok) {
          console.error("confirm failed:", data)
          setUi("error")
          return
        }

        if (data.approved === false) {
          setUi("not_approved")
          return
        }

        // ✅ Pago confirmado: vaciamos carrito real + storage
        clearCart()
        localStorage.removeItem("cart")
        localStorage.removeItem("lastOrder")
        setUi("cleared")
      } catch (e) {
        console.error("error confirmando pago:", e)
        setUi("error")
      }
    })()
  }, [merchantOrderId, preferenceId, status, clearCart])

  return (
    <main className="max-w-2xl mx-auto p-8 text-center space-y-6">
      <h1 className="text-2xl font-bold">¡Gracias por tu compra! 🎉</h1>

      <p>
        Estado del pago: <span className="font-semibold uppercase">{status}</span>
      </p>

      {paymentId && (
        <p>
          ID de pago: <span className="font-mono">{paymentId}</span>
        </p>
      )}

      {merchantOrderId && (
        <p>
          Orden: <span className="font-mono">{merchantOrderId}</span>
        </p>
      )}

      <p className="text-gray-600">
        {ui === "checking" && "Confirmando tu pago…"}
        {ui === "cleared" && "Pago confirmado. Tu carrito fue vaciado."}
        {ui === "not_approved" &&
          "Tu pago todavía no figura aprobado. Si en unos minutos no cambia, escribinos."}
        {ui === "error" &&
          "Hubo un problema confirmando el pago. Si ya te cobraron, escribinos."}
      </p>

      <Link
        href="/productos"
        className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
      >
        Seguir comprando
      </Link>
    </main>
  )
}
