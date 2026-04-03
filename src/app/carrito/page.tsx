"use client"

import { useCart } from "@/context/CartContext"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
 
export default function CarritoPage() {
  const {
  items,
  removeItem,
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
  const router = useRouter()
  const quoteLoading = items.length > 0 && !quote

const subtotalSinPromo = useMemo(() => {
  return items.reduce(
    (sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 0),
    0
  )
}, [items])

const totalConPromo = quote?.computedTotal ?? 0
const totalPares = useMemo(() => {
  return items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0)
}, [items])
const descuento = useMemo(() => {
  if (quoteLoading) return 0
  return Math.max(0, subtotalSinPromo - totalConPromo)
}, [quoteLoading, subtotalSinPromo, totalConPromo])
const [couponInput, setCouponInput] = useState(couponCode || "")

useEffect(() => {
  setCouponInput(couponCode || "")
}, [couponCode])

const totalFinalConCoupon = Math.max(0, totalConPromo - couponDiscount)
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 mt-20">
      <h1 className="text-3xl font-semibold mb-8">Tu carrito</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Tu carrito está vacío </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          {/* ================= LISTA PRODUCTOS ================= */}
          <section className="space-y-6">
            {items.map((item, idx) => {
              const key =
                item.cartKey ??
                `${item.productId}__${item.talle ?? "default"}__${idx}`

              return (
                <div
                  key={key}
                  className="
                    flex gap-4 items-center
                    rounded-xl
                    bg-white/80
                    backdrop-blur-lg
                    border border-gray-200
                    p-4
                    shadow-sm
                  "
                >
                  <Image
                    src={item.imagen}
                    alt={item.nombre}
                    width={90}
                    height={120}
                    className="rounded-md object-cover"
                  />

                  <div className="flex-1">
                    <p className="font-medium text-base">{item.nombre}</p>

                    {item.talle && (
                      <p className="text-xs text-gray-500">Talle: {item.talle}</p>
                    )}

                    <p className="text-sm text-gray-600 mt-1">
                      ${Number(item.precio).toLocaleString("es-AR")}
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.cartKey)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center"
                        disabled={item.cantidad <= 1}
                      >
                        −
                      </button>

                      <span className="min-w-[24px] text-center">{item.cantidad}</span>

                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.cartKey)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between h-full">
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>

                    <p className="font-semibold">
                      ${(Number(item.precio) * Number(item.cantidad)).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
              )
            })}
          </section>

          {/* ================= RESUMEN ================= */}
          <aside
            className="
              rounded-2xl
              bg-white/80
              backdrop-blur-lg
              border border-gray-200
              p-6
              h-fit
              shadow-md
              sticky top-28
            "
          >
            <h2 className="text-xl font-semibold mb-4">Resumen de compra</h2>

            <div className="flex justify-between text-sm mb-2">
  <span>Pares</span>
  <span>{totalPares}</span>
</div>

            <div className="flex justify-between text-sm mb-4">
              <span>Envío</span>
              <span className="text-gray-500">A calcular</span>
            </div>

            <div className="h-px bg-gray-200 mb-4" />

{/* Subtotal sin promo (precio “de lista”) */}
<div className="flex justify-between text-sm mb-2">
  <span className="text-gray-600">Subtotal</span>
  <span className="text-gray-600">
    ${subtotalSinPromo.toLocaleString("es-AR")}
  </span>
</div>
{/* Descuento promo */}
{!quoteLoading && descuento > 0 && (
  <div className="flex justify-between text-sm mb-3">
    <span className="text-green-700 font-medium">Descuento</span>
    <span className="text-green-700 font-semibold">
      -${descuento.toLocaleString("es-AR")}
    </span>
  </div>
)}

{/* Cupón */}
<div className="mb-4 space-y-2">
  <label className="block text-sm font-medium">Cupón de descuento</label>

  <div className="flex gap-2">
    <input
      type="text"
      value={couponInput}
      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
      placeholder="Ingresá tu cupón"
      className="flex-1 border rounded-lg px-3 py-2 text-sm"
    />
    <button
      type="button"
      onClick={() => {
  setCouponCode(couponInput)
  applyCoupon(subtotalSinPromo, couponInput)
}}
      className="px-4 py-2 rounded-lg bg-black text-white text-sm"
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
  <div className="flex justify-between text-sm mb-3">
    <span className="text-green-700 font-medium">Descuento cupón</span>
    <span className="text-green-700 font-semibold">
      -${couponDiscount.toLocaleString("es-AR")}
    </span>
  </div>
)}

<div className="h-px bg-gray-200 mb-4" />

{/* Total final */}
<div className="flex justify-between text-lg font-bold mb-6">
  <span>Total</span>
  <span>
    {quoteLoading
  ? "Calculando..."
  : `$${totalFinalConCoupon.toLocaleString("es-AR")}`}
  </span>
</div>

            <button
              onClick={() => router.push("/checkout")}
              className="
                w-full
                bg-black
                text-white
                py-3
                rounded-lg
                font-medium
                hover:bg-gray-800
                transition
              "
            >
              Finalizar compra
            </button>

            <button
              onClick={() => router.push("/")}
              className="
                w-full
                mt-3
                text-sm
                text-gray-600
                hover:underline
              "
            >
              Seguir comprando
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}
