"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/CartContext"
import ValidatedInput from "@/components/ValidatedInput"
import Image from "next/image"


declare global {
  interface Window {
    MercadoPago?: any
  }
}

type Quote = {
  ok: true
  cp: string
  zone: "A" | "B" | "C" | "D"
  price: number
  carrier: string
  etaFrom: string
  etaTo: string
}

export default function CheckoutPage() {
  const { items, comboId } = useCart()
  const router = useRouter()
  const mpRedirectLock = useRef(false)

  const [summaryTotals, setSummaryTotals] = useState<{
    computedTotal: number
    subtotal: number
    shippingPrice: number
  } | null>(null)

  const [summaryLoading, setSummaryLoading] = useState(false)


  // ================= WHATSAPP (TRANSFERENCIA / EFECTIVO) =================
  const WHATSAPP_NUMBER = "5493624934353" // 

  const buildWhatsappOrderText = () => {
    const lines = (items || []).map((it: any) => {
      const nombreProd = it?.nombre ?? "Producto"
      const talle = it?.talle ? ` (Talle ${it.talle})` : ""
      const qty = Number(it?.cantidad ?? 1)
      const unit = Number(it?.precio ?? 0)
      const lineTotal = unit * qty

      return `- ${nombreProd}${talle} x${qty} - $${lineTotal.toLocaleString("es-AR")}`
    })

    const entregaTxt =
      envio === "domicilio"
        ? `Envío a domicilio (CP: ${cp || "—"})`
        : envio === "sucursal"
          ? "Retiro por sucursal"
          : "Entrega: —"

    const envioCostoTxt = quote
      ? quote.price === 0
        ? "Gratis"
        : `$${quote.price.toLocaleString("es-AR")}`
      : "—"

    const header = [
      "Hola! 👋 Mi pedido es:",
      "",
      ...lines,
      "",
      `Subtotal (con promo): $${subtotalConPromo.toLocaleString("es-AR")}`,
`Descuento promo: -$${descuentoPromo.toLocaleString("es-AR")}`,
`Total: $${total.toLocaleString("es-AR")}`,

      `Costo de envío: ${envioCostoTxt}`,
      "",
      `Cliente: ${nombre} ${apellido}`.trim(),
      `Teléfono: ${telefono || "—"}`,
      `Entrega: ${entregaTxt}`,
      envio === "domicilio"
        ? `Dirección: ${destinatario.calle || "—"} ${destinatario.numero || ""}, ${destinatario.barrio ? destinatario.barrio + ", " : ""}${destinatario.ciudad || "—"}`
        : "",
      "",
      "Quiero abonar en transferencia/efectivo.",
    ]
      .filter(Boolean)
      .join("\n")

    return header
  }

  const handleTransferOrCashWhatsApp = () => {
    if (!items?.length) {
      alert("Tu carrito está vacío.")
      return
    }

    // (opcional) validación suave: si estás en paso pago, ideal tener datos de contacto
    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) {
      alert("Completá tus datos de contacto antes de continuar.")
      setStep("contacto")
      return
    }

    const text = buildWhatsappOrderText()
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }





  // STEPS: contacto → entrega → pago
  const [step, setStep] = useState<"contacto" | "entrega" | "pago">("contacto")

  // Paso 1: datos de contacto
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  // Paso 2: entrega
  const [envio, setEnvio] = useState<"" | "domicilio" | "sucursal">("")
  const [cp, setCp] = useState("")
  const [cpStatus, setCpStatus] = useState<"idle" | "checking" | "ok" | "error">("idle")
  const [quote, setQuote] = useState<Quote | null>(null)
  const [cpError, setCpError] = useState<string | null>(null)

  // Paso 3: datos de envío (si es domicilio)
  const [destinatario, setDestinatario] = useState({
    calle: "",
    numero: "",
    barrio: "",
    ciudad: "",
  })

  const handleChangeDestinatario = (field: string, value: string) =>
    setDestinatario((p) => ({ ...p, [field]: value }))
  const datosEnvioCompletos =
  destinatario.calle.trim() !== "" &&
  destinatario.numero.trim() !== "" &&
  
  destinatario.barrio.trim() !== "" &&
  destinatario.ciudad.trim() !== ""
const puedeContinuarEntrega =
  envio === "sucursal" ||
  (envio === "domicilio" && datosEnvioCompletos)

  
  const subtotalSinPromo = useMemo(() => {
  return (items || []).reduce(
    (s, i: any) => s + Number(i.precio || 0) * Number(i.cantidad || 1),
    0
  )
}, [items])

const subtotalConPromo = summaryTotals?.subtotal ?? 0
const envioServer = summaryTotals?.shippingPrice ?? 0
const total = summaryTotals?.computedTotal ?? 0

const descuentoPromo = useMemo(() => {
  if (!summaryTotals) return 0
  return Math.max(0, subtotalSinPromo - subtotalConPromo)
}, [subtotalSinPromo, subtotalConPromo, summaryTotals])

  // ✅ ID efectivo del combo (prioriza contexto, fallback al item)
  const effectiveComboId =
    (comboId && comboId.trim()) ||
    (items?.length === 1 ? String((items[0] as any)?.comboId || "").trim() : "") ||
    ""

  const compactItems = (items || []).map((i: any) => ({
  cartKey: i.cartKey, // ✅ AGREGAR
  _id: i._id ?? i.productId,
  productId: i.productId ?? i._id,
  talle: i.talle ?? null,
  cantidad: Number(i.cantidad ?? 1),
  comboId: i.comboId
    ? String(i.comboId).trim()
    : (effectiveComboId ? String(effectiveComboId).trim() : null),
}))




  const calcularEnvio = async () => {
    setCpError(null)
    if (!/^\d{4}$/.test(cp)) {
      setCpStatus("error")
      setCpError("El CP debe tener 4 dígitos numéricos.")
      setQuote(null)
      return
    }
    try {
      setCpStatus("checking")
      const res = await fetch(`/api/shipping?cp=${cp}`, { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || "No pudimos cotizar el envío.")
      }
      const data: Quote = await res.json()
      setQuote(data)
      setCpStatus("ok")
    } catch (e: any) {
      setCpStatus("error")
      setCpError(e?.message || "Error al cotizar el envío.")
      setQuote(null)
    }
  }

  const puedeContinuarContacto =
  [nombre, apellido, telefono, email].every((v) => v.trim() !== "") &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())


  // 🔹 MercadoPago redirect (preferencia)
  // 🔹 MercadoPago redirect (preferencia)
  const handleMercadoPago = async () => {
    if (mpRedirectLock.current) return
    mpRedirectLock.current = true
    try {
      localStorage.setItem("cart", JSON.stringify(items))

      // ===============================
      // Detectar pack mayorista
      // ===============================
      // payload final
      const customer = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        envio: envio || null,
        cp: cp || null,
        direccion:
          envio === "domicilio"
            ? {
              calle: destinatario.calle || "",
              numero: destinatario.numero || "",
              barrio: destinatario.barrio || "",
              ciudad: destinatario.ciudad || "",
            }
            : null,
      }

      const payload = {
        items,
        comboId: effectiveComboId,// ✅ el comboId del useCart()
        customer,
      }



      console.log("🧪 payload MP =>", payload)

      // ===============================
      // Llamada al backend
      // ===============================
      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (res.status === 409 && data?.error === "out_of_stock") {
        const d = data.details?.[0]
        const talleTxt = d?.talle ? ` (talle ${d.talle})` : ""
        alert(
          `Sin stock${talleTxt}.\n` +
          `Pediste ${d?.requested} y hay ${d?.available}.\n\n` +
          `Actualizá tu carrito y probá con otro talle o producto.`
        )
        mpRedirectLock.current = false
        return
      }

      if (!res.ok) {
        alert("No se pudo generar el link de pago. Intentá de nuevo.")
        mpRedirectLock.current = false
        return
      }

      if (data?.init_point) {
        window.location.href = data.init_point
        return
      }

      alert("No se pudo generar el link de pago con MercadoPago.")
      mpRedirectLock.current = false
    } catch (err) {
      console.error("❌ Error con MP:", err)
      alert("Hubo un problema con MercadoPago.")
      mpRedirectLock.current = false
    }
  }


  // ✅ Métodos y Brick
  const [payMethod, setPayMethod] = useState<"transfer" | "cash" | "mp_redirect" | "card_inline" | null>(null)
  const cardBrickRef = useRef<any>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardMsg, setCardMsg] = useState("")
  const [serverTotals, setServerTotals] = useState<{
    computedTotal: number
    subtotal: number
    shippingPrice: number
    shippingType: "domicilio" | "sucursal"
  } | null>(null)
  const amountToPay = serverTotals?.computedTotal ?? 0

  const [quoteLoading, setQuoteLoading] = useState(false)


  // ✅ orderId estable para idempotencia
  const orderIdRef = useRef<string>("")

  const ensureOrderId = () => {
    if (!orderIdRef.current) {
      const id = globalThis.crypto?.randomUUID?.() || `order_${Date.now()}_${Math.random().toString(16).slice(2)}`
      orderIdRef.current = id
    }
    return orderIdRef.current
  }

  const fetchServerTotals = async () => {
    setQuoteLoading(true)
    try {
      const orderId = ensureOrderId()

      const payload = {
        quoteOnly: true,
        orderId,
        comboId: effectiveComboId,
        items: compactItems,
        shipping: {
          type: envio === "domicilio" ? "domicilio" : "sucursal",
          cp: envio === "domicilio" ? cp : undefined,
        },
        customer: {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          envio,
          cp: cp || null,
          direccion:
            envio === "domicilio"
              ? {
                calle: destinatario.calle || "",
                numero: destinatario.numero || "",
                barrio: destinatario.barrio || "",
                ciudad: destinatario.ciudad || "",
              }
              : null,
        },
      }

      const res = await fetch("/api/payments/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "No se pudo calcular el total")
      }

      setServerTotals({
        computedTotal: Number(json.computedTotal),
        subtotal: Number(json.subtotal),
        shippingPrice: Number(json.shippingPrice),
        shippingType: json.shippingType,
      })
    } catch (e) {
      setServerTotals(null)
      setCardMsg("No se pudo calcular el total del servidor.")
    } finally {
      setQuoteLoading(false)
    }
  }

  const fetchSummaryTotals = async () => {
  setSummaryLoading(true)
  try {
    const payload = {
      quoteOnly: true,
      orderId: `summary_${Date.now()}`,
      comboId: effectiveComboId,
      items: compactItems,
      shipping: {
        type: envio === "domicilio" ? "domicilio" : "sucursal",
        cp: envio === "domicilio" ? cp : undefined,
      },
    }

    const res = await fetch("/api/payments/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => null)

    if (!res.ok || !json?.ok) throw new Error(json?.message || "No se pudo calcular el total")

    setSummaryTotals({
      computedTotal: Number(json.computedTotal ?? 0),
      subtotal: Number(json.subtotal ?? 0),
      shippingPrice: Number(json.shippingPrice ?? 0),
    })
  } catch (e) {
    setSummaryTotals(null)
  } finally {
    setSummaryLoading(false)
  }
}

  // ✅ Montar el Card Brick cuando elijan “Tarjeta (pagar acá mismo)”
  useEffect(() => {
   if (step !== "pago" || payMethod !== "card_inline") return
if (!serverTotals?.computedTotal) return // ✅ esperar cálculo del server

    const containerId = "card-payment-brick"

    const mount = () => {
      const containerElement = document.getElementById(containerId)
      if (!containerElement) {
        setCardMsg("No se pudo encontrar el contenedor del formulario.")
        setCardLoading(false)
        return
      }

      if (!window.MercadoPago) {
        setCardMsg("No se pudo cargar el formulario de tarjeta (SDK no disponible).")
        setCardLoading(false)
        return
      }

      const PUBLIC_KEY = String(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "").trim()
      if (!PUBLIC_KEY) {
        setCardMsg("No se pudo cargar el formulario de tarjeta (falta clave pública).")
        setCardLoading(false)
        return
      }

      const amount = Number(serverTotals.computedTotal) // ✅ SIEMPRE server
      if (!amount || amount <= 0) {
        setCardMsg("No se pudo cargar el formulario (monto inválido).")
        setCardLoading(false)
        return
      }

      // generamos orderId cuando se monta (queda fijo para el intento)
      ensureOrderId()

      const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" })
      const bricks = mp.bricks()

      setCardLoading(true)
      setCardMsg("")

      bricks
        .create("cardPayment", containerId, {
          initialization: { amount },
          customization: { paymentMethods: { maxInstallments: 6 } },
          callbacks: {
            onReady: () => {
              setCardLoading(false)
            },
            onError: (err: any) => {
              console.error("[BRICK] onError ▶", err)
              setCardMsg("No se pudo cargar el formulario de tarjeta.")
              setCardLoading(false)
            },
            onSubmit: async (data: any) => {
              try {
                setCardMsg("")
                setCardLoading(true)


                if (!compactItems.length) {
                  setCardMsg("Carrito vacío. Volvé a agregar productos.")
                  setCardLoading(false)
                  throw new Error("empty_cart")
                }

                const orderId = ensureOrderId()
                const serverAmount = Number(serverTotals?.computedTotal ?? 0)

if (!serverAmount) {
  setCardMsg("No se pudo obtener el total del servidor.")
  setCardLoading(false)
  throw new Error("missing_server_total")
}

                // ✅ PASO B: payload hacia tu backend
                const payload = {
                  token: String(data.token),
                  issuer_id: data.issuer_id != null ? String(data.issuer_id) : undefined,
                  payment_method_id: String(data.paymentMethodId || data.payment_method_id),
                  installments: Number(data.installments ?? 1),
                  identification: data.payer?.identification
                    ? {
                      type: String(data.payer.identification.type),
                      number: String(data.payer.identification.number),
                    }
                    : undefined,

                  // ✅ lo importante
                  items: compactItems,
                  amount: serverAmount,
                  orderId,
                  comboId: effectiveComboId,



                  // ✅ NUEVO: datos del cliente / entrega
                  customer: {
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    telefono: telefono.trim(),
                    email: email.trim(),
                    envio: envio, // "domicilio" | "sucursal"
                    cp: cp || null,
                    direccion:
                      envio === "domicilio"
                        ? {
                          calle: destinatario.calle || "",
                          numero: destinatario.numero || "",
                          barrio: destinatario.barrio || "",
                          ciudad: destinatario.ciudad || "",
                        }
                        : null,
                  },


                  shipping: {
                    type: envio === "domicilio" ? "domicilio" : "sucursal",
                    cp: envio === "domicilio" ? cp : undefined,
                  },
                }


                const res = await fetch("/api/payments/card", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                })

                const json = await res.json().catch(() => null)
                setCardLoading(false)

                if (!res.ok || !json?.ok) {
                  console.error("[BRICK] Error de pago:", json)
                  const msg =
                    json?.message ||
                    json?.error ||
                    "Error procesando el pago"
                  setCardMsg(msg)
                  throw new Error(msg)
                }

                // ✅ PASO C: redirección según status (termina en success)
                const status = String(json.status || "").toLowerCase()
                const paymentId = json.id ? String(json.id) : ""
                const statusDetail = json.status_detail ? String(json.status_detail) : ""

                // guardado útil (opcional)
                localStorage.setItem("lastOrder", JSON.stringify({ orderId, paymentId, status }))

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

                // rejected / cancelled / otros
                router.push(`/checkout/failure?${qs.toString()}`)

              } catch (e) {
                setCardLoading(false)
                throw e
              }
            },
          },
        })
        .then((brick: any) => {
          cardBrickRef.current = brick
        })
        .catch((err: any) => {
          console.error("[BRICK] Error en create():", err)
          setCardMsg("No se pudo cargar el formulario de tarjeta.")
          setCardLoading(false)
        })
    }

    // Cargar SDK si no está
    let s = document.getElementById("mp-sdk") as HTMLScriptElement | null
    if (!s) {
      s = document.createElement("script")
      s.id = "mp-sdk"
      s.src = "https://sdk.mercadopago.com/js/v2"
      s.async = true
      s.onload = () => mount()
      s.onerror = () => {
        setCardMsg("No se pudo cargar el SDK de MercadoPago.")
        setCardLoading(false)
      }
      document.body.appendChild(s)
    } else {
      mount()
    }

    return () => {
      cardBrickRef.current?.unmount?.()
    }
  }, [step, payMethod, serverTotals, items, envio, cp, router])
useEffect(() => {
  if (!items.length) {
    setSummaryTotals(null)
    return
  }

  // si es domicilio, solo calculamos cuando haya CP + quote de shipping (si querés)
  if (envio === "domicilio" && !/^\d{4}$/.test(cp)) {
    setSummaryTotals(null)
    return
  }

  fetchSummaryTotals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [items, envio, cp, effectiveComboId])

  return (
    <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6 mt-20">
      {/* --------- FORM PRINCIPAL --------- */}
      <div className="md:col-span-2 space-y-10">
        {/* Stepper */}
        <div className="flex justify-between items-center text-sm uppercase font-medium border-b pb-4">
          <span className={step === "contacto" ? "text-black" : "text-gray-500"}>Carrito</span>
          <span className={step === "entrega" ? "text-black" : "text-gray-500"}>Entrega</span>
          <span className={step === "pago" ? "text-black" : "text-gray-500"}>Pago</span>
        </div>

        {/* Paso 1 */}
        {step === "contacto" && (
          <>
            <section>
              <h2 className="text-lg font-bold mb-4 uppercase">Datos de contacto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput placeholder="Nombre" value={nombre} onChange={setNombre} required />
                <ValidatedInput placeholder="Apellido" value={apellido} onChange={setApellido} required />
              </div>
              <ValidatedInput placeholder="Teléfono" value={telefono} onChange={setTelefono} required />
              <ValidatedInput placeholder="Email" value={email} onChange={setEmail} required />

            </section>

            <button
              disabled={!puedeContinuarContacto}
              onClick={() => setStep("entrega")}
              className={`w-full py-3 rounded mt-6 text-white ${puedeContinuarContacto ? "bg-black" : "bg-gray-300 cursor-not-allowed"
                }`}
            >
              Continuar
            </button>
          </>
        )}

        {/* Paso 2 */}
        {step === "entrega" && (
          <section>
            <h2 className="text-lg font-bold mb-4 uppercase">Entrega</h2>
<label className="flex items-center gap-2 border p-4 rounded cursor-pointer mb-3">
  <input
    type="radio"
    checked={envio === "domicilio"}
    onChange={() => setEnvio("domicilio")}
  />
  <div>
    <p className="font-semibold">Envío a domicilio</p>
    <p className="text-xs text-gray-500">
      El costo se calculará según tu código postal luego de la compra.
      Te informaremos el valor exacto antes de despachar.
    </p>
  </div>
  <span className="ml-auto text-sm font-medium text-gray-700">
    Se cotiza luego
  </span>
</label>

{envio === "domicilio" && (
              <div className="mb-6 space-y-3">
                <h3 className="font-semibold">Datos de envío</h3>
                <ValidatedInput placeholder="Calle" value={destinatario.calle} onChange={(v: string) => handleChangeDestinatario("calle", v)} />
                <ValidatedInput
  placeholder="Número"
  value={destinatario.numero}
  onChange={(v: string) => {
    const onlyNumbers = v.replace(/\D/g, "") // elimina todo lo que no sea dígito
    handleChangeDestinatario("numero", onlyNumbers)
  }}
/>
                <ValidatedInput placeholder="Provincia" value={destinatario.barrio} onChange={(v: string) => handleChangeDestinatario("barrio", v)} />
                <ValidatedInput placeholder="Ciudad" value={destinatario.ciudad} onChange={(v: string) => handleChangeDestinatario("ciudad", v)} />
              </div>
            )}


            {envio === "domicilio" && (
  <p className="text-xs text-gray-500 ml-6 mt-2">
    El costo del envío se calculará según tu código postal luego de la compra.
    Nos contactaremos para informarte el valor exacto antes de despachar.
  </p>
)}


            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-3">
              <input type="radio" checked={envio === "sucursal"} onChange={() => setEnvio("sucursal")} />
              <div>
                <p className="font-semibold">Retirar por sucursal</p>
                <p className="text-xs text-gray-500">Retiro a partir de las 24 hs. luego de acreditado el pago.</p>
              </div>
              <span className="ml-auto font-bold">Gratis</span>
            </label>

           <button
  disabled={!puedeContinuarEntrega}
  onClick={() => setStep("pago")}
  className={`w-full py-3 rounded mt-6 text-white ${
    puedeContinuarEntrega
      ? "bg-black"
      : "bg-gray-300 cursor-not-allowed"
  }`}
>
  Continuar
</button>


            
          </section>
        )}

        {/* Paso 3 */}
        {step === "pago" && (
          <section>
            <h2 className="text-lg font-bold mb-4 uppercase">Finalizar compra</h2>

            
            <h3 className="font-semibold mb-3">Medios de pago</h3>

            <div className="space-y-3">
              {/* Tarjeta inline */}
              {/* Transferencia / Efectivo -> WhatsApp */}
              <label
                onClick={() => {
                  setPayMethod("transfer") // o "cash" si querés distinguir
                  orderIdRef.current = "" // opcional
                  handleTransferOrCashWhatsApp()
                }}
                className={`flex items-center justify-between border rounded p-4 cursor-pointer transition ${payMethod === "transfer"
                  ? "border-amber-600 bg-amber-50"
                  : "hover:border-black"
                  }`}
              >
                <div>
                  <p className="font-medium">Efectivo / Transferencia</p>
                  <p className="text-sm text-gray-500">
                    Coordinamos por WhatsApp y te pasamos los datos
                  </p>
                </div>
                <span className="text-lg">💸</span>
              </label>

              <label
                onClick={() => {
                  setPayMethod("card_inline")
                  orderIdRef.current = ""
                  setServerTotals(null)
                  fetchServerTotals() // ✅ solo acá
                }}

                className={`flex items-center justify-between border rounded p-4 cursor-pointer transition ${payMethod === "card_inline" ? "border-blue-600 bg-blue-50" : "hover:border-black"
                  }`}
              >
                <div>
                  <p className="font-medium">Tarjeta (pagar acá mismo)</p>
                  <p className="text-sm text-gray-500">Visa / Mastercard / débito (si aplica)</p>
                </div>
                <span className="text-lg">💳</span>
              </label>

              {payMethod === "card_inline" && (
                <div className="border rounded-2xl p-4 mt-2">
                  <div id="card-payment-brick" />
                  {cardLoading && <p className="text-sm text-gray-500 mt-2">Procesando…</p>}
                  {!!cardMsg && <p className="text-sm mt-2 text-red-600">{cardMsg}</p>}
                </div>
              )}

              {/* MP redirect */}
              <label
                onClick={handleMercadoPago}
                className="flex items-center justify-between border rounded p-4 cursor-pointer hover:border-black transition bg-blue-600 text-white hover:bg-blue-700"
              >
                <div>
                  <p className="font-medium">MercadoPago</p>
                  <p className="text-sm">Hasta 3 cuotas sin interés</p>
                </div>
                <span className="text-lg">💳</span>
              </label>
            </div>
          </section>
        )}
      </div>

      {/* --------- RESUMEN --------- */}
      <aside className="space-y-4 border p-4 rounded">
        {items.map((item: any, idx: number) => {
          const key = item.cartKey ?? `${item.productId ?? item._id}__${item.talle ?? "default"}__${idx}`
          return (
            <div key={key} className="flex gap-3 items-center border-b pb-2">
              <Image src={item.imagen} alt={item.nombre} width={60} height={80} className="object-cover rounded" />
              <div className="flex-1 text-sm">
                <p>{item.nombre}</p>
                {item.talle && <p className="text-xs text-gray-500">Talle: {item.talle}</p>}
                <p className="text-xs text-gray-500">
  Precio de lista: <span className="font-semibold">
    ${Number(item.precio).toLocaleString("es-AR")}
  </span>{" "}
  × {Number(item.cantidad)}
</p>
<p className="text-xs text-green-700">
  Promo 2x1 aplicada en el total ✅
</p>

              </div>
            </div>
          )
        })}

{/* Subtotal sin promo (precio lista) */}
<div className="flex justify-between text-sm">
  <span className="text-gray-600">Subtotal</span>
  <span className="text-gray-600">
    ${subtotalSinPromo.toLocaleString("es-AR")}
  </span>
</div>

{/* Descuento */}
{!summaryLoading && descuentoPromo > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-green-700 font-medium">Descuento</span>
    <span className="text-green-700 font-semibold">
      -${descuentoPromo.toLocaleString("es-AR")}
    </span>
  </div>
)}

{/* Subtotal con promo (server) */}
<div className="flex justify-between font-medium">
  <span>Total</span>
  <span>
    {summaryLoading ? "Calculando..." : `$${subtotalConPromo.toLocaleString("es-AR")}`}
  </span>
</div>

{/* Envío */}
<div className="flex justify-between text-sm text-gray-600 pt-1">
  <span>Envío</span>
  <span>
    {envio === "sucursal"
      ? "Gratis"
      : envio === "domicilio"
        ? "Se cotiza luego"
        : "—"}
  </span>
</div>



{/* Total final */}
<div className="flex justify-between text-lg font-bold border-t pt-2">
  <span>Total</span>
  <span>
  ${subtotalConPromo.toLocaleString("es-AR")}
</span>

</div>

      </aside>
    </main>
  )
}
