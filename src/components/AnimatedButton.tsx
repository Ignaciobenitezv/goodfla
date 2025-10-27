'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function AnimatedButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 50)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.button
    
      initial={{ opacity: 0, x: -80 }}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -80 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      whileHover={{ scale: 1.05 }}   // 👈 agranda en hover
      whileTap={{ scale: 0.98 }}     // 👈 leve compresión al click
      className="
        group
        bg-marca-amarillo
        px-7 py-3 rounded-full
        border border-black/60
        shadow-sm hover:shadow
        transition
      "
    >
      <span
        className="
          text-outline text-white
          text-xl md:text-2xl font-extrabold tracking-wide
          group-hover:text-black                  /* 👈 texto negro en hover */
          group-hover:[-webkit-text-stroke:0px]   /* 👈 quita reborde */
          group-hover:[text-shadow:none]          /* 👈 quita fallback */
        "
      >
        TIENDA MAYORISTA
      </span>
    </motion.button>
  )
}
