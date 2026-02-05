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

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export default function SuccessClient() {
  const sp = useSearchParams()
  const { clearCart } = useCart()

  const [ui, setUi] = useState<UiState>("checking")
  const [msg, setMsg] = useState<string>("Confirmando tu pago…")
  const [progress, setProgress] = useState<number>(12) // arranca con algo visible

  const ran = useRef(false)

  const merchantOrderId = sp.get("merchant_order_id") || ""
  const paymentIdFromUrl = sp.get("payment_id") || sp.get("collection_id") || ""
  const preferenceId = sp.get("preference_id") || ""

  // Helpers UI
  const tone =
    ui === "cleared"
      ? "success"
      : ui === "error" || ui === "not_approved"
      ? "danger"
      : "neutral"

  const bgWashClass =
    tone === "success"
      ? "from-emerald-500/30 to-emerald-600/20"
      : tone === "danger"
      ? "from-rose-500/25 to-orange-500/15"
      : "from-sky-500/15 to-slate-900/10"

  const ringClass =
    tone === "success"
      ? "ring-emerald-400/30"
      : tone === "danger"
      ? "ring-rose-400/30"
      : "ring-sky-300/25"

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      try {
        setUi("checking")
        setMsg("Confirmando tu pago…")
        setProgress(18)

        if (!merchantOrderId && !paymentIdFromUrl) {
          setUi("error")
          setMsg("No pudimos identificar la orden para confirmar el pago.")
          setProgress(100)
          return
        }

        const maxTries = 10
        const waitMs = 2000

        for (let i = 1; i <= maxTries; i++) {
          // progreso “bonito” por etapa
          // 0–60: validación | 60–90: esperando procesamiento | 90–100: final
          const base = 10 + (i / maxTries) * 55
          setProgress(clamp(base))

          const qs = new URLSearchParams()
if (paymentIdFromUrl) qs.set("payment_id", paymentIdFromUrl)
else if (merchantOrderId) qs.set("merchant_order_id", merchantOrderId)


          const res = await fetch(`/api/checkout/confirm?${qs.toString()}`, {
            cache: "no-store",
          })
          const data = await res.json().catch(() => null)

          if (!res.ok || !data?.ok) {
            setUi("error")
            setMsg("Hubo un problema confirmando el pago. Podés reintentar.")
            setProgress(100)
            return
          }

          const mpStatus = String(data.mpStatus || "unknown").toLowerCase()

// Estados que NO son rechazo: hay que esperar (redirect puede tardar)
const waitingStatuses = new Set(["pending", "in_process", "authorized", "null", "unknown", ""])
const waitingDetail = String(data.mpStatusDetail || data.status_detail || data.statusDetail || "").toLowerCase()
const isWaitingDetail =
  waitingDetail.includes("pending") || waitingDetail.includes("in_process") || waitingDetail.includes("contingency")


if (!data.approved) {
  if (waitingStatuses.has(mpStatus)|| isWaitingDetail) {
    setUi("checking")
    setMsg(`Estamos confirmando tu pago… (estado: ${mpStatus}) intento ${i}/${maxTries}`)
    setProgress((p) => clamp(Math.max(p, 35) + 5))
    await new Promise((r) => setTimeout(r, waitMs))
    continue
  }

  // Rechazos reales
  setUi("not_approved")
  setMsg(`Tu pago no figura aprobado (estado: ${mpStatus}).`)
  setProgress(100)
  return
}


          if (data.approved && !data.processed) {
            setUi("approved_waiting_stock")
            setMsg(
              `Pago aprobado. Confirmando stock… (intento ${i}/${maxTries})`
            )
            // sube lento hacia 90 mientras espera
            setProgress((p) => clamp(Math.max(p, 65) + 6))
            await new Promise((r) => setTimeout(r, waitMs))
            continue
          }

          if (data.approved && data.processed) {
            // “wipe” final
            setProgress(96)
            clearCart()
            localStorage.setItem("cart", "[]")
            localStorage.removeItem("lastOrder")

            setUi("cleared")
            setMsg("Pago aprobado. Tu compra fue confirmada ✅")
            setTimeout(() => setProgress(100), 350)
            return
          }
        }

        setUi("approved_waiting_stock")
        setMsg(
          "Pago aprobado. Todavía estamos confirmando el stock. Si no se actualiza en unos minutos, escribinos."
        )
        setProgress(88)
      } catch (e) {
        console.error("error success:", e)
        setUi("error")
        setMsg("Hubo un problema confirmando el pago.")
        setProgress(100)
      }
    }

    run()
  }, [merchantOrderId, paymentIdFromUrl, clearCart])


  return (
    <main className="min-h-[100dvh] relative overflow-hidden pt-24 md:pt-28">
      {/* Background wash (tipo MercadoPago) */}
      <div
        className={[
          "absolute inset-0 bg-gradient-to-b transition-opacity duration-500",
          bgWashClass,
          ui === "cleared" ? "opacity-100" : "opacity-70",
        ].join(" ")}
      />

      {/* Screen wipe cuando success */}
      <div
        className={[
          "absolute inset-0 pointer-events-none",
          "transition-transform duration-700 ease-out",
          ui === "cleared" ? "translate-y-0" : "translate-y-full",
          "bg-emerald-500/35",
        ].join(" ")}
      />

      <section className="relative max-w-xl mx-auto px-6 py-10">
        <div
          className={[
            "rounded-3xl bg-white/80 backdrop-blur-md shadow-xl ring-1",
            ringClass,
            "p-7 md:p-8",
          ].join(" ")}
        >
          <header className="space-y-2">
            <p className="text-sm text-slate-500">
              {ui === "checking" && "Procesando pago"}
              {ui === "approved_waiting_stock" && "Pago aprobado"}
              {ui === "cleared" && "¡Listo!"}
              {(ui === "not_approved" || ui === "error") && "Atención"}
            </p>

            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              {ui === "cleared"
                ? "Compra confirmada"
                : ui === "approved_waiting_stock"
                ? "Confirmando stock"
                : ui === "checking"
                ? "Confirmando con MercadoPago"
                : ui === "not_approved"
                ? "Pago no aprobado"
                : "No pudimos confirmar"}
            </h1>

            <p className="text-slate-600">{msg}</p>
          </header>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>
                {ui === "checking" && "Validando pago"}
                {ui === "approved_waiting_stock" && "Procesando pedido"}
                {ui === "cleared" && "Completado"}
                {(ui === "not_approved" || ui === "error") && "Estado"}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  tone === "success"
                    ? "bg-emerald-600"
                    : tone === "danger"
                    ? "bg-rose-600"
                    : "bg-slate-900",
                ].join(" ")}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 transition"
            >
              Seguir comprando
            </Link>

            {(ui === "not_approved" || ui === "error") && (
              <Link
                href="/checkout"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition"
              >
                Volver al checkout
              </Link>
            )}
          </div>

          {/* Debug info sutil (opcional) */}
          <div className="mt-6 text-xs text-slate-400">
            {paymentIdFromUrl && <p>Pago: {paymentIdFromUrl}</p>}
            {merchantOrderId && <p>Orden: {merchantOrderId}</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
