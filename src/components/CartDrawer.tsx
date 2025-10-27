"use client"

import { useCart } from "@/context/CartContext"
import { useUi } from "@/context/UiContext"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function CartDrawer() {
  const { isCartOpen, closeCart } = useUi()
  const { items, removeItem, clearCart, increaseQuantity, decreaseQuantity } = useCart()
  const [cp, setCp] = useState("3500") // ejemplo
  const [envio, setEnvio] = useState("domicilio")

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  return (
    <div
      className={`fixed inset-0 z-[9999] transition ${
        isCartOpen ? "visible" : "invisible"
      }`}
    >
      {/* Fondo oscuro */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
      />

      {/* Panel lateral */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-lg transform transition-transform flex flex-col ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold uppercase">Carrito de compras</h2>
          <button onClick={closeCart} className="text-2xl" type="button">×</button>
        </div>

        {/* Productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500">Tu carrito está vacío 🛒</p>
          ) : (
            items.map((item) => (
              <div
                key={item.cartKey} 
                className="flex gap-3 border-b pb-3"
              >
                <Image
                  src={item.imagen}
                  alt={item.nombre}
                  width={70}
                  height={90}
                  className="rounded object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{item.nombre}</h3>
                  {item.talle && (
                    <p className="text-xs text-gray-500">Talle: {item.talle}</p>
                  )}

                  {/* Subtotal por producto */}
                  <p className="text-xs text-gray-500">
                    <span className="font-bold">${item.precio}</span> × {item.cantidad} ={" "}
                    <span className="font-semibold">
                      ${item.precio * item.cantidad}
                    </span>
                  </p>

                  {/* Cantidad */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button" /* 👈 evita submit */
                      onClick={() => decreaseQuantity(item.cartKey)} /* 👈 usa cartKey */
                      className="px-2 border rounded"
                    >
                      –
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.cartKey)} /* 👈 usa cartKey */
                      className="px-2 border rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeItem(item.cartKey) /* 👈 usa SIEMPRE cartKey */
                  }}
                  className="p-2 rounded hover:bg-black/5 text-red-500 text-xs"
                  aria-label={`Eliminar ${item.nombre}`}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="font-medium">Subtotal (sin envío):</span>
              <span className="font-bold">${total}</span>
            </div>

            {/* CP */}
            <div className="flex items-center gap-2">
              <input
                value={cp}
                onChange={(e) => setCp(e.target.value)}
                className="border px-2 py-1 rounded w-32"
              />
              <button className="px-3 py-1 border rounded bg-gray-100" type="button">
                Cambiar CP
              </button>
            </div>

            {/* Mensaje */}
            <p className="text-sm text-amber-700 font-medium">
              ¡GRACIAS POR ELEGIRNOS! Vas a recibir el código de seguimiento en
              unos pocos minutos. ¡Estate atento!
            </p>

            {/* Envío */}
            <div className="space-y-2">
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

            {/* Total */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-extrabold">${total}</span>
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="flex-1 px-4 py-2 bg-gray-200 rounded"
                type="button"
              >
                Vaciar
              </button>
              <Link
                href="/carrito"
                onClick={closeCart}
                className="flex-1 px-4 py-2 bg-black text-white rounded text-center"
              >
                Finalizar compra
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
