"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/context/CartContext"

type UiState = "checking" | "cleared" | "not_approved" | "error"

export default function SuccessClient() {
  const sp = useSearchParams()
  const { clearCart } = useCart()
  const [ui, setUi] = useState<UiState>("checking")

  // ✅ evita loops (por re-render + clearCart en deps, etc.)
  const ran = useRef(false)

  const paymentId =
    sp.get("payment_id") || sp.get("collection_id") || sp.get("preference_id")

  const statusRaw =
    sp.get("status") || sp.get("collection_status") || "approved"

  const status = String(statusRaw).toLowerCase()

  const merchantOrderId = sp.get("merchant_order_id") || ""
  const preferenceId = sp.get("preference_id") || ""

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
      try {
        // ✅ UX: si MP dice approved, limpiamos siempre el carrito (no dependemos de confirm)
        if (status === "approved") {
          clearCart()
          localStorage.setItem("cart", "[]")
          localStorage.removeItem("lastOrder")
          setUi("cleared")
        } else {
          setUi("checking")
        }

        // ✅ si EXISTE tu endpoint confirm, lo llamamos (pero si da 404, no rompemos ni bloqueamos UI)
        const qs = new URLSearchParams()
        if (merchantOrderId) qs.set("merchant_order_id", merchantOrderId)
        if (preferenceId) qs.set("preference_id", preferenceId)

        if (qs.toString()) {
          const res = await fetch(`/api/checkout/confirm?${qs.toString()}`, {
            cache: "no-store",
          })

          // Si no existe (404) u otro error, no generamos loop ni bloqueamos navegación
          if (!res.ok) {
            console.warn("confirm not available or failed:", res.status)
            if (status !== "approved") setUi("error")
            return
          }

          const data = await res.json()

          if (!data?.ok) {
            console.warn("confirm failed:", data)
            if (status !== "approved") setUi("error")
            return
          }

          if (data.approved === false) {
            setUi("not_approved")
            return
          }

          // si confirm ok y approved, ya quedó "cleared" arriba
          if (status === "approved") setUi("cleared")
        } else {
          // sin qs, al menos reflejamos el status
          if (status !== "approved") setUi("checking")
        }
      } catch (e) {
        console.error("error success:", e)
        setUi(status === "approved" ? "cleared" : "error")
      }
    })()
  }, [status, merchantOrderId, preferenceId, clearCart])

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
