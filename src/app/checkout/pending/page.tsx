export default function PendingPage() {
  return (
    <main className="p-10 text-center">
      <h1 className="text-2xl font-bold text-amber-600">⌛ Pago pendiente</h1>
      <p className="mt-2 text-gray-700">
        Tu pago está siendo procesado.  
        Te notificaremos por email una vez que se acredite.
      </p>
      <a
        href="/"
        className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-md"
      >
        Volver al inicio
      </a>
    </main>
  )
}
