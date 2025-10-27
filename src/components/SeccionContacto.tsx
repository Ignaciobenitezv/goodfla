'use client'

import { useState } from 'react'

export default function SeccionContacto() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    asunto: 'General',
    mensaje: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <section className="bg-white py-20 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      <section className="bg-marca-crema py-12">
  <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-widest text-black">CONTACTANOS</h1>
</section>

<hr className="border-t border-gray-300" />

<div className="bg-white py-12 px-4 md:px-8 text-center text-black space-y-6 max-w-4xl mx-auto text-lg leading-relaxed">
  <p>
    Hola, estamos aquí para ayudarte a responder cualquier pregunta sobre nuestros productos, envíos, devoluciones, guías de tamaño,
    fechas de entrega o cualquier otra duda que tengas en mente.
  </p>
  <p>
    Explícanos el problema que estás experimentando detallando tu dirección de correo electrónico, número de pedido y el nombre
    vinculado a tu cuenta Goodfla para que podamos ayudarte.
  </p>
  <p>
    Si tienes problemas técnicos para completar la orden, puedes enviarnos una grabación o captura de pantalla del error que muestra el sitio web, y nuestro equipo de soporte técnico te ayudará a resolverlo.
  </p>
  <p>
    Comunícate con nosotros mediante el siguiente formulario y dentro de 1 a 2 días hábiles recibirás tu respuesta.
  </p>
</div>


      {/* Formulario */}
      <form className="space-y-6">
        <p className="text-sm font-medium text-gray-700 text-red-500">"*” (señala los campos obligatorios)</p>

        {/* Nombre y Apellido */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-marca-crema"
              placeholder="Nombre"
              required
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Apellido</label>
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              className="w-full border border-gray-300 px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-marca-crema"
              placeholder="Apellido"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block font-bold mb-1">
            Tu email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-marca-crema"
            placeholder="ejemplo@email.com"
            required
          />
        </div>

        {/* Asunto */}
        <div>
          <label className="block font-bold mb-1">
            ¿Sobre qué es tu consulta? <span className="text-red-500">*</span>
          </label>
          <select
            name="asunto"
            value={form.asunto}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-marca-crema"
            required
          >
            <option value="General">General</option>
            <option value="Envíos">Envíos</option>
            <option value="Talles">Guía de talles</option>
            <option value="Devoluciones">Devoluciones</option>
          </select>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block font-bold mb-1">
            Mensaje <span className="text-red-500">*</span>
          </label>
          <textarea
            name="mensaje"
            value={form.mensaje}
            onChange={handleChange}
            rows={6}
            maxLength={600}
            className="w-full border border-gray-300 px-4 py-3 rounded focus:outline-none focus:ring-2 focus:ring-marca-crema"
            placeholder="Envíanos un mensaje o una consulta."
            required
          />
          <p className="text-sm text-gray-600 mt-1">{form.mensaje.length} de 600 caracteres máximos</p>
        </div>

        {/* Botón (desactivado por ahora) */}
        <button
          type="submit"
          disabled
          className="bg-marca-crema text-white py-3 px-6 rounded-full font-bold cursor-not-allowed opacity-60"
        >
          Enviar consulta (próximamente)
        </button>
      </form>
    </section>
  )
}
