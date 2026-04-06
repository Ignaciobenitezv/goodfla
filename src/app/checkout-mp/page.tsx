"use client"

import { useCart } from "@/context/CartContext"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    MercadoPago?: any
    __mpQuoteRequestId?: number
  }
}

type MpQuote = {
  subtotal: number
  computedTotal: number
  shippingPrice: number
  couponDiscount?: number
}

type PayMethod = "card_inline" | "mp_redirect"

export default function CheckoutMpPage() {
  const router = useRouter()
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

  const [mpQuote, setMpQuote] = useState<MpQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const [payMethod, setPayMethod] = useState<PayMethod>("card_inline")
  const [redirectLoading, setRedirectLoading] = useState(false)


  const [couponInput, setCouponInput] = useState(couponCode || "")
  const [cardLoading, setCardLoading] = useState(false)
  const [cardMsg, setCardMsg] = useState("")
  const [brickReady, setBrickReady] = useState(false)

  const cardBrickRef = useRef<any>(null)
  const orderIdRef = useRef<string>("")

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

  const datosEnvioCompletos =
    form.email.trim() !== "" &&
    form.nombre.trim() !== "" &&
    form.apellido.trim() !== "" &&
    form.direccion.trim() !== "" &&
    form.codigoPostal.trim() !== "" &&
    form.ciudad.trim() !== "" &&
    form.provincia.trim() !== "" &&
    form.telefono.trim() !== ""

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  const formValido = datosEnvioCompletos && emailValido

  const totalMp = mpQuote?.computedTotal ?? 0
  const descuentoTotal = Math.max(0, subtotalLista - totalMp)
  const envioLabel = hasMayorista ? "Se coordina luego" : "Gratis"

  const puedeRedirigir =
    formValido &&
    items.length > 0 &&
    !!mpQuote &&
    !hasMayorista &&
    !redirectLoading

  const puedeMontarBrick =
    payMethod === "card_inline" &&
    formValido &&
    items.length > 0 &&
    !!mpQuote &&
    !hasMayorista

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const ensureOrderId = () => {
    if (!orderIdRef.current) {
      const maybeUuid = globalThis.crypto?.randomUUID?.()
      orderIdRef.current =
        maybeUuid || `order_${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
    return orderIdRef.current
  }

  const resetOrderId = () => {
    orderIdRef.current = ""
  }

  const fetchMpQuote = useCallback(
    async (requestId: number) => {
      if (!items.length) {
        setMpQuote(null)
        setQuoteLoading(false)
        return
      }

      try {
        setQuoteLoading(true)
        setMpQuote(null)

        const payload = {
          quoteOnly: true,
          orderId: `mp_checkout_${Date.now()}`,
          comboId: effectiveComboId || undefined,
          paymentMode: "standard" as const,
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

        if (window.__mpQuoteRequestId !== requestId) return

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "No se pudo calcular el total")
        }

        setMpQuote({
          subtotal: Number(json.subtotal ?? 0),
          computedTotal: Number(json.computedTotal ?? 0),
          shippingPrice: Number(json.shippingPrice ?? 0),
          couponDiscount: Number(json.couponDiscount ?? 0),
        })
      } catch (error) {
        console.error("[checkout-mp] quote error:", error)

        if (window.__mpQuoteRequestId !== requestId) return
        setMpQuote(null)
      } finally {
        if (window.__mpQuoteRequestId === requestId) {
          setQuoteLoading(false)
        }
      }
    },
    [items, compactItems, effectiveComboId, couponCode]
  )

  useEffect(() => {
    const requestId = Date.now()
    window.__mpQuoteRequestId = requestId
    fetchMpQuote(requestId)
  }, [fetchMpQuote])

  useEffect(() => {
  setCouponInput(couponCode || "")
}, [couponCode])

  const paymentBoxText = hasMayorista
    ? "Los productos mayoristas solo pueden abonarse por transferencia bancaria."
    : payMethod === "card_inline"
    ? "Pagá con tarjeta de crédito o débito directamente desde este checkout."
    : "Vas a ser redirigido al entorno seguro de Mercado Pago para completar el pago."

  const summaryDiscountLabel =
    descuentoTotal > 0 ? "Descuento aplicado" : "Promociones"

  const summaryBadgeText = hasMayorista
    ? "○ SOLO TRANSFERENCIA PARA MAYORISTA"
    : couponCode
    ? "○ TOTAL ACTUALIZADO CON CUPÓN / PROMO"
    : payMethod === "card_inline"
    ? "○ TARJETA"
    : "○ MERCADO PAGO"

  const ahorroFooterText =
    descuentoTotal > 0
      ? `○ AHORRO TOTAL ${Math.round(descuentoTotal).toLocaleString("es-AR")}`
      : "○ TOTAL FINAL ACTUALIZADO"

  const customerPayload = useMemo(
    () => ({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      envio: "domicilio" as const,
      cp: form.codigoPostal.trim(),
      direccion: {
        calle: form.direccion.trim(),
        numero: "",
        barrio: form.departamento.trim(),
        ciudad: form.ciudad.trim(),
      },
    }),
    [form]
  )

  const handleMercadoPagoRedirect = async () => {
    if (!items?.length) {
      alert("Tu carrito está vacío.")
      return
    }

    if (hasMayorista) {
      alert("Los productos mayoristas solo pueden pagarse por transferencia bancaria.")
      return
    }

    if (!formValido) {
      alert("Completá todos los datos obligatorios antes de continuar.")
      return
    }

    try {
      setRedirectLoading(true)

      const payload = {
        items: compactItems,
        couponCode: couponCode ?? null,
        customer: customerPayload,
      }

      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok || !json?.init_point) {
        throw new Error(json?.message || "No se pudo iniciar Mercado Pago")
      }

      window.location.href = json.init_point
    } catch (error) {
      console.error("[checkout-mp] redirect error:", error)
      alert("No se pudo iniciar el pago con Mercado Pago.")
    } finally {
      setRedirectLoading(false)
    }
  }

  useEffect(() => {
    if (hasMayorista && payMethod !== "mp_redirect") {
      setPayMethod("mp_redirect")
    }
  }, [hasMayorista, payMethod])

  useEffect(() => {
    resetOrderId()
    setCardMsg("")
    setBrickReady(false)
    if (payMethod !== "card_inline") {
      cardBrickRef.current?.unmount?.()
      cardBrickRef.current = null
    }
  }, [payMethod])

  useEffect(() => {
    if (!puedeMontarBrick) {
      cardBrickRef.current?.unmount?.()
      cardBrickRef.current = null
      setBrickReady(false)
      return
    }

    let cancelled = false
    const containerId = "card-payment-brick"

    const mountBrick = async () => {
      const container = document.getElementById(containerId)
      if (!container) {
        setCardMsg("No se encontró el contenedor del formulario de tarjeta.")
        setBrickReady(false)
        return
      }

      const PUBLIC_KEY = String(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "").trim()
      if (!PUBLIC_KEY) {
        setCardMsg("Falta la clave pública de Mercado Pago.")
        setBrickReady(false)
        return
      }

      const amount = Number(mpQuote?.computedTotal ?? 0)
      if (!amount || amount <= 0) {
        setCardMsg("No se pudo cargar el formulario de tarjeta.")
        setBrickReady(false)
        return
      }

      try {
        setCardLoading(true)
        setCardMsg("")
        setBrickReady(false)

        cardBrickRef.current?.unmount?.()
        cardBrickRef.current = null

        ensureOrderId()

        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" })
        const bricks = mp.bricks()

        const brick = await bricks.create("cardPayment", containerId, {
          initialization: {
            amount,
          },
          customization: {
            paymentMethods: {
              maxInstallments: 6,
            },
          },
          callbacks: {
            onReady: () => {
              if (cancelled) return
              setCardLoading(false)
              setBrickReady(true)
            },
            onError: (err: any) => {
              console.error("[checkout-mp][brick] onError:", err)
              if (cancelled) return
              setCardLoading(false)
              setBrickReady(false)
              setCardMsg("No se pudo cargar el formulario de tarjeta.")
            },
            onSubmit: async (data: any) => {
              try {
                if (cancelled) return

                setCardMsg("")
                setCardLoading(true)

                if (!compactItems.length) {
                  setCardMsg("Carrito vacío.")
                  setCardLoading(false)
                  throw new Error("empty_cart")
                }

                const orderId = ensureOrderId()
                const serverAmount = Number(mpQuote?.computedTotal ?? 0)

                if (!serverAmount) {
                  setCardMsg("No se pudo obtener el total del servidor.")
                  setCardLoading(false)
                  throw new Error("missing_server_total")
                }

                const formData = data?.formData ?? {}

                const identificationData =
                  data?.payer?.identification
                    ? {
                        type: String(data.payer.identification.type || ""),
                        number: String(data.payer.identification.number || ""),
                      }
                    : data?.formData?.payer?.identification
                    ? {
                        type: String(data.formData.payer.identification.type || ""),
                        number: String(data.formData.payer.identification.number || ""),
                      }
                    : undefined

                const payerEmail =
                  data?.payer?.email ||
                  data?.formData?.payer?.email ||
                  form.email.trim()

                const payload = {
                  token: data?.token ? String(data.token) : undefined,
                  issuer_id:
                    data?.issuer_id != null
                      ? String(data.issuer_id)
                      : data?.issuerId != null
                      ? String(data.issuerId)
                      : undefined,
                  payment_method_id:
                    data?.payment_method_id
                      ? String(data.payment_method_id)
                      : data?.paymentMethodId
                      ? String(data.paymentMethodId)
                      : undefined,
                  installments: Number(data?.installments ?? 1),
                  payer: {
                    email: String(payerEmail || "").trim(),
                    identification: identificationData,
                  },
                  identification: identificationData,
                  items: compactItems,
                  amount: serverAmount,
                  couponCode: couponCode ?? null,
                  orderId,
                  comboId: effectiveComboId || undefined,
                  customer: customerPayload,
                  shipping: {
                    type: "sucursal" as const,
                  },
                }

                if (!payload.token) {
                  setCardMsg("No se generó el token de la tarjeta.")
                  setCardLoading(false)
                  throw new Error("missing_token")
                }

                if (!payload.payment_method_id) {
                  setCardMsg("No se detectó el medio de pago.")
                  setCardLoading(false)
                  throw new Error("missing_payment_method")
                }

                const res = await fetch("/api/payments/card", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                })

                const json = await res.json().catch(() => null)
                setCardLoading(false)

                if (!res.ok || !json?.ok) {
                  console.error("[checkout-mp][brick] payment error:", json)
                  const msg =
                    json?.message ||
                    json?.error ||
                    "Error procesando el pago"
                  setCardMsg(msg)
                  throw new Error(msg)
                }

                const status = String(json.status || "").toLowerCase()
                const paymentId = json.id ? String(json.id) : ""
                const statusDetail = json.status_detail
                  ? String(json.status_detail)
                  : ""

                localStorage.setItem(
                  "lastOrder",
                  JSON.stringify({ orderId, paymentId, status })
                )

                const qs = new URLSearchParams()
                if (paymentId) qs.set("payment_id", paymentId)
                if (status) qs.set("status", status)
                if (orderId) qs.set("orderId", orderId)
                if (statusDetail) qs.set("status_detail", statusDetail)

                if (status === "approved") {
                  router.push(`/checkout/success?${qs.toString()}`)
                  return
                }

                if (status === "in_process" || status === "pending") {
                  router.push(`/checkout/pending?${qs.toString()}`)
                  return
                }

                router.push(`/checkout/failure?${qs.toString()}`)
              } catch (error) {
                setCardLoading(false)
                throw error
              }
            },
          },
        })

        if (cancelled) {
          brick?.unmount?.()
          return
        }

        cardBrickRef.current = brick
      } catch (error) {
        console.error("[checkout-mp][brick] create error:", error)
        if (cancelled) return
        setCardLoading(false)
        setBrickReady(false)
        setCardMsg("No se pudo cargar el formulario de tarjeta.")
      }
    }

    const loadAndMount = () => {
      if (window.MercadoPago) {
        mountBrick()
        return
      }

      let script = document.getElementById("mp-sdk") as HTMLScriptElement | null

      if (!script) {
        script = document.createElement("script")
        script.id = "mp-sdk"
        script.src = "https://sdk.mercadopago.com/js/v2"
        script.async = true
        script.onload = () => {
          if (!cancelled) mountBrick()
        }
        script.onerror = () => {
          if (cancelled) return
          setCardLoading(false)
          setBrickReady(false)
          setCardMsg("No se pudo cargar el SDK de Mercado Pago.")
        }
        document.body.appendChild(script)
      } else {
        if ((window as any).MercadoPago) {
          mountBrick()
        } else {
          script.addEventListener(
            "load",
            () => {
              if (!cancelled) mountBrick()
            },
            { once: true }
          )
        }
      }
    }

    loadAndMount()

    return () => {
      cancelled = true
      cardBrickRef.current?.unmount?.()
      cardBrickRef.current = null
    }
  }, [
    puedeMontarBrick,
    mpQuote?.computedTotal,
    compactItems,
    couponCode,
    effectiveComboId,
    customerPayload,
    form.email,
    router,
  ])

  return (
    <main className="min-h-screen bg-white mt-16">
      <div className="mx-auto max-w-[1180px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="border-r border-[#e5e5e5] px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-[560px] space-y-8">
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

            <div className="space-y-3">
              <div>
                <h3 className="text-[18px] font-semibold text-black">Pago</h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  Todas las transacciones son seguras y están encriptadas.
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-[#d9d9d9] bg-white">
                <label
                  className={`flex cursor-pointer items-center justify-between border-b px-4 py-4 transition ${
                    payMethod === "card_inline"
                      ? "bg-[#f4f7ff] ring-1 ring-inset ring-blue-500"
                      : "bg-white"
                  } ${hasMayorista ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      className="h-4 w-4"
                      checked={payMethod === "card_inline"}
                      disabled={hasMayorista}
                      onChange={() => {
                        if (hasMayorista) return
                        setPayMethod("card_inline")
                      }}
                    />
                    <div>
                      <p className="text-[15px] font-medium text-black">
                        Tarjeta de crédito / débito
                      </p>
                      <p className="text-[13px] text-gray-500">
                        Pagá directamente desde este checkout
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                    <span className="rounded bg-[#009ee3] px-2 py-1 text-white">MP</span>
                    <span className="rounded border px-2 py-1">VISA</span>
                    <span className="rounded border px-2 py-1">MC</span>
                  </div>
                </label>

                {payMethod === "card_inline" && (
                  <div className="border-b bg-[#f7f7f7] px-4 py-4">
                    {!formValido ? (
                      <p className="text-[14px] text-gray-600">
                        Completá primero tus datos de contacto y entrega para habilitar el formulario de tarjeta.
                      </p>
                    ) : hasMayorista ? (
                      <p className="text-[14px] text-amber-700">
                        Los productos mayoristas solo pueden abonarse por transferencia bancaria.
                      </p>
                    ) : quoteLoading || !mpQuote ? (
                      <p className="text-[14px] text-gray-600">Calculando total…</p>
                    ) : (
                      <>
                        <div id="card-payment-brick" />
                        {cardLoading && (
                          <p className="mt-3 text-[13px] text-gray-500">Procesando…</p>
                        )}
                        {!!cardMsg && (
                          <p className="mt-3 text-[13px] text-red-600">{cardMsg}</p>
                        )}
                        {!cardLoading && brickReady && !cardMsg && (
                          <p className="mt-3 text-[12px] text-gray-500">
                            Completá los datos de la tarjeta y hacé click en el botón del formulario.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <label
                  className={`flex cursor-pointer items-center justify-between px-4 py-4 transition ${
                    payMethod === "mp_redirect"
                      ? "bg-[#f4f7ff] ring-1 ring-inset ring-blue-500"
                      : "bg-white"
                  } ${hasMayorista ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      className="h-4 w-4"
                      checked={payMethod === "mp_redirect"}
                      disabled={hasMayorista}
                      onChange={() => {
                        if (hasMayorista) return
                        setPayMethod("mp_redirect")
                      }}
                    />
                    <div>
                      <p className="text-[15px] font-medium text-black">Mercado Pago</p>
                      <p className="text-[13px] text-gray-500">
                        Vas a ser redirigido al checkout seguro de Mercado Pago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                    <span className="rounded bg-[#009ee3] px-2 py-1 text-white">MP</span>
                  </div>
                </label>
              </div>

              <div className="rounded-md border border-t-0 border-[#d9d9d9] bg-[#f7f7f7] px-4 py-3 text-[14px] text-gray-700">
                {paymentBoxText}
              </div>
            </div>

            {payMethod === "mp_redirect" && (
              <>
                <button
                  className={`h-[52px] w-full rounded-md text-[15px] font-medium text-white transition ${
                    puedeRedirigir
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                  type="button"
                  disabled={!puedeRedirigir}
                  onClick={handleMercadoPagoRedirect}
                >
                  {redirectLoading ? "REDIRIGIENDO..." : "PAGAR CON MERCADO PAGO"}
                </button>

                {!puedeRedirigir && (
                  <p className="text-[13px] text-gray-500">
                    {hasMayorista
                      ? "Los productos mayoristas solo pueden pagarse por transferencia."
                      : "Completá todos los datos obligatorios para continuar."}
                  </p>
                )}
              </>
            )}

            <div className="pt-2">
              
            </div>
          </div>
        </section>

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

              <div className="flex items-center justify-between">
                <span className="text-gray-700">{summaryDiscountLabel}</span>
                <span className="text-black">
                  {quoteLoading || !mpQuote
                    ? "Calculando..."
                    : descuentoTotal > 0
                    ? `-$${descuentoTotal.toLocaleString("es-AR")}`
                    : "$0"}
                </span>
              </div>
                    {couponDiscount > 0 && (
  <div className="flex items-center justify-between">
    <span className="text-green-700 font-medium">Descuento cupón</span>
    <span className="text-green-700 font-semibold">
      -${couponDiscount.toLocaleString("es-AR")}
    </span>
  </div>
)}
              <div className="text-[13px] text-gray-500">
                {summaryBadgeText}

                {isMixedCart && (
                  <div className="mt-1 text-[12px] text-amber-700">
                    El carrito mezcla productos con reglas de precio distintas.
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
                    {quoteLoading || !mpQuote
                      ? "Calculando..."
                      : `$${totalMp.toLocaleString("es-AR")}`}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[13px] text-gray-700">
                {ahorroFooterText}
              </div>

              {!hasMayorista && (
                <div className="mt-2 text-[13px] text-green-600">
                 Envío gratis incluido
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}