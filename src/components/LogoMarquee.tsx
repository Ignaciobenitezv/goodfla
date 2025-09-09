'use client'

import Image from 'next/image'

export default function LogoMarquee() {
  return (
    <div className="bg-marca-negro overflow-hidden py-4">
      <div className="flex animate-marquee gap-12">
        {Array.from({ length: 20 }).map((_, i) => (
          <Image
            key={i}
            src="/arma.png"
            alt="Sale"
            width={120}       // tamaño intrínseco (ajustá si querés)
            height={24}
            priority={i < 2}  // solo los primeros con prioridad
            draggable={false}
            className="h-6 w-auto object-contain"
            aria-hidden       // decorativo
          />
        ))}
      </div>
    </div>
  )
}
