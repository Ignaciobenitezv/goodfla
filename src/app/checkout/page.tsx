"use client"

import { useState, useEffect, useRef } from "react"
import { useCart } from "@/context/CartContext"
import ValidatedInput from "@/components/ValidatedInput"
import Image from "next/image"
declare global { interface Window { MercadoPago?: any } }


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
  const { items } = useCart()

  // STEPS: contacto → entrega → pago
  const [step, setStep] = useState<"contacto" | "entrega" | "pago">("contacto")

  // Paso 1: datos de contacto
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [telefono, setTelefono] = useState("")

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

  const totalProductos = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const costoEnvio = quote?.price ?? 0
  const total = totalProductos + costoEnvio

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
      const res = await fetch(`/api/shipping?cp=${cp}`)
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

  const puedeContinuarContacto = nombre && apellido && telefono

  // 🔹 MercadoPago actualizado
  const handleMercadoPago = async () => {
    try {
      // Guardar orden para updateStock en success
      // Guardar orden para updateStock en success
const lastOrderPayload = items.map((i: any, idx: number) => ({
  // Prioridad: _id real de Sanity → productId → slug → fallback estable
  productId: i._id ?? i.productId ?? i.slug ?? `${i.nombre}-${i.talle ?? ""}-${i.color ?? ""}-${idx}`,
  cantidad: i.cantidad,
}))
localStorage.setItem("lastOrder", JSON.stringify(lastOrderPayload))


      // Guardar carrito completo (para limpiar después)
      localStorage.setItem("cart", JSON.stringify(items))

      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        alert("No se pudo generar el link de pago con MercadoPago.")
      }
    } catch (err) {
      console.error("❌ Error con MP:", err)
      alert("Hubo un problema con MercadoPago.")
    }
  }

    // ✅ NUEVO: selección y refs del Brick
  const [payMethod, setPayMethod] = useState<"transfer"|"cash"|"mp_redirect"|"card_inline"|null>(null)
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardBrickRef = useRef<any>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardMsg, setCardMsg] = useState("")

  // ✅ Montar el Card Brick cuando elijan “Tarjeta (pagar acá mismo)”
  useEffect(() => {
    if (step !== "pago" || payMethod !== "card_inline") return

    const mount = () => {
  if (!window.MercadoPago) return;

  // ✅ leer y validar la public key como string
  const PUBLIC_KEY = String(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "").trim();
  console.log("MP PUBLIC KEY:", PUBLIC_KEY); // debería mostrar TEST-xxxx...
  if (!PUBLIC_KEY) {
    console.error("Falta NEXT_PUBLIC_MP_PUBLIC_KEY");
    setCardMsg("No se pudo cargar el formulario de tarjeta.");
    return;
  }

  // ✅ asegurá que el monto sea numérico
  const amount = Number(total);
  console.log("amount:", amount, typeof amount); // debería ser number

  const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" });
  const bricks = mp.bricks();

  bricks.create("cardPayment", cardContainerRef.current!, {
    initialization: { amount },
    customization: { paymentMethods: { maxInstallments: 6 } },
    callbacks: {
      onReady: () => setCardLoading(false),
      onError: (err:any) => {
        console.error("Brick error ▶", err);
        setCardMsg("No se pudo cargar el formulario de tarjeta.");
      },
      onSubmit: async (data:any) => {
        setCardMsg(""); setCardLoading(true);

        const payload = {
          token: String(data.token),
          issuer_id: data.issuer_id != null ? String(data.issuer_id) : undefined,
          payment_method_id: String(data.paymentMethodId || data.payment_method_id),
          installments: Number(data.installments ?? 1),
          email: data.payer?.email ? String(data.payer.email) : undefined,
          identification: data.payer?.identification
            ? { type: String(data.payer.identification.type), number: String(data.payer.identification.number) }
            : undefined,
        };

        const res = await fetch("/api/payments/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        setCardLoading(false);

        if (!res.ok || !json.ok) {
          setCardMsg(json.error || "Error procesando el pago");
          throw new Error(json.error || "Pago rechazado");
        }

        alert("¡Pago aprobado! ID: " + json.id);
      },
    },
  }).then((brick:any) => (cardBrickRef.current = brick));
};


    // Cargar SDK si no está
    let s = document.getElementById("mp-sdk") as HTMLScriptElement | null
    if (!s) {
      s = document.createElement("script")
      s.id = "mp-sdk"
      s.src = "https://sdk.mercadopago.com/js/v2"
      s.async = true
      s.onload = mount
      document.body.appendChild(s)
    } else {
      mount()
    }

    return () => { cardBrickRef.current?.unmount?.() }
  }, [step, payMethod, total])


  return (
    <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
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
                <ValidatedInput placeholder="Nombre" value={nombre} onChange={setNombre} />
                <ValidatedInput placeholder="Apellido" value={apellido} onChange={setApellido} />
              </div>
              <ValidatedInput placeholder="Teléfono" value={telefono} onChange={setTelefono} />
            </section>

            <button
              disabled={!puedeContinuarContacto}
              onClick={() => setStep("entrega")}
              className={`w-full py-3 rounded mt-6 text-white ${
                puedeContinuarContacto ? "bg-black" : "bg-gray-300 cursor-not-allowed"
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
            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-3">
              <input
                type="radio"
                checked={envio === "domicilio"}
                onChange={() => setEnvio("domicilio")}
              />
              <div>
                <p className="font-semibold">Envío a domicilio</p>
                {quote && <p className="text-xs text-gray-500">Llega entre {quote.etaFrom} y {quote.etaTo}</p>}
              </div>
              <span className="ml-auto font-bold">
                {quote ? (quote.price === 0 ? "Gratis" : `$${quote.price.toLocaleString("es-AR")}`) : "—"}
              </span>
            </label>

            {envio === "domicilio" && (
              <div className="ml-6">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cp}
                    onChange={(e) => {
                      setCp(e.target.value)
                      setCpStatus("idle")
                      setQuote(null)
                      setCpError(null)
                    }}
                    placeholder="Código Postal"
                    className="border px-3 py-2 rounded w-40"
                  />
                  <button
                    onClick={calcularEnvio}
                    className="px-4 py-2 border rounded bg-gray-100 text-sm"
                  >
                    {cpStatus === "checking"
                      ? "Calculando…"
                      : quote
                      ? `Cambiar CP ${quote.cp}`
                      : "Calcular envío"}
                  </button>
                </div>
                {cpStatus === "error" && cpError && (
                  <p className="text-sm text-red-600 mt-2">{cpError}</p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-3">
              <input
                type="radio"
                checked={envio === "sucursal"}
                onChange={() => setEnvio("sucursal")}
              />
              <div>
                <p className="font-semibold">Retirar por sucursal</p>
                <p className="text-xs text-gray-500">Retiro a partir de las 24 hs. luego de acreditado el pago.</p>
              </div>
              <span className="ml-auto font-bold">Gratis</span>
            </label>

            <button
              disabled={envio === ""}
              onClick={() => setStep("pago")}
              className={`w-full py-3 rounded mt-6 text-white ${
                envio ? "bg-black" : "bg-gray-300 cursor-not-allowed"
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
            {envio === "domicilio" && (
              <div className="mb-6 space-y-3">
                <h3 className="font-semibold">Datos de envío</h3>
                <ValidatedInput placeholder="Calle" value={destinatario.calle} onChange={(v: string) => handleChangeDestinatario("calle", v)} />
<ValidatedInput placeholder="Número" value={destinatario.numero} onChange={(v: string) => handleChangeDestinatario("numero", v)} />
<ValidatedInput placeholder="Barrio (opcional)" value={destinatario.barrio} onChange={(v: string) => handleChangeDestinatario("barrio", v)} />
<ValidatedInput placeholder="Ciudad" value={destinatario.ciudad} onChange={(v: string) => handleChangeDestinatario("ciudad", v)} />

              </div>
            )}

            <h3 className="font-semibold mb-3">Medios de pago</h3>
            <div className="space-y-3">
              {/* Transferencia */}
              <label
                onClick={() => {
                  const phone = "5493624545344"
                  const message = `Hola! Quiero pagar por *Transferencia/Depósito*.\n\nPedido:\n${items.map(
                    (i) => `- ${i.nombre} x${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString("es-AR")}`
                  ).join("\n")}\nTotal: $${total.toLocaleString("es-AR")}\n\n${
                    envio === "domicilio" ? `Dirección: ${destinatario.calle} ${destinatario.numero}, ${destinatario.barrio || ""}, ${destinatario.ciudad}` : "Retiro en sucursal"
                  }`
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
                }}
                className="flex items-center justify-between border rounded p-4 cursor-pointer hover:border-black transition"
              >
                <div>
                  <p className="font-medium">Transferencia o Depósito</p>
                  <p className="text-sm text-gray-500">10% de descuento</p>
                </div>
                <span className="text-lg">💵</span>
              </label>

              {/* Efectivo */}
              <label
                onClick={() => {
                  const phone = "5493624545344"
                  const message = `Hola! Quiero pagar en *Efectivo*.\n\nPedido:\n${items.map(
                    (i) => `- ${i.nombre} x${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString("es-AR")}`
                  ).join("\n")}\nTotal: $${total.toLocaleString("es-AR")}\n\n${
                    envio === "domicilio" ? `Dirección: ${destinatario.calle} ${destinatario.numero}, ${destinatario.barrio || ""}, ${destinatario.ciudad}` : "Retiro en sucursal"
                  }`
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
                }}
                className="flex items-center justify-between border rounded p-4 cursor-pointer hover:border-black transition"
              >
                <div>
                  <p className="font-medium">Efectivo</p>
                  <p className="text-sm text-gray-500">15% de descuento</p>
                </div>
                <span className="text-lg">💵</span>
              </label>

 {/* ✅ NUEVO: Tarjeta (pagar acá mismo) */}
              <label
                onClick={() => setPayMethod("card_inline")}
                className="flex items-center justify-between border rounded p-4 cursor-pointer hover:border-black transition"
              >
                <div>
                  <p className="font-medium">Tarjeta (pagar acá mismo)</p>
                  <p className="text-sm text-gray-500">Visa / Mastercard / débito (si aplica)</p>
                </div>
                <span className="text-lg">🧱</span>
              </label>
{/* Contenedor del Brick (se muestra solo cuando elegís Tarjeta) */}
{payMethod === "card_inline" && (
  <div className="border rounded-2xl p-4 mt-2">
    <div ref={cardContainerRef} />
    {cardLoading && <p className="text-sm text-gray-500 mt-2">Procesando…</p>}
    {!!cardMsg && <p className="text-sm mt-2">{cardMsg}</p>}
  </div>
)}



              {/* MercadoPago */}
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
        {items.map((item, idx) => {
  const anyItem = item as any;
  const key =
    anyItem._id ??
    anyItem.slug ??
    `${item.nombre}-${(anyItem.talle ?? "")}-${(anyItem.color ?? "")}-${idx}`;

  return (
    <div key={key} className="flex gap-3 items-center border-b pb-2">
      <Image src={item.imagen} alt={item.nombre} width={60} height={80} className="object-cover rounded" />
      <div className="flex-1 text-sm">
        <p>{item.nombre}</p>
        <p className="font-bold">${item.precio.toLocaleString("es-AR")} × {item.cantidad}</p>
      </div>
    </div>
  );
})}

        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>${totalProductos.toLocaleString("es-AR")}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Costo de envío</span>
          <span>{quote ? (quote.price === 0 ? "Gratis" : `$${quote.price.toLocaleString("es-AR")}`) : "—"}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total</span>
          <span>${total.toLocaleString("es-AR")}</span>
        </div>
      </aside>
    </main>
  )
}
