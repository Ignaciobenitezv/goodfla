'use client'

import Link from "next/link"
import { FaWhatsapp } from "react-icons/fa"

export default function WhatsAppButton() {
  const phone = "5493624545344"
  const message = "Quiero saber más información sobre..."

  return (
    <Link
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 md:p-4 shadow-lg transition z-[999] flex items-center justify-center animate-pulse-whatsapp"
    >
      <FaWhatsapp className="w-6 h-6 md:w-8 md:h-8" />
    </Link>
  )
}