"use client"

import { useCart } from "@/context/CartContext"
import { useUi } from "@/context/UiContext"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"


export default function CartDrawer() {
  const { isCartOpen, closeCart } = useUi()
  const {
  items,
  removeItem,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
  quote,
  couponCode,
  couponStatus,
  couponDiscount,
  couponError,
  appliedCoupon,
  setCouponCode,
  applyCoupon,
  clearCoupon,
} = useCart()

const quoteLoading = items.length > 0 && !quote
const subtotal = quote?.subtotal ?? 0
const total = quote?.computedTotal ?? 0


const subtotalSinPromo = useMemo(() => {
  return items.reduce(
    (sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 0),
    0
  )
}, [items])

const totalPares = useMemo(() => {
  return items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0)
}, [items])

const descuento = useMemo(() => {
  if (quoteLoading) return 0
  return Math.max(0, subtotalSinPromo - total)
}, [quoteLoading, subtotalSinPromo, total])

const [couponInput, setCouponInput] = useState(couponCode || "")

useEffect(() => {
  setCouponInput(couponCode || "")
}, [couponCode])

const totalFinalConCoupon = Math.max(0, total - couponDiscount)

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
            <p className="text-center text-gray-500">Tu carrito está vacío </p>
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
  Precio de lista: <span className="font-semibold">${Number(item.precio).toLocaleString("es-AR")}</span>
</p>
<p className="text-xs text-green-700">
  Promociones aplicadas en el total 
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
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Pares</span>
      <span className="text-gray-600 font-medium">{totalPares}</span>
    </div>

    {/* Subtotal sin promo */}
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Subtotal</span>
      <span className="text-gray-600">
        ${subtotalSinPromo.toLocaleString("es-AR")}
      </span>
    </div>
{/* Descuento promo */}
{!quoteLoading && descuento > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-green-700 font-medium">Descuento</span>
    <span className="text-green-700 font-semibold">
      -${descuento.toLocaleString("es-AR")}
    </span>
  </div>
)}

{/* Cupón */}
<div className="space-y-2">
  <label className="block text-sm font-medium">Cupón de descuento</label>

  <div className="flex gap-2">
    <input
      type="text"
      value={couponInput}
      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
      placeholder="Ingresá tu cupón"
      className="flex-1 border rounded px-3 py-2 text-sm"
    />
    <button
      type="button"
      onClick={() => {
  setCouponCode(couponInput)
  applyCoupon(subtotalSinPromo, couponInput)
}}
      className="px-4 py-2 rounded bg-black text-white text-sm"
    >
      Aplicar
    </button>
  </div>

  {couponStatus === "applied" && appliedCoupon && (
    <div className="flex items-center justify-between text-sm text-green-700">
      <span>Cupón aplicado: {appliedCoupon.code}</span>
      <button
        type="button"
        onClick={() => {
          setCouponInput("")
          clearCoupon()
        }}
        className="underline"
      >
        Quitar
      </button>
    </div>
  )}

  {couponError && (
    <p className="text-sm text-red-600">{couponError}</p>
  )}
</div>

{/* Descuento cupón */}
{couponDiscount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-green-700 font-medium">Descuento cupón</span>
    <span className="text-green-700 font-semibold">
      -${couponDiscount.toLocaleString("es-AR")}
    </span>
  </div>
)}

<div className="h-px bg-gray-200" />


            

            {/* Total */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-extrabold">
  {quoteLoading ? "Calculando..." : `$${Number(totalFinalConCoupon).toLocaleString("es-AR")}`}
</span>

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
