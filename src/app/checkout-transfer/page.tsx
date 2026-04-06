"use client"

import { useCart } from "@/context/CartContext"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { trackEvent } from "@/lib/gtag"

type TransferQuote = {
  subtotal: number
  computedTotal: number
  shippingPrice: number
}

export default function CheckoutTransferPage() {
  const {
  items,
  hasMayorista,
  comboId,
  couponCode,
  couponStatus,
  couponDiscount,
  couponError,
  appliedCoupon,
  setCouponCode,
  applyCoupon,
  clearCoupon,
} = useCart() as any

  const [form, setForm] = useState({
    email: "",
    nombre: "",
    apellido: "",
    direccion: "",
    departamento: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    telefono: "",
    guardarInfo: false,
  })

  const [transferQuote, setTransferQuote] = useState<TransferQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [couponInput, setCouponInput] = useState(couponCode || "")
  const subtotalLista = useMemo(() => {
    return items.reduce(
      (acc: number, i: any) => acc + Number(i.precio || 0) * Number(i.cantidad || 0),
      0
    )
  }, [items])

  const hasNoMayorista = useMemo(() => {
    return items.some((item: any) => !item.packMayoristaId)
  }, [items])

  const allMayorista = useMemo(() => {
    return items.length > 0 && items.every((item: any) => !!item.packMayoristaId)
  }, [items])

  const isMixedCart = useMemo(() => {
    return hasMayorista && hasNoMayorista
  }, [hasMayorista, hasNoMayorista])

  const effectiveComboId =
    (comboId && String(comboId).trim()) ||
    (items?.length === 1 ? String(items[0]?.comboId || "").trim() : "") ||
    ""

  const compactItems = useMemo(
    () =>
      (items || []).map((i: any) => ({
        cartKey: i.cartKey,
        _id: i._id ?? i.productId,
        productId: i.productId ?? i._id,
        talle: i.talle ?? null,
        cantidad: Number(i.cantidad ?? 1),
        comboId: i.comboId
          ? String(i.comboId).trim()
          : effectiveComboId
          ? String(effectiveComboId).trim()
          : null,
        packMayoristaId: i.packMayoristaId
          ? String(i.packMayoristaId).trim()
          : null,
      })),
    [items, effectiveComboId]
  )

const fetchTransferQuote = useCallback(async (requestId: number) => {
  if (!items.length) {
    setTransferQuote(null)
    setQuoteLoading(false)
    return
  }

  try {
    setQuoteLoading(true)
    setTransferQuote(null)

    const payload = {
      quoteOnly: true,
      orderId: `transfer_checkout_${Date.now()}`,
      comboId: effectiveComboId || undefined,
      paymentMode: "transfer" as const,
      couponCode: couponCode ?? null,
      items: compactItems,
      shipping: {
        type: "sucursal" as const,
      },
    }

    const res = await fetch("/api/payments/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const json = await res.json().catch(() => null)

    // si llegó una respuesta vieja, la ignoramos
    if ((window as any).__transferQuoteRequestId !== requestId) return

    if (!res.ok || !json?.ok) {
      throw new Error(json?.message || "No se pudo calcular el total")
    }

    setTransferQuote({
      subtotal: Number(json.subtotal ?? 0),
      computedTotal: Number(json.computedTotal ?? 0),
      shippingPrice: Number(json.shippingPrice ?? 0),
    })
  } catch (error) {
    console.error("[checkout-transfer] quote error:", error)

    if ((window as any).__transferQuoteRequestId !== requestId) return
    setTransferQuote(null)
  } finally {
    if ((window as any).__transferQuoteRequestId === requestId) {
      setQuoteLoading(false)
    }
  }
}, [items, compactItems, effectiveComboId, couponCode])

useEffect(() => {
  const requestId = Date.now()
  ;(window as any).__transferQuoteRequestId = requestId
  fetchTransferQuote(requestId)
}, [fetchTransferQuote])

const hasTrackedCheckoutRef = useRef(false)

useEffect(() => {
  if (hasTrackedCheckoutRef.current) return
  if (!items.length) return
  if (!transferQuote) return // esperamos total real

  hasTrackedCheckoutRef.current = true

  trackEvent("begin_checkout", {
  checkout_type: "transferencia",
  currency: "ARS",
  value: transferQuote.computedTotal,
  items: items.map((item: any) => ({
    item_id: item.productId,
    item_name: item.nombre,
    item_variant: item.talle,
    quantity: item.cantidad,
    price: item.precio,
  })),
})
}, [items, transferQuote])


useEffect(() => {
  setCouponInput(couponCode || "")
}, [couponCode])
  const totalTransfer = transferQuote?.computedTotal ?? 0
  const ahorroTotal = Math.max(0, subtotalLista - totalTransfer)

  const envioLabel = hasMayorista ? "Se coordina luego" : "Gratis"

  const datosEnvioCompletos =
    form.email.trim() !== "" &&
    form.nombre.trim() !== "" &&
    form.apellido.trim() !== "" &&
    form.direccion.trim() !== "" &&
    form.codigoPostal.trim() !== "" &&
    form.ciudad.trim() !== "" &&
    form.provincia.trim() !== "" &&
    form.telefono.trim() !== ""

  const puedeFinalizarPedido = datosEnvioCompletos && items.length > 0 && !!transferQuote

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const WHATSAPP_NUMBER = "5493624934353"

  const sanitizeWhatsappText = (value: string) => {
    return String(value ?? "")
      .replace(/[*_~`]/g, "")
      .replace(/\r/g, "")
      .replace(/[^\S\n]+/g, " ")
      .trim()
  }

  const formatARS = (value: number) => {
    const rounded = Math.round(Number(value || 0))
    return rounded.toLocaleString("es-AR")
  }

  const paymentBoxText = allMayorista
    ? "Este pedido ya cuenta con precio mayorista y no recibe descuento adicional."
    : isMixedCart
    ? "El descuento por transferencia se aplica solo a los productos no mayoristas."
    : "ABONÁ CON UN 30% OFF ADICIONAL"

  const summaryDiscountLabel = allMayorista
    ? "Precio mayorista aplicado"
    : isMixedCart
    ? "Descuento parcial por transferencia"
    : "Descuento en pedidos"

  const summaryBadgeText = allMayorista
    ? "○ PRECIO MAYORISTA"
    : isMixedCart
    ? "○ DESCUENTO PARCIAL POR TRANSFERENCIA"
    : "○ TRANSFERENCIA 30% OFF"

const ahorroPromoReal = Math.max(0, ahorroTotal - couponDiscount)
const ahorroTotalFinal = Math.max(0, ahorroPromoReal + couponDiscount)

const ahorroFooterText = allMayorista
  ? "○ PRECIO PROMOCIONAL YA APLICADO"
  : isMixedCart
  ? `○ AHORRO PARCIAL ${formatARS(ahorroTotalFinal)}`
  : `○ AHORRO TOTAL ${formatARS(ahorroTotalFinal)}`

  const handleTransferWhatsApp = async () => {
    if (!items?.length) {
      alert("Tu carrito está vacío.")
      return
    }

    if (!puedeFinalizarPedido) {
      alert("Completá todos los datos obligatorios antes de continuar.")
      return
    }

    try {
      const lines = (items || []).map((it: any) => {
        const nombreLimpio = String(it?.nombre ?? "Producto")
          .replace(/\s*\(Talle [^)]+\)\s*/gi, "")
          .replace(/[*_~`]/g, "")
          .trim()

        const talle = it?.talle
          ? ` (Talle ${String(it.talle).replace(/[*_~`]/g, "").trim()})`
          : ""

        const qty = Number(it?.cantidad ?? 1)
        const unit = Number(it?.precio ?? 0)
        const lineTotal = unit * qty

        return `- ${nombreLimpio}${talle} x${qty} - $${formatARS(lineTotal)}`
      })

      const ahorroPromoWhatsapp = Math.max(0, ahorroTotal - couponDiscount)

const discountLine = allMayorista
  ? "Precio mayorista ya aplicado."
  : isMixedCart
  ? `Descuento parcial por transferencia: -$${formatARS(ahorroPromoWhatsapp)}`
  : `Descuento por transferencia: -$${formatARS(ahorroPromoWhatsapp)}`

const couponLine =
  couponDiscount > 0
    ? `Descuento cupón${appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}: -$${formatARS(couponDiscount)}`
    : ""
      const messageLines = [
        "Hola! Mi pedido es:",
        "",
        ...lines,
        "",
        `Subtotal (precio lista): $${formatARS(subtotalLista)}`,
discountLine,
couponLine,
`Total final: $${formatARS(totalTransfer)}`,
        `Costo de envio: ${
          !datosEnvioCompletos
            ? "-"
            : !hasMayorista
            ? "Gratis"
            : "Se coordina luego"
        }`,
        "",
        `Cliente: ${sanitizeWhatsappText(`${form.nombre} ${form.apellido}`)}`,
        `Telefono: ${sanitizeWhatsappText(form.telefono || "-")}`,
        `Email: ${sanitizeWhatsappText(form.email || "-")}`,
        `Direccion: ${sanitizeWhatsappText(
          `${form.direccion || "-"}${
            form.departamento ? `, ${form.departamento}` : ""
          }, ${form.ciudad || "-"}, ${form.provincia || "-"}, CP ${
            form.codigoPostal || "-"
          }`
        )}`,
        "",
        "Quiero abonar en transferencia.",
      ].filter(Boolean)

      const safeText = messageLines.join("\n")

     trackEvent("add_payment_info", {
  payment_type: "transferencia",
  currency: "ARS",
  value: totalTransfer,
  items: items.map((item: any) => ({
    item_id: item.productId,
    item_name: item.nombre,
    item_variant: item.talle,
    quantity: item.cantidad,
    price: item.precio,
  })),
})

      const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(safeText)}`
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("❌ Error preparando WhatsApp:", error)
      alert("No se pudo preparar el mensaje de WhatsApp.")
    }
  }

  return (
    <main className="min-h-screen bg-white mt-16">
      <div className="mx-auto max-w-[1180px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px]">
        {/* IZQUIERDA */}
        <section className="border-r border-[#e5e5e5] px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-[560px] space-y-8">
            {/* CONTACTO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-black">Contacto</h2>
                
              </div>

              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Correo electrónico"
                className="h-[56px] w-full rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
              />
            </div>

            {/* ENTREGA */}
            <div className="space-y-4">
              <h3 className="text-[18px] font-semibold text-black">Entrega</h3>

              <select className="h-[56px] w-full rounded-md border border-[#d9d9d9] bg-white px-4 text-[15px] outline-none">
                <option>Argentina</option>
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input
                  value={form.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  placeholder="Nombre"
                  className="h-[56px] rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
                />
                <input
                  value={form.apellido}
                  onChange={(e) => handleChange("apellido", e.target.value)}
                  placeholder="Apellidos"
                  className="h-[56px] rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
                />
              </div>

              <input
                value={form.direccion}
                onChange={(e) => handleChange("direccion", e.target.value)}
                placeholder="Dirección"
                className="h-[56px] w-full rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
              />

              <input
                value={form.departamento}
                onChange={(e) => handleChange("departamento", e.target.value)}
                placeholder="Casa, apartamento, etc. (opcional)"
                className="h-[56px] w-full rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
              />

              <div className="grid grid-cols-3 gap-4">
                <input
                  value={form.codigoPostal}
                  onChange={(e) => handleChange("codigoPostal", e.target.value)}
                  placeholder="Código postal"
                  className="h-[56px] rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
                />
                <input
                  value={form.ciudad}
                  onChange={(e) => handleChange("ciudad", e.target.value)}
                  placeholder="Ciudad"
                  className="h-[56px] rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
                />
                <input
                  value={form.provincia}
                  onChange={(e) => handleChange("provincia", e.target.value)}
                  placeholder="Provincia / Estado"
                  className="h-[56px] rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
                />
              </div>

              <input
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                placeholder="Teléfono"
                className="h-[56px] w-full rounded-md border border-[#d9d9d9] px-4 text-[15px] outline-none placeholder:text-gray-400"
              />

              <label className="flex items-center gap-3 text-[14px] text-gray-700">
                <input
                  type="checkbox"
                  checked={form.guardarInfo}
                  onChange={(e) => handleChange("guardarInfo", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Guardar mi información y consultar más rápidamente la próxima vez
              </label>
            </div>

            {/* MÉTODOS DE ENVÍO */}
            <div className="space-y-3">
              <h3 className="text-[18px] font-semibold text-black">Métodos de envío</h3>

              {!datosEnvioCompletos ? (
                <div className="rounded-md bg-[#f3f3f3] px-4 py-5 text-center text-[14px] text-gray-500">
                  Completá tus datos para ver el método de envío disponible.
                </div>
              ) : !hasMayorista ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-5 text-center">
                  <p className="text-[14px] font-medium text-green-700">
                    Envío gratis
                  </p>
                  <p className="mt-1 text-[13px] text-green-600">
                    Disponible para esta compra
                  </p>
                </div>
              ) : (
                <div className="rounded-md bg-[#f3f3f3] px-4 py-5 text-center text-[14px] text-gray-500">
                  El envío se coordina luego para pedidos mayoristas.
                </div>
              )}
            </div>

            {/* PAGO */}
            <div className="space-y-3">
              <div>
                <h3 className="text-[18px] font-semibold text-black">Pago</h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  Todas las transacciones son seguras y están encriptadas.
                </p>
              </div>

              <div className="rounded-t-md border border-blue-500 bg-white px-4 py-3 text-[15px] text-black">
                Transferencia
              </div>

              <div className="rounded-b-md border border-t-0 border-[#d9d9d9] bg-[#f7f7f7] px-4 py-3 text-[14px] text-gray-700">
                {paymentBoxText}
              </div>
            </div>

            <button
              className={`h-[52px] w-full rounded-md text-[15px] font-medium text-white transition ${
                puedeFinalizarPedido
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
              type="button"
              disabled={!puedeFinalizarPedido}
              onClick={handleTransferWhatsApp}
            >
              PAGAR
            </button>

            {!puedeFinalizarPedido && (
              <p className="text-[13px] text-gray-500">
                Completá todos los datos obligatorios para continuar.
              </p>
            )}

            <div className="pt-2">
              
            </div>
          </div>
        </section>

        {/* DERECHA */}
        <aside className="bg-[#fafafa] px-6 py-8 lg:px-10 lg:py-10 lg:sticky lg:top-24 self-start h-fit">
          <div className="max-w-[360px] space-y-6">
            {items.map((item: any, i: number) => (
              <div
                key={item.cartKey ?? `${item.productId}-${item.talle ?? "default"}-${i}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Image
                      src={item.imagen}
                      alt={item.nombre}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-md border border-[#e5e5e5] object-cover"
                    />
                    <div className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[11px] font-semibold text-white">
                      {item.cantidad}
                    </div>
                  </div>

                  <div className="text-[13px] leading-tight text-gray-600">
                    <p className="font-medium text-black">{item.nombre}</p>
                    {item.talle && <p className="mt-1">Talle {item.talle}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[14px] font-medium text-black">
                    $
                    {(Number(item.precio || 0) * Number(item.cantidad || 0)).toLocaleString(
                      "es-AR"
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="space-y-2">
  <label className="block text-[14px] font-medium text-black">
    Cupón de descuento
  </label>

  <div className="flex gap-2">
    <input
      type="text"
      value={couponInput}
      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
      placeholder="Ingresá tu cupón"
      className="h-[44px] flex-1 rounded-md border border-[#d9d9d9] px-3 text-[14px] outline-none placeholder:text-gray-400"
    />
    <button
      type="button"
      onClick={() => {
        setCouponCode(couponInput)
        applyCoupon(subtotalLista, couponInput)
      }}
      className="rounded-md bg-black px-4 text-[14px] font-medium text-white"
    >
      Aplicar
    </button>
  </div>

  {couponStatus === "applied" && appliedCoupon && (
    <div className="flex items-center justify-between text-[13px] text-green-700">
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
    <p className="text-[13px] text-red-600">{couponError}</p>
  )}
</div>

            <div className="border-t border-[#e5e5e5] pt-6 space-y-3 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Subtotal</span>
                <span className="text-black">
                  ${subtotalLista.toLocaleString("es-AR")}
                </span>
              </div>

              {/* DESCUENTO PROMO */}
<div className="grid grid-cols-[1fr_auto] gap-x-4 items-start">
  <span className="text-gray-700">{summaryDiscountLabel}</span>
  <span className="text-right whitespace-nowrap text-black">
    {quoteLoading || !transferQuote
      ? "Calculando..."
      : `-$${Math.max(0, ahorroTotal - couponDiscount).toLocaleString("es-AR")}`}
  </span>
</div>

{/* DESCUENTO CUPÓN */}
{couponDiscount > 0 && (
  <div className="grid grid-cols-[1fr_auto] gap-x-4 items-start">
    <span className="text-green-700 font-medium">Descuento cupón</span>
    <span className="text-right whitespace-nowrap text-green-700 font-semibold">
      -${couponDiscount.toLocaleString("es-AR")}
    </span>
  </div>
)}

              <div className="text-[13px] text-gray-500">
                {summaryBadgeText}
                {isMixedCart && (
                  <div className="mt-1 text-[12px] text-amber-700">
                    Los productos mayoristas no reciben descuento adicional.
                  </div>
                )}
                {allMayorista && (
                  <div className="mt-1 text-[12px] text-amber-700">
                    Este pedido solo puede abonarse por transferencia.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-700">Envío</span>

                {!datosEnvioCompletos ? (
                  <span className="text-gray-400">Completá tus datos</span>
                ) : !hasMayorista ? (
                  <span className="font-medium text-green-600">{envioLabel}</span>
                ) : (
                  <span className="text-gray-400">{envioLabel}</span>
                )}
              </div>
            </div>

            <div className="border-t border-[#e5e5e5] pt-6">
              <div className="flex items-end justify-between">
                <span className="text-[22px] font-semibold text-black">Total</span>

                <div className="text-right">
                  <div className="text-[12px] uppercase tracking-wide text-gray-500">
                    ARS
                  </div>
                  <div className="text-[20px] font-semibold leading-none text-black">
  {quoteLoading || !transferQuote ? "Calculando..." : `$${totalTransfer.toLocaleString("es-AR")}`}
</div>
                </div>
              </div>

              <div className="mt-4 text-[13px] text-gray-700">
                {ahorroFooterText}
              </div>

              {!hasMayorista && (
                <div className="mt-2 text-[13px] text-green-600">
                  🚚 Envío gratis incluido
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}