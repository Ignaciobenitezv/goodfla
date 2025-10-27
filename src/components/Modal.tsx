"use client"

import { ReactNode } from "react"

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose} // clic fuera cierra
      aria-modal="true"
      role="dialog"
    >
      {/* separa el panel del navbar */}
      <div className="w-full max-w-6xl mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white rounded-2xl shadow-lg">
          {/* Botón cerrar siempre visible */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-xl leading-none hover:bg-gray-50"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Contenido scrolleable */}
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
