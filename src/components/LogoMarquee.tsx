'use client'

export default function LogoMarquee() {
  return (
    <div className="bg-white overflow-hidden py-4">
      <div className="flex animate-marquee gap-12">
        {Array.from({ length: 20 }).map((_, i) => (
          <img
            key={i}
            src="/vucas_logo.svg"
            alt="Logo VUCAS"
            className="h-6 w-auto object-contain"
          />
        ))}
      </div>
    </div>
  )
}
