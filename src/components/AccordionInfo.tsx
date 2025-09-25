"use client"

import { useState } from "react"

type Section = {
  title: string
  content: React.ReactNode
}

type Props = {
  sections: Section[]
}

export default function AccordionInfo({ sections }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y border-t">
      {sections.map((s, i) => (
        <div key={i}>
          {/* Botón de cada título */}
          <button
            className="w-full flex justify-between items-center py-4 text-lg font-bold"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {s.title}
            <span className="text-xl">{open === i ? "−" : "+"}</span>
          </button>

          {/* Contenido */}
          {open === i && (
            <div className="pb-4 text-base text-gray-700 leading-relaxed">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
