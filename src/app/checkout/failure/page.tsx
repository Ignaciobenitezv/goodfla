export default function FailurePage() {
  return (
    <main className="p-10 text-center">
      <h1 className="text-2xl font-bold text-red-600">❌ Pago rechazado</h1>
      <p className="mt-2 text-gray-700">
        Hubo un problema al procesar tu pago.  
        Revisá tus datos o probá con otro método de pago.
      </p>
      <a
        href="/checkout"
        className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-md"
      >
        Intentar nuevamente
      </a>
    </main>
  )
}
