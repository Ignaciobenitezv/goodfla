"use client"
import Image from "next/image"
import { useRef, useState } from "react"

type Props = {
  src: string
  alt: string
  /** Tamaño visible de la imagen (mismo que usabas antes) */
  width?: number
  height?: number
  /** Nivel de zoom de la lupa */
  zoom?: number
  /** Diámetro de la lupa en px */
  lens?: number
}

/**
 * Lupa/magnifier que NO altera el tamaño ni el layout:
 * - El contenedor tiene width/height fijos (600x800 por default)
 * - La lupa es un overlay dentro del wrapper (overflow-hidden)
 * - Nada se superpone a la columna de la derecha
 */
export default function ZoomImage({
  src,
  alt,
  width = 600,
  height = 800,
  zoom = 2,
  lens = 170,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [xy, setXY] = useState({ x: width / 2, y: height / 2 }) // coords en px dentro del wrapper

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    setXY({ x, y })
  }

  return (
    <div
  ref={wrapRef}
  className="relative overflow-hidden rounded-md select-none"
  style={{ width: `${width}px`, height: `${height}px` }}  // 🔥 Fijo
  onMouseEnter={() => setShow(true)}
  onMouseLeave={() => setShow(false)}
  onMouseMove={handleMove}
>

      {/* Imagen base - NO cambia de tamaño */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block object-cover"
        priority
      />

      {/* Lupa */}
      {show && (
        <div
          className="absolute pointer-events-none rounded-full border border-white/70 shadow-[0_0_0_2px_rgba(0,0,0,0.15)] bg-white/5"
          style={{
            width: lens,
            height: lens,
            left: xy.x,
            top: xy.y,
            transform: "translate(-50%, -50%)",
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            // Imagen agrandada detrás de la lupa
            backgroundSize: `${width * zoom}px ${height * zoom}px`,
            // Centramos el punto del cursor dentro de la lupa
            backgroundPosition: `${-(xy.x * zoom - lens / 2)}px ${-(xy.y * zoom - lens / 2)}px`,
          }}
        />
      )}
    </div>
  )
}
