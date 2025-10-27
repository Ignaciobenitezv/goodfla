"use client"

import { useCart } from "@/context/CartContext"
import Image from "next/image"
import { useEffect, useState } from "react"

export default function PagoPage() {
  const { items } = useCart()
  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  const [metodo, setMetodo] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  // ✅ Cargar SDK MercadoPago solo una vez
  useEffect(() => {
    if (document.getElementById("mp-sdk")) {
      setSdkReady(true)
      return
    }
    const script = document.createElement("script")
    script.id = "mp-sdk"
    script.src = "https://sdk.mercadopago.com/js/v2"
    script.type = "text/javascript"
    script.onload = () => {
      console.log("✅ SDK MercadoPago cargado")
      setSdkReady(true)
    }
    document.body.appendChild(script)
  }, [])

  // ✅ Crear preferencia al elegir MercadoPago
  useEffect(() => {
    if (metodo === "mercadopago") {
      const crearPreferencia = async () => {
        try {
          setLoading(true)
          const res = await fetch("/api/checkout/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          })
          const data = await res.json()
          if (data.id) {
            console.log("✅ Preferencia creada:", data.id)
            setPreferenceId(data.id)
          } else {
            console.error("❌ Error creando preferencia:", data)
          }
        } catch (err) {
          console.error("❌ Error:", err)
        } finally {
          setLoading(false)
        }
      }
      crearPreferencia()
    }
  }, [metodo, items])

  // ✅ Inicializar Brick cuando el SDK está cargado + hay preferenceId
  useEffect(() => {
    if (preferenceId && metodo === "mercadopago" && sdkReady) {
      const mp = new (window as any).MercadoPago(
        process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!,
        { locale: "es-AR" }
      )

      const bricksBuilder = mp.bricks()

      // Limpio antes de crear otro brick (por si cambia la preferencia)
      const container = document.getElementById("wallet_container")
      if (container) container.innerHTML = ""

      bricksBuilder.create("wallet", "wallet_container", {
        initialization: {
          preferenceId,
        },
        customization: {
          texts: { valueProp: "smart_option" },
        },
      })
    }
  }, [preferenceId, metodo, sdkReady])

  const handleConfirmar = () => {
    if (!metodo) {
      alert("Por favor seleccioná un método de pago.")
      return
    }
    if (metodo !== "mercadopago") {
      alert(`Confirmado con método: ${metodo} (falta implementar lógica real)`)
    }
  }

  return (
    <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
      {/* --------- FORM PRINCIPAL --------- */}
      <div className="md:col-span-2 space-y-10">
        {/* Stepper */}
        <div className="flex justify-between items-center text-sm uppercase font-medium border-b pb-4">
          <span className="text-gray-500">Carrito</span>
          <span className="text-gray-500">Entrega</span>
          <span className="text-black">Pago</span>
        </div>

        {/* Confirmación de datos */}
        <section className="space-y-4">
          <p className="text-sm text-amber-700 font-medium">
            ¡Gracias por elegirnos! Vas a recibir el código de seguimiento de tu pedido en unos pocos minutos. ¡Estate atento!
          </p>

          <div className="border p-4 rounded text-sm space-y-2">
            <p><strong>Email:</strong> sdsasd@gmail.com</p>
            <p><strong>Dirección:</strong> General Obligado 1521, CP 3500 – Quilmes, San Fernando, Chaco</p>
            <p><strong>Envío:</strong> Envío Gratis (llega entre jueves 18/09 y martes 23/09)</p>
            <button className="text-xs underline text-gray-500">Cambiar</button>
          </div>
        </section>

        {/* Notas de pedido */}
        <section>
          <h2 className="text-lg font-bold mb-2 uppercase">Notas de pedido</h2>
          <textarea
            placeholder="Agregá un comentario para tu pedido..."
            className="w-full border p-3 rounded text-sm"
          />
        </section>

        {/* Medio de pago */}
        <section>
          <h2 className="text-lg font-bold mb-4 uppercase">Medio de pago</h2>
          <div className="space-y-3">
            {[
              { id: "tarjeta", label: "Tarjeta de crédito o débito", detalle: "Hasta 3 cuotas sin interés" },
              { id: "transferencia", label: "Transferencia o Depósito Bancario", detalle: "10% de descuento" },
              { id: "efectivo", label: "Efectivo", detalle: "15% de descuento" },
              { id: "mercadopago", label: "MercadoPago", detalle: "Hasta 3 cuotas sin interés" },
              { id: "cuotas-mp", label: "Cuotas sin Tarjeta de Mercado Pago", detalle: "Cuotas sin interés" },
            ].map((opt) => (
              <label
                key={opt.id}
                className="block border p-4 rounded cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.detalle}</p>
                  </div>
                  <input
                    type="radio"
                    name="metodo"
                    value={opt.id}
                    checked={metodo === opt.id}
                    onChange={() => setMetodo(opt.id)}
                  />
                </div>

                {/* Renderizar Brick debajo de MercadoPago */}
                {opt.id === "mercadopago" && metodo === "mercadopago" && (
                  <div className="mt-4">
                    {loading && <p className="text-sm text-gray-500">Cargando pago seguro...</p>}
                    <div id="wallet_container"></div>
                  </div>
                )}
              </label>
            ))}
          </div>
        </section>

        <button
          onClick={handleConfirmar}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded mt-6"
        >
          {loading ? "Procesando..." : "Confirmar y pagar"}
        </button>
      </div>

      {/* --------- RESUMEN --------- */}
      <aside className="space-y-4 border p-4 rounded">
        {items.map((item, idx) => {
  const anyItem = item as any;
  const key =
    anyItem._id ??
    anyItem.slug ??
    `${item.nombre}-${(anyItem.talle ?? "")}-${(anyItem.color ?? "")}-${idx}`;

  return (
    <div key={key} className="flex gap-3 items-center border-b pb-2">
      <Image
        src={item.imagen}
        alt={item.nombre}
        width={60}
        height={80}
        className="object-cover rounded"
      />
      <div className="flex-1 text-sm">
        <p>{item.nombre}</p>
        <p className="font-bold">
          ${item.precio.toLocaleString("es-AR")} × {item.cantidad}
        </p>
      </div>
    </div>
  );
})}

        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>${total}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Costo de envío</span>
          <span>Gratis</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total</span>
          <span>${total}</span>
        </div>
      </aside>
    </main>
  )
}
