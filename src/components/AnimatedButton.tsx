'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function AnimatedButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 50)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.button
  initial={{ opacity: 0, x: -80 }}
  animate={{
    opacity: visible ? 1 : 0,
    x: visible ? 0 : -80,
  }}
  transition={{ duration: 0.1, ease: 'easeOut' }}
  className="
    bg-marca-amarillo text-marca-negro
    px-6 py-3 rounded-full
    hover:brightness-95 active:brightness-90
    shadow-sm hover:shadow
    transition
  "
>
  Comprar Ahora!
</motion.button>

  )
}
