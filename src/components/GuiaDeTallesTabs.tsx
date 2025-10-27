"use client"

import { useState, useEffect, useMemo } from "react"
import { FiX } from "react-icons/fi"
import Image from "next/image"

type Props = {
  abierto: boolean
  onClose: () => void
  imagen?: string
  tipo: "jean" | "remera"
}

/** === TABLAS DE MEDIDAS PARA JEANS Y REMERAS === */
const tablaJeans = [
  { talle: 38, cintura: 76, cadera: 109, largo: 107, tiro: 35, botamanga: 41 },
  { talle: 40, cintura: 80, cadera: 114, largo: 111, tiro: 39, botamanga: 42 },
  { talle: 42, cintura: 84, cadera: 113, largo: 112, tiro: 39, botamanga: 44 },
  { talle: 44, cintura: 88, cadera: 118, largo: 112, tiro: 39, botamanga: 44 },
  { talle: 46, cintura: 92, cadera: 122, largo: 113, tiro: 40, botamanga: 45 },
]

const tablaRemeras = [
  { talle: "S", busto: 115, largo: 62, largoManga: 21 },
  { talle: "M", busto: 119, largo: 65, largoManga: 22 },
  { talle: "L", busto: 122, largo: 68, largoManga: 24 },
  { talle: "XL", busto: 130, largo: 70, largoManga: 26 },
]

/** Helpers */
const idxByTalle = (t: number | string, tipo: "jean" | "remera") => {
  if (tipo === "jean") {
    return tablaJeans.findIndex(r => r.talle === t)
  } else {
    return tablaRemeras.findIndex(r => r.talle === t)
  }
}

/** Calcular TALLE RECOMENDADO para jeans */
function recomendarTalleJeans(caderaUsuario: number | null): number | null {
  if (caderaUsuario == null) return null

  const f = tablaJeans.find(r => r.cadera >= caderaUsuario)
  if (f) return f.talle

  const max = tablaJeans[tablaJeans.length - 1].cadera
  return caderaUsuario > 132 ? null : tablaJeans[tablaJeans.length - 1].talle
}

/** Calcular TALLE RECOMENDADO para remeras */
function recomendarTalleRemera(bustoUsuario: number | null): string | null {
  if (bustoUsuario == null) return null

  // Lógica de recomendación de talles con los datos corregidos
  if (bustoUsuario <= 115) return "S"
  if (bustoUsuario <= 119) return "M"
  if (bustoUsuario <= 122) return "L"
  if (bustoUsuario <= 140) return "XL"
  return null
}

/** POSICIÓN DE LA FLECHA (▲) para los jeans */
function posicionFlechaJeans(caderaUsuario: number, talleSel: number): string {
  const i = idxByTalle(talleSel, "jean")
  if (i < 0) return "50%"

  const hips = tablaJeans.map(r => r.cadera)
  let { prev, actual, next } = vecinosExt(hips, i)

  const low = mid(prev, actual)
  const high = mid(actual, next)

  let p = (caderaUsuario - low) / (high - low)
  p = Math.max(0, Math.min(1, p))

  const pos = 10 + (1 - p) * 80
  return `${pos}%`
}

/** POSICIÓN DE LA FLECHA (▲) para las remeras */
function posicionFlechaRemera(bustoUsuario: number, talleSel: string): string {
  const i = idxByTalle(talleSel, "remera")
  if (i < 0) return "50%"

  const bustos = tablaRemeras.map(r => r.busto)
  let { prev, actual, next } = vecinosExt(bustos, i)

  // Ajustamos el valor de "low" y "high" según el tamaño real del busto
  const low = mid(prev, actual)
  const high = mid(actual, next)

  // Mapeamos el valor de bustoUsuario a una posición más precisa entre los valores
  let p = (bustoUsuario - low) / (high - low)
  p = Math.max(0, Math.min(1, p))

  // En lugar de 100% o 0%, ahora movemos la flecha proporcionalmente
  const pos = 10 + (1 - p) * 80

  return `${pos}%`
}


/** PUNTO MEDIO entre dos números */
const mid = (a: number, b: number) => (a + b) / 2

/** Para los bordes (38 y 46) extendemos simétricamente el vecino */
function vecinosExt(dxs: number[], i: number) {
  const actual = dxs[i]
  const prev = i > 0 ? dxs[i - 1] : actual - (dxs[i + 1] - actual)
  const next = i < dxs.length - 1 ? dxs[i + 1] : actual + (actual - dxs[i - 1])
  return { prev, actual, next }
}

export default function GuiaDeTallesTabs({ abierto, onClose, imagen, tipo }: Props) {
  const [tab, setTab] = useState<"calcular" | "tabla">("calcular")
  const [busto, setBusto] = useState<number | null>(120)
  const recomendado = useMemo(
    () => (tipo === "jean" ? recomendarTalleJeans(busto) : recomendarTalleRemera(busto)),
    [busto, tipo]
  )
  const [talleSeleccionado, setTalleSeleccionado] = useState<number | string | null>(recomendado ?? null)

  useEffect(() => {
    const rec = tipo === "jean" ? recomendarTalleJeans(busto) : recomendarTalleRemera(busto)
    if (rec) setTalleSeleccionado(rec)
    else setTalleSeleccionado(null)
  }, [busto, tipo])

  if (!abierto) return null

  const flechaLeft =
    busto != null && talleSeleccionado != null
      ? (tipo === "jean"
          ? posicionFlechaJeans(busto, talleSeleccionado as number)
          : posicionFlechaRemera(busto, talleSeleccionado as string))
      : "50%"

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Cerrar */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
          <FiX size={22} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-center">Guía de Talles</h2>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setTab("calcular")}
            className={`flex-1 py-2 text-center font-medium ${
              tab === "calcular" ? "border-b-2 border-black" : "text-gray-500"
            }`}
          >
            Calcular mi talle
          </button>
          <button
            onClick={() => setTab("tabla")}
            className={`flex-1 py-2 text-center font-medium ${
              tab === "tabla" ? "border-b-2 border-black" : "text-gray-500"
            }`}
          >
            Tabla de medidas
          </button>
        </div>

        {/* === Calcular mi talle === */}
        {tab === "calcular" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Imagen */}
            <div className="flex justify-center">
              <Image
                src={imagen || "/placeholder.jpg"}
                alt="Producto"
                width={240}
                height={320}
                className="object-cover rounded"
              />
            </div>

            {/* UI cálculo */}
            <div>
              <h3 className="text-sm font-semibold uppercase mb-3">Poné tus medidas y calculá tu talle</h3>

              <label className="block text-sm font-medium mb-1">BUSTO SIN ESTIRAR (cm):</label>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  value={busto ?? ""}
                  onChange={(e) => setBusto(e.target.value === "" ? null : Number(e.target.value))}
                  className="w-32 border rounded px-3 py-2 text-sm"
                  placeholder="Ej: 120"
                />
                <span className="text-gray-600 text-sm">cm</span>
              </div>

              {busto !== null && (
                <div className="space-y-4">
                  {recomendado ? (
                    <>
                      <p className="text-lg font-semibold">
                        Talle recomendado:{" "}
                        <span className="text-green-600 text-2xl">{recomendado}</span>
                      </p>

                      {/* Barra con flecha */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>AJUSTADO</span>
                          <span className="font-medium">CONTORNO BUSTO</span>
                          <span>HOLGADO</span>
                        </div>
                        <div className="relative mt-1">
                          <div
                            className="absolute -top-3"
                            style={{ left: flechaLeft, transform: "translateX(-50%)" }}
                          >
                            ▲
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200">
                            <div
                              className="h-2 w-full"
                              style={{
                                background:
                                  "linear-gradient(90deg, #ef4444 0% 12%, #22c55e 12% 88%, #ef4444 88% 100%)",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Talles alternativos */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Evaluá otros talles:</h4>
                        <div className="flex gap-2 flex-wrap">
                          {(tipo === "jean" ? tablaJeans : tablaRemeras).map((row) => (
                            <button
                              key={row.talle}
                              onClick={() => setTalleSeleccionado(row.talle)}
                              className={`px-4 py-1.5 border rounded text-sm ${
                                talleSeleccionado === row.talle
                                  ? "bg-black text-white"
                                  : "bg-gray-100 hover:bg-gray-200"
                              }`}
                            >
                              {row.talle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-red-600 font-medium">
                      Actualmente no tenemos una opción que se ajuste perfectamente a tus medidas.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === Tabla de medidas === */}
        {tab === "tabla" && (
          <div>
            <p className="text-red-500 text-sm mb-4 text-center">
              IMPORTANTE! Te recomendamos también calcular tu talle para una mejor experiencia.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-center">
                <thead>
                  <tr className="border-b font-medium bg-gray-100">
                    <th className="p-2">TALLE / MEDIDAS</th>
                    <th className="p-2">BUSTO SIN ESTIRAR (CM)</th>
                    <th className="p-2">LARGO (CM)</th>
                    <th className="p-2">LARGO MANGA (CM)</th>
                  </tr>
                </thead>
                <tbody>
                  {(tipo === "jean" ? tablaJeans : tablaRemeras).map((r) => (
                    <tr key={r.talle} className="border-b">
  <td className="p-2">{r.talle}</td>
  <td className="p-2">{'busto' in r ? r.busto : '—'}</td>
  <td className="p-2">{r.largo}</td>
  <td className="p-2">{'largoManga' in r ? r.largoManga : '—'}</td>
</tr>

                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-sm text-gray-700 space-y-2">
              <p>
                <strong>Contorno del busto:</strong> Rodea con una cinta métrica la parte más ancha del busto.
              </p>
              <p>
                <strong>Largo:</strong> Mide desde el hombro hasta el final de la prenda.
              </p>
              <p className="italic text-gray-500">
                *Las medidas son aproximadas y pueden variar 2–3 cm por confección artesanal.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
