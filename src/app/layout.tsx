// src/app/layout.tsx
import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { Barlow_Condensed } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={barlowCondensed.variable}>
      <body className="relative overflow-visible z-50 font-sans">
        <div className="relative overflow-visible min-h-screen">
          <Navbar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
