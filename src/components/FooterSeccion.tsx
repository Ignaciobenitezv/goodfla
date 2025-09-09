'use client'

export default function FooterSeccion() {
  return (
    <section className="bg-marca-crema text-marca-gris py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
        {/* Columna 1 */}
        <div>
          <h3 className="uppercase font-semibold tracking-widest mb-4">Cuidados y detalles</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:underline">Preguntas frecuentes</a></li>
            <li><a href="#" className="hover:underline">Cuidado de las prendas</a></li>
            <li><a href="#" className="hover:underline">Términos y condiciones</a></li>
            <li><a href="#" className="hover:underline">Política de privacidad</a></li>
            <li><a href="#" className="hover:underline">Política de envíos</a></li>
            <li><a href="#" className="hover:underline">Política de devoluciones</a></li>
          </ul>
        </div>

        {/* Columna 2 */}
        <div>
          <h3 className="uppercase font-semibold tracking-widest mb-4">GoodFla Club</h3>
          <p className="text-sm mb-4">
            <strong className="block text-base mb-1">SUSCRIBITE</strong>
            Sé el primero en recibir las novedades, ofertas especiales y mucho más.
          </p>
          <form className="space-y-4">
            <input
              type="email"
              placeholder="email"
              className="w-full border-b border-black bg-transparent py-2 px-1 focus:outline-none text-sm"
            />
            <input
              type="text"
              placeholder="nombre"
              className="w-full border-b border-black bg-transparent py-2 px-1 focus:outline-none text-sm"
            />
            <button
              type="submit"
              className="block mx-auto md:mx-0 mt-2 underline text-sm font-semibold hover:text-marca-piedra transition"
            >
              Desbloquear descuento
            </button>
          </form>
        </div>

        {/* Columna 3 */}
        <div>
          <h3 className="uppercase font-semibold tracking-widest mb-4">Conectar</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:underline">Sobre nosotros</a></li>
            <li><a href="#" className="hover:underline">Contactanos</a></li>
            <li><a href="#" className="hover:underline">Encontranos aquí</a></li>
            <li><a href="#" className="hover:underline">Instagram</a></li>
            <li><a href="#" className="hover:underline">Tik Tok</a></li>
          </ul>
        </div>
      </div>
    </section>
  )
}
