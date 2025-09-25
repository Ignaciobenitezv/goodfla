"use client"

import { useState } from "react"
import { useCart } from "@/context/CartContext"
import ValidatedInput from "@/components/ValidatedInput"
import { useRouter } from "next/navigation"
import Image from "next/image"

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
  const router = useRouter()

  // STEPS: contacto → entrega → datos
  const [step, setStep] = useState<"contacto" | "entrega" | "datos">("contacto")

  // Contacto
  const [email, setEmail] = useState("")
  const [emailValid, setEmailValid] = useState(false)

  // CP + cotización
  const [cp, setCp] = useState("")
  const [cpStatus, setCpStatus] = useState<"idle" | "checking" | "ok" | "error">(
    "idle"
  )
  const [quote, setQuote] = useState<Quote | null>(null)
  const [cpError, setCpError] = useState<string | null>(null)

  // Entrega
  const [envio, setEnvio] = useState<"" | "domicilio" | "sucursal">("")
  // Datos del destinatario / facturación (se completan en el paso 3)
  const [dni, setDni] = useState("")
  const [destinatario, setDestinatario] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    calle: "",
    numero: "",
    barrio: "",
    ciudad: "",
  })
  const [facturacion, setFacturacion] = useState({ mismo: true })

  const totalProductos = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const costoEnvio = quote?.price ?? 0
  const total = totalProductos + costoEnvio

  const handleChangeDestinatario = (field: string, value: string) =>
    setDestinatario((p) => ({ ...p, [field]: value }))

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

  const puedeContinuarContacto = emailValid && cpStatus === "ok"

  return (
    <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
      {/* --------- FORM PRINCIPAL --------- */}
      <div className="md:col-span-2 space-y-10">
        {/* Stepper */}
        <div className="flex justify-between items-center text-sm uppercase font-medium border-b pb-4">
          <span className={step === "contacto" ? "text-black" : "text-gray-500"}>
            Carrito
          </span>
          <span className={step !== "contacto" ? "text-black" : "text-gray-500"}>
            Entrega
          </span>
          <span className="text-gray-500">Pago</span>
        </div>

        {/* Paso 1: Contacto + CP */}
        {step === "contacto" && (
          <>
            <section>
              <h2 className="text-lg font-bold mb-4 uppercase">
                Datos de contacto
              </h2>

              {/* Email con validación */}
              <ValidatedInput
                type="email"
                placeholder="Email"
                value={email}
                onChange={(v) => {
                  setEmail(v)
                  setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                }}
                validate={(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
                label="" // sin label, como en Trópico
              />

              <div className="flex items-center mt-2">
                <input type="checkbox" id="newsletter" className="mr-2" />
                <label htmlFor="newsletter" className="text-sm">
                  Quiero recibir ofertas y novedades por e-mail
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4 uppercase">Entrega</h2>
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

              {/* Mensajes CP */}
              {cpStatus === "ok" && quote && (
                <p className="text-sm text-gray-600 mt-2">
                  {quote.price === 0 ? (
                    <>Envío <b>GRATIS</b> — llega entre <b>{quote.etaFrom}</b> y{" "}
                    <b>{quote.etaTo}</b>.</>
                  ) : (
                    <>
                      Costo de envío: <b>${quote.price.toLocaleString("es-AR")}</b> — llega
                      entre <b>{quote.etaFrom}</b> y <b>{quote.etaTo}</b>.
                    </>
                  )}
                </p>
              )}
              {cpStatus === "error" && cpError && (
                <p className="text-sm text-red-600 mt-2">{cpError}</p>
              )}
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

        {/* Paso 2: Selección de entrega (se habilita tras CP OK) */}
        {step === "entrega" && (
          <section>
            <h2 className="text-lg font-bold mb-4 uppercase">Entrega</h2>

            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-3">
              <input
                type="radio"
                checked={envio === "domicilio"}
                onChange={() => {
                  setEnvio("domicilio")
                  setStep("datos")
                }}
              />
              <div>
                <p className="font-semibold">Envío a domicilio</p>
                <p className="text-xs text-gray-500">
                  {quote
                    ? `Llega entre ${quote.etaFrom} y ${quote.etaTo}`
                    : "Calculá el CP para ver tiempos"}
                </p>
              </div>
              <span className="ml-auto font-bold">
                {quote ? (quote.price === 0 ? "Gratis" : `$${quote.price.toLocaleString("es-AR")}`) : "—"}
              </span>
            </label>

            <label className="flex items-center gap-2 border p-3 rounded cursor-pointer mb-3">
              <input
                type="radio"
                checked={envio === "sucursal"}
                onChange={() => {
                  setEnvio("sucursal")
                  setStep("datos")
                }}
              />
              <div>
                <p className="font-semibold">Retirar por sucursal</p>
                <p className="text-xs text-gray-500">
                  Retiro a partir de las 24 hs. luego de acreditado el pago.
                </p>
              </div>
              <span className="ml-auto font-bold">Gratis</span>
            </label>
          </section>
        )}

        {/* Paso 3: Datos del destinatario y facturación */}
        {step === "datos" && (
          <>
            <section>
              <h2 className="text-lg font-bold mb-4 uppercase">
                Datos del destinatario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  placeholder="Nombre"
                  value={destinatario.nombre}
                  onChange={(v) => handleChangeDestinatario("nombre", v)}
                />
                <ValidatedInput
                  placeholder="Apellido"
                  value={destinatario.apellido}
                  onChange={(v) => handleChangeDestinatario("apellido", v)}
                />
                <ValidatedInput
                  placeholder="Teléfono"
                  value={destinatario.telefono}
                  onChange={(v) => handleChangeDestinatario("telefono", v)}
                />
                <ValidatedInput
                  placeholder="Calle"
                  value={destinatario.calle}
                  onChange={(v) => handleChangeDestinatario("calle", v)}
                />
                <ValidatedInput
                  placeholder="Número"
                  value={destinatario.numero}
                  onChange={(v) => handleChangeDestinatario("numero", v)}
                />
                <ValidatedInput
                  placeholder="Ciudad"
                  value={destinatario.ciudad}
                  onChange={(v) => handleChangeDestinatario("ciudad", v)}
                />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4 uppercase">
                Datos de facturación
              </h2>
              <ValidatedInput
                label="DNI o CUIT"
                type="text"
                value={dni}
                onChange={setDni}
                required
                validate={(val) => /^\d{8,11}$/.test(val)}
              />
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  checked={facturacion.mismo}
                  onChange={(e) =>
                    setFacturacion((p) => ({ ...p, mismo: e.target.checked }))
                  }
                  className="mr-2"
                />
                <label className="text-sm">
                  Mis datos de facturación y entrega son los mismos
                </label>
              </div>
            </section>

            <button
              onClick={() => router.push("/checkout/pago")}
              className="w-full bg-black text-white py-3 rounded mt-6"
            >
              Continuar para el pago
            </button>
          </>
        )}
      </div>

      {/* --------- RESUMEN --------- */}
      <aside className="space-y-4 border p-4 rounded">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 items-center border-b pb-2">
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
        ))}

        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>${totalProductos.toLocaleString("es-AR")}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Costo de envío</span>
          <span>
            {quote
              ? quote.price === 0
                ? "Gratis"
                : `$${quote.price.toLocaleString("es-AR")}`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total</span>
          <span>${total.toLocaleString("es-AR")}</span>
        </div>
      </aside>
    </main>
  )
}
