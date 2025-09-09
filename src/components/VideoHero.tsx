'use client'

import Link from 'next/link'
import AnimatedButton from '@/components/AnimatedButton'

export default function VideoHero() {
  return (
    <section className="full-bleed h-[80vh] md:h-[90vh] overflow-hidden">
  <video
    className="absolute inset-0 w-full h-full object-cover object-center block"
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
  >
    <source src="/rukawe.mp4?v=2" type="video/mp4" />
    {/* opcional: <source src="/rukawe.webm" type="video/webm" /> */}
  </video>
  <div className="absolute inset-0 bg-black/25" />
</section>


  )
}
