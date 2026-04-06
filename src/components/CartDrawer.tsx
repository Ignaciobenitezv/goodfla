"use client"

import { useCart } from "@/context/CartContext"
import { useUi } from "@/context/UiContext"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, useCallback } from "react"

export default function CartDrawer() {
  const { isCartOpen, closeCart } = useUi()
  const {
  items,
  hasMayorista,
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

const [transferTotal, setTransferTotal] = useState<number | null>(null)
const [transferLoading, setTransferLoading] = useState(false)


useEffect(() => {
  setCouponInput(couponCode || "")
}, [couponCode])

const totalFinalConCoupon = Math.max(0, total - couponDiscount)

const ahorroTransferencia = useMemo(() => {
  if (transferTotal == null) return 0
  return Math.max(0, totalFinalConCoupon - transferTotal)
}, [totalFinalConCoupon, transferTotal])


const cuotasMp = useMemo(() => {
  if (!totalFinalConCoupon || totalFinalConCoupon <= 0) return 0
  return totalFinalConCoupon / 3
}, [totalFinalConCoupon])


const fetchTransferTotal = useCallback(async () => {
  if (!items.length) {
    setTransferTotal(null)
    return
  }

  try {
    setTransferLoading(true)

    const payload = {
      quoteOnly: true,
      orderId: `drawer_transfer_${Date.now()}`,
      paymentMode: "transfer",
      couponCode: couponCode ?? null,
      items: items.map((i) => ({
        _id: i.productId,
        productId: i.productId,
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad ?? 1),
        comboId: i.comboId ?? null,
        packMayoristaId: i.packMayoristaId ?? null,
      })),
      shipping: {
        type: "sucursal" as const,
      },
    }

    const res = await fetch("/api/payments/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.ok) {
      setTransferTotal(null)
      return
    }

    setTransferTotal(Number(data.computedTotal ?? 0))
  } catch (error) {
    console.error("[CartDrawer] transfer total error:", error)
    setTransferTotal(null)
  } finally {
    setTransferLoading(false)
  }
}, [items, couponCode])


useEffect(() => {
  fetchTransferTotal()
}, [fetchTransferTotal])

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
        className={`absolute right-0 top-0 h-full w-full max-w-[380px] bg-white shadow-lg transform transition-transform flex flex-col ${
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
                className="flex gap-3 border-b pb-3 items-start"
              >
                <Image
                  src={item.imagen}
                  alt={item.nombre}
                  width={62}
                  height={78}
                  className="rounded object-cover"
                />
                <div className="flex-1 min-w-0">
  <h3 className="font-semibold text-sm leading-tight line-clamp-2">
    {item.nombre}
  </h3>

  <div className="mt-1 space-y-0.5">
    <p className="text-[11px] text-gray-400 line-through">
      ${Number(item.precio).toLocaleString("es-AR")}
    </p>

    

    <p className="text-[11px] font-extrabold uppercase leading-tight text-red-600">
      30% OFF con transferencia
    </p>

    <p className="text-[11px] font-semibold leading-tight text-gray-700">
      3 cuotas sin interés de{" "}
      ${Number(cuotasMp).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}
    </p>

    {item.talle && (
      <p className="text-[11px] text-gray-500">Talle: {item.talle}</p>
    )}
  </div>

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
  <div className="border-t px-4 py-3 space-y-3">
    <div className="flex justify-between text-[13px]">
  <span className="text-gray-500">Pares</span>
  <span className="text-gray-500 font-medium">{totalPares}</span>
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




<div className="h-px bg-gray-200" />


            

            {/* Total */}
            <div className="flex justify-between items-start border-t pt-3">
  <div className="flex flex-col">
    <span className="text-[13px] font-medium text-gray-500">
      Total con Mercado Pago
    </span>

    {!quoteLoading && cuotasMp > 0 && (
      <span className="mt-0.5 text-[11px] text-gray-500">
        3 cuotas sin interés de{" "}
        ${Number(cuotasMp).toLocaleString("es-AR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </span>
    )}
  </div>

  <span className="text-[16px] font-bold text-gray-900 leading-none">
    {quoteLoading
      ? "Calculando..."
      : `$${Number(totalFinalConCoupon).toLocaleString("es-AR")}`}
  </span>
</div>
<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 space-y-1.5">
  <p className="text-[14px] font-extrabold uppercase tracking-wide text-red-600">
  30% OFF CON TRANSFERENCIA
</p>

  <div className="flex justify-between text-[13px]">
    <span className="text-red-700">PAGÁS</span>
    <span className="text-[20px] font-extrabold text-red-600 leading-none animate-soft-pulse">
      {transferLoading
        ? "..."
        : transferTotal != null
        ? `$${Number(transferTotal).toLocaleString("es-AR")}`
        : "—"}
    </span>
  </div>

  {ahorroTransferencia > 0 && (
    <div className="flex justify-between text-[12px]">
      
     
    </div>
  )}
</div>
            {/* Botones */}
<div className="space-y-2">

 {hasMayorista ? (
  <button
    type="button"
    disabled
    className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#009ee3]/40 px-4 py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide text-white"
    title="Los productos mayoristas solo pueden pagarse por transferencia"
  >
    Pagar con Mercado Pago
  </button>
) : (
  <Link
    href="/checkout-mp"
    onClick={closeCart}
    className="flex w-full items-center justify-center rounded-xl bg-[#009ee3] px-4 py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
  >
    Pagar con Mercado Pago
  </Link>
)}
{hasMayorista && (
  <p className="text-center text-[12px] text-amber-700">
    Los productos mayoristas solo pueden pagarse por transferencia.
  </p>
)}
  <Link
    href="/checkout-transfer"
    onClick={closeCart}
   className="flex w-full items-center justify-center rounded-xl border border-black bg-white px-4 py-2.5 text-center text-[13px] font-semibold uppercase tracking-wide text-black transition hover:bg-black hover:text-white"
  >
    Pagar con transferencia
  </Link>
</div>
          </div>
        )}
      </div>
    </div>
  )
}
