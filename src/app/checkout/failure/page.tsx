"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Phase = "checking" | "failed"

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export default function FailurePage() {
  const [phase, setPhase] = useState<Phase>("checking")
  const [progress, setProgress] = useState<number>(8)

  useEffect(() => {
    // 1) Animación de validación (sube a ~70%)
    const start = Date.now()
    const checkingMs = 900 // duración de “validando”
    const tickMs = 40

    const t = setInterval(() => {
      const elapsed = Date.now() - start
      const p = 8 + (elapsed / checkingMs) * 62 // 8 → 70
      setProgress(clamp(p, 8, 70))

      if (elapsed >= checkingMs) {
        clearInterval(t)

        // 2) Transición a fallado (rojo)
        setPhase("failed")
        setTimeout(() => setProgress(100), 120) // completa la barra con delay suave
      }
    }, tickMs)

    return () => clearInterval(t)
  }, [])

  const isFailed = phase === "failed"

  return (
    <main className="min-h-[100dvh] relative overflow-hidden pt-28">
      {/* Background wash: neutral -> rojo */}
      <div
        className={[
          "absolute inset-0 bg-gradient-to-b transition-opacity duration-500",
          isFailed
            ? "from-rose-500/30 to-red-600/20 opacity-90"
            : "from-sky-500/15 to-slate-900/10 opacity-80",
        ].join(" ")}
      />

      {/* Wipe rojo al fallar (tipo MP) */}
      <div
        className={[
          "absolute inset-0 pointer-events-none",
          "transition-transform duration-700 ease-out",
          isFailed ? "translate-y-0" : "translate-y-full",
          "bg-rose-500/30",
        ].join(" ")}
      />

      <section className="relative max-w-xl mx-auto px-6 py-10">
        <div
          className={[
            "rounded-3xl bg-white/85 backdrop-blur-md shadow-xl ring-1 p-7 md:p-8 text-center",
            isFailed ? "ring-rose-400/30" : "ring-sky-300/25",
          ].join(" ")}
        >
          {/* Header */}
          <p className="text-sm text-slate-500">
            {isFailed ? "Atención" : "Procesando pago"}
          </p>

          <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            {isFailed ? "Pago rechazado" : "Validando pago"}
          </h1>

          <p className="mt-3 text-slate-600">
            {isFailed
              ? "Hubo un problema al procesar tu pago. Revisá tus datos o probá con otro método de pago."
              : "Estamos confirmando el resultado de tu pago. Esto puede demorar unos segundos…"}
          </p>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>{isFailed ? "Estado" : "Validando"}</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  isFailed ? "bg-rose-600" : "bg-slate-900",
                ].join(" ")}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Acciones: aparecen cuando falla */}
          <div
            className={[
              "mt-7 flex flex-wrap gap-3 justify-center transition-opacity duration-300",
              isFailed ? "opacity-100" : "opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 transition"
            >
              Intentar nuevamente
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50 transition"
            >
              Volver a la tienda
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
