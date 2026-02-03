import Link from "next/link"

export default function FailurePage() {
  return (
    <main className="min-h-[100dvh] relative overflow-hidden pt-28">
      {/* Background wash rojo */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-500/30 to-red-600/20 opacity-90" />

      <section className="relative max-w-xl mx-auto px-6 py-10">
        <div className="rounded-3xl bg-white/85 backdrop-blur-md shadow-xl ring-1 ring-rose-400/30 p-7 md:p-8 text-center">
          {/* Header */}
          <p className="text-sm text-slate-500">Atención</p>

          <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Pago rechazado
          </h1>

          <p className="mt-3 text-slate-600">
            Hubo un problema al procesar tu pago. Revisá tus datos o probá con
            otro método de pago.
          </p>

          {/* Barra visual (roja, completa) */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Estado</span>
              <span>100%</span>
            </div>

            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full w-full rounded-full bg-rose-600" />
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
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
