// src/app/layout.tsx
import "./globals.css"
import Script from "next/script"
import Navbar from "@/components/Navbar"
import { Barlow_Condensed } from "next/font/google"
import { Montserrat } from "next/font/google"
import { CartProvider } from "@/context/CartContext"
import { UiProvider } from "@/context/UiContext"
import CartDrawer from "@/components/CartDrawer"
import WhatsAppButton from "@/components/WhatsAppButton"
import PromoBar from "@/components/PromoBar"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  return (
    <html lang="es">
      <head>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MXWQ3PRYHB"
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-MXWQ3PRYHB');
          `}
        </Script>

        {/* Meta Pixel */}
        {pixelId ? (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>

            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
      </head>

      <body
        className={`${barlowCondensed.variable} ${montserrat.variable} min-h-[100dvh] bg-white text-black`}
      >
        <UiProvider>
          <CartProvider>
            <Navbar />
            {children}
            <CartDrawer />
            <WhatsAppButton />
          </CartProvider>
        </UiProvider>
      </body>
    </html>
  )
}