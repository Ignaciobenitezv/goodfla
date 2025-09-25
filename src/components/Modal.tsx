"use client"

import { ReactNode } from "react"

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Contenedor del modal */}
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 relative">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-black text-2xl"
        >
          &times;
        </button>

        {/* Contenido dinámico */}
        {children}
      </div>
    </div>
  )
}
