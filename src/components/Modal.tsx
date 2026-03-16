"use client"

import { ReactNode } from "react"

interface ModalProps {
  children: ReactNode
  onClose: () => void
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-start justify-center pt-[88px] sm:pt-[96px] px-3 sm:px-6 pb-3 sm:pb-6 overflow-hidden"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-[540px] sm:max-w-6xl h-[calc(100vh-88px)] sm:h-[calc(100vh-120px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white rounded-2xl shadow-xl h-full flex flex-col overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-xl leading-none hover:bg-gray-50"
            aria-label="Cerrar"
            type="button"
          >
            ×
          </button>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}