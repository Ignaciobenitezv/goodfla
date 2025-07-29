'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, useAnimation } from 'framer-motion'

export default function AnimatedFadeDown({ children }: { children: React.ReactNode }) {
  const controls = useAnimation()
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0,
    rootMargin: '0px 0px -30% 0px', // se activa más antes
  })

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
      })
    } else {
      controls.start({
        opacity: 0,
        y: -30,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
      })
    }
  }, [inView, controls])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -30 }}
      animate={controls}
      viewport={{ once: false, amount: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
