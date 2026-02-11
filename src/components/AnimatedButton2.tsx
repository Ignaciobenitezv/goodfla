'use client'

import { motion } from 'framer-motion'

interface Props {
  label?: string
}

export default function AnimatedButton2({ label = "APROVECHAR AHORA" }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 40 }}              // 👉 empieza abajo y oculto
      animate={{ opacity: 1, y: 0 }}               // 👉 sube a su posición normal
      transition={{
        duration: 0.8,
        type: "spring",
        bounce: 0.45                               // 👉 efecto rebote
      }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      className="
        group
        inline-flex items-center gap-3
        px-8 py-3
        rounded-full
        bg-marca-amarillo
        text-black font-semibold tracking-wide
        shadow-lg shadow-black/30
        hover:bg-[#f4c243]
        transition-colors
        animate-pulse-whatsapp        /* 👈 mismo pulso que el botón de WhatsApp */
      "
    >
      {/* Texto */}
      <span className="text-base sm:text-lg md:text-xl font-bold">
        {label}
      </span>

      {/* Flecha animada */}
      <motion.span
        className="text-black text-xl"
        whileHover={{ x: 6 }}
        transition={{ duration: 0.2 }}
      >
        →
      </motion.span>
    </motion.button>
  )
}
