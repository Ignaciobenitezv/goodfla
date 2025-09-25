"use client"

export default function ServiciosDiferencia() {
  return (
    <section className="pt-16 border-t">
      <h2 className="text-3xl font-bold text-center mb-14">
        Servicios que marcan la diferencia
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
        {/* Item 1 */}
        <div className="flex flex-col items-center p-6 lg:p-8 space-y-5 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor"
            className="w-16 h-16 text-gray-800">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 9h16.5L21 12.75V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V9z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 9l3-6h12l3 6" />
          </svg>
          <h3 className="font-semibold text-xl">
            Envíos a todo el pais 
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Podés retirarlo o recibirlo lo antes posible en tu domicilio.
          </p>
        </div>

        {/* Item 2 */}
        <div className="flex flex-col items-center p-6 lg:p-8 space-y-5 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor"
            className="w-16 h-16 text-gray-800">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 7.5l9-4.5 9 4.5m-18 0l9 4.5 9-4.5m-18 0V16.5l9 4.5 9-4.5V7.5" />
          </svg>
          <h3 className="font-semibold text-xl">
            Cambios y Devoluciones asegurados
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Tenés 30 días para devolver o cambiar tus prendas.
          </p>
        </div>

        {/* Item 3 */}
        <div className="flex flex-col items-center p-6 lg:p-8 space-y-5 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor"
            className="w-16 h-16 text-gray-800">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-semibold text-xl">
            Servicio al cliente a tu disposición
          </h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            De 8hs a 00hs de Lunes a Lunes.
          </p>
        </div>
      </div>
    </section>
  )
}
