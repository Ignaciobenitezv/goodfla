export default function PendingPage() {
  return (
    <main className="max-w-2xl mx-auto text-center py-20">
      <h1 className="text-3xl font-bold text-yellow-600 mb-4">⌛ Pago pendiente</h1>
      <p className="text-lg">Tu pago está en proceso de verificación. Te notificaremos cuando se confirme.</p>
      <a
        href="/"
        className="mt-8 inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800"
      >
        Volver a la tienda
      </a>
    </main>
  )
}
