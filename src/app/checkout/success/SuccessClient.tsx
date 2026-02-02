"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/context/CartContext"

type UiState =
  | "checking"
  | "approved_waiting_stock"
  | "cleared"
  | "not_approved"
  | "error"

export default function SuccessClient() {
  const sp = useSearchParams()
  const { clearCart } = useCart()
  const [ui, setUi] = useState<UiState>("checking")
  const [msg, setMsg] = useState<string>("Confirmando tu pago…")

  // evita loops
  const ran = useRef(false)

  const merchantOrderId = sp.get("merchant_order_id") || ""
  const paymentIdFromUrl =
    sp.get("payment_id") || sp.get("collection_id") || ""
  const preferenceId = sp.get("preference_id") || ""

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      try {
        setUi("checking")
        setMsg("Confirmando tu pago…")

        // Si no tenemos merchant_order_id ni payment_id, no podemos confirmar
        if (!merchantOrderId && !paymentIdFromUrl) {
          setUi("error")
          setMsg("No pudimos identificar la orden para confirmar el pago.")
          return
        }

        // Polling: hasta 10 intentos, cada 2s (20s total)
        const maxTries = 10
        const waitMs = 2000

        for (let i = 1; i <= maxTries; i++) {
          const qs = new URLSearchParams()
          if (merchantOrderId) qs.set("merchant_order_id", merchantOrderId)
          if (!merchantOrderId && paymentIdFromUrl) qs.set("payment_id", paymentIdFromUrl)

          const res = await fetch(`/api/checkout/confirm?${qs.toString()}`, {
            cache: "no-store",
          })
          const data = await res.json().catch(() => null)

          if (!res.ok || !data?.ok) {
            setUi("error")
            setMsg("Hubo un problema confirmando el pago. Podés reintentar.")
            return
          }

          // 1) No aprobado
          if (!data.approved) {
            setUi("not_approved")
            setMsg(
              `Tu pago todavía no figura aprobado (estado: ${String(data.mpStatus || "unknown")}).`
            )
            return
          }

          // 2) Aprobado pero webhook aún no procesó (marker no existe)
          if (data.approved && !data.processed) {
            setUi("approved_waiting_stock")
            setMsg(
              `Pago aprobado. Esperando confirmación final de stock… (intento ${i}/${maxTries})`
            )
            await new Promise((r) => setTimeout(r, waitMs))
            continue
          }

          // 3) Aprobado + procesado → limpiamos carrito
          if (data.approved && data.processed) {
            clearCart()
            localStorage.setItem("cart", "[]")
            localStorage.removeItem("lastOrder")
            setUi("cleared")
            setMsg("Pago confirmado. Tu carrito fue vaciado.")
            return
          }
        }

        // Si se agotaron los intentos:
        setUi("approved_waiting_stock")
        setMsg(
          "Pago aprobado. Todavía estamos confirmando el stock. Si no se actualiza en unos minutos, escribinos."
        )
      } catch (e) {
        console.error("error success:", e)
        setUi("error")
        setMsg("Hubo un problema confirmando el pago.")
      }
    }

    run()
  }, [merchantOrderId, paymentIdFromUrl, preferenceId, clearCart])

  return (
    <main className="max-w-2xl mx-auto p-8 text-center space-y-6">
      <h1 className="text-2xl font-bold">Resultado del pago</h1>

      <p className="text-gray-700">{msg}</p>

      <div className="flex gap-3 justify-center flex-wrap">
        <Link
          href="/productos"
          className="inline-block bg-black text-white px-4 py-2 rounded"
        >
          Seguir comprando
        </Link>

        {(ui === "not_approved" || ui === "error") && (
          <Link
            href="/checkout"
            className="inline-block border px-4 py-2 rounded"
          >
            Volver al checkout
          </Link>
        )}
      </div>
    </main>
  )
}
