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

  const paymentId =
    sp.get("payment_id") || sp.get("collection_id") || sp.get("preference_id")

  const statusRaw =
    sp.get("status") || sp.get("collection_status") || "approved"

  const status = String(statusRaw).toLowerCase()

  const merchantOrderId = sp.get("merchant_order_id") || ""
  const preferenceId = sp.get("preference_id") || ""

  useEffect(() => {
    ;(async () => {
      try {
        // ✅ Si MP dice approved, limpiamos SIEMPRE (UX) y no dependemos del confirm
        if (status === "approved") {
          clearCart()
          localStorage.setItem("cart", "[]")      // 👈 clave
          localStorage.removeItem("lastOrder")
        }

        // Si querés mantener el confirm (recomendado), lo dejamos
        const qs = new URLSearchParams()
        if (merchantOrderId) qs.set("merchant_order_id", merchantOrderId)
        if (preferenceId) qs.set("preference_id", preferenceId)

        if (qs.toString()) {
          const res = await fetch(`/api/checkout/confirm?${qs.toString()}`, {
            cache: "no-store",
          })
          const data = await res.json()

          if (!res.ok || !data?.ok) {
            // ya limpiamos si era approved, así que no rompemos UX
            console.warn("confirm failed:", data)
            setUi(status === "approved" ? "cleared" : "error")
            return
          }

          if (data.approved === false) {
            // si no aprobado, NO limpiamos (pero arriba ya chequeamos status)
            setUi("not_approved")
            return
          }
        }

        setUi(status === "approved" ? "cleared" : "checking")
      } catch (e) {
        console.error("error success:", e)
        setUi(status === "approved" ? "cleared" : "error")
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
        {ui === "not_approved" && "Tu pago todavía no figura aprobado."}
        {ui === "error" && "Hubo un problema confirmando el pago."}
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
