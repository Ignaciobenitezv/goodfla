// src/app/layout.tsx
import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { Barlow_Condensed } from 'next/font/google'
import { Montserrat } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300','400','500','600','700','800','900'], // elegí las que uses
  variable: '--font-montserrat',                 // << nueva var CSS
  display: 'swap',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="relative overflow-visible z-50 font-sans">
        <div className="relative overflow-visible min-h-screen">
          <Navbar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
