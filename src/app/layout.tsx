// src/app/layout.tsx
import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { Barlow_Condensed } from 'next/font/google'
import { Montserrat } from 'next/font/google'
import { CartProvider } from "@/context/CartContext"
import { UiProvider } from '@/context/UiContext'
import CartDrawer from '@/components/CartDrawer'
import WhatsAppButton from '@/components/WhatsAppButton'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <UiProvider>
          <CartProvider>
            <Navbar />
            {children}
            {/* 👇 ahora el drawer vive fuera del nav */}
            <CartDrawer />
            <WhatsAppButton />
          </CartProvider>
        </UiProvider>
        
      </body>
    </html>
  )
}