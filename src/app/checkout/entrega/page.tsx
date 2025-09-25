"use client"

import { useState } from "react"
import Link from "next/link"

export default function CheckoutEntrega() {
  const [cp, setCp] = useState("")
  const [envio, setEnvio] = useState("domicilio")

  return (
    <main className="max-w-[1100px] mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Entrega</h1>

      {/* Código Postal */}
      <div>
        <label className="block mb-2 font-medium">Código Postal</label>
        <input
          value={cp}
          onChange={e => setCp(e.target.value)}
          placeholder="Ingresa tu CP"
          className="border px-4 py-2 rounded w-64"
        />
      </div>

      {/* Métodos de entrega */}
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={envio === "domicilio"}
            onChange={() => setEnvio("domicilio")}
          />
          Envío a domicilio — <span className="font-bold">Gratis</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={envio === "sucursal"}
            onChange={() => setEnvio("sucursal")}
          />
          Retiro en sucursal — <span className="font-bold">Gratis</span>
        </label>
      </div>

      <Link
        href="/checkout/pago"
        className="px-6 py-3 bg-black text-white rounded"
      >
        Continuar para el pago
      </Link>
    </main>
  )
}
