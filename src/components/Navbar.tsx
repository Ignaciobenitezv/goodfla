'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import CartDrawer from "./CartDrawer"
import { useUi } from "@/context/UiContext"
import { useCart } from "@/context/CartContext"
import AddedToCartDialog from './AddedToCartDialog'

export default function Navbar() {
  const NAV_SURFACE = "bg-black/80 backdrop-blur-lg"
  const NAV_BORDER = "border border-white/10"

  const [menuOpen, setMenuOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [productosOpen, setProductosOpen] = useState(false)
  const [subMenuUp, setSubMenuUp] = useState(false)

  const { openCart } = useUi()
  const { items } = useCart()

  const ayudaRef = useRef<HTMLLIElement>(null)
  const submenuRef = useRef<HTMLUListElement>(null)
  const productosRef = useRef<HTMLLIElement>(null)
  const submenuProductosRef = useRef<HTMLUListElement>(null)

  const pathname = usePathname()

  
  const ayudaLinks = [
    { href: '/guia-de-talles', label: 'Guía de talles' },
    { href: '/politica-de-cambios', label: 'Política de Cambios' },
  ]

const productosLinks = [
  { label: 'Mayorista', href: '/productos/mayorista' },

  { label: 'Zapatillas Promo x 2', href: '/productos/zapatillas' },
  { label: 'Zapatillas ', href: '/productos/zapatillas' },

  // { label: 'Combos', href: '/productos/combos' },
]

  // Cerrar menús cuando cambia la ruta
  useEffect(() => {
    setMenuOpen(false)
    setAyudaOpen(false)
    setProductosOpen(false)
  }, [pathname])

  useEffect(() => {
  const nav = document.getElementById("site-navbar")
  if (!nav) return

  const setVar = () => {
    const h = nav.getBoundingClientRect().height
    document.documentElement.style.setProperty("--nav-h", `${Math.round(h)}px`)
  }

  setVar()
  window.addEventListener("resize", setVar)

  const ro = new ResizeObserver(setVar)
  ro.observe(nav)

  return () => {
    window.removeEventListener("resize", setVar)
    ro.disconnect()
  }
}, [])


  useEffect(() => {
    if (ayudaOpen && ayudaRef.current) {
      const rect = ayudaRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const estimatedMenuHeight = 200
      setSubMenuUp(spaceBelow < estimatedMenuHeight)
    }
  }, [ayudaOpen])

  useLayoutEffect(() => {
    if (ayudaOpen && submenuRef.current && ayudaRef.current) {
      const rect = ayudaRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceAbove = rect.top
      const spaceBelow = viewportHeight - rect.bottom

      const submenuHeight = submenuRef.current.offsetHeight
      const openUp = spaceBelow < submenuHeight && spaceAbove > submenuHeight
      setSubMenuUp(openUp)

      const maxHeight = openUp ? spaceAbove - 16 : spaceBelow - 16
      submenuRef.current.style.maxHeight = `${Math.max(maxHeight, 150)}px`
      submenuRef.current.style.overflowY = 'auto'
      submenuRef.current.style.whiteSpace = 'normal'
    }
  }, [ayudaOpen])

  return (
    <>
   <nav
  id="site-navbar"
  className={`
    fixed top-0 left-0 right-0
    z-[1000]
    ${NAV_SURFACE}
    border-b border-white/10
    text-white
    shadow-md
    px-0 py-4
  `}
>




        <div className="flex justify-between items-center w-full max-w-none mx-0 px-2 md:px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
  src="/goodlogo.png"
  alt="Logo Goodfla"
  width={200}
  height={48}
  priority
  className="h-10 md:h-12 w-auto shrink-0"
/>
          </Link>

          {/* Acciones derechas en MOBILE: carrito + hamburguesa */}
          <div className="flex items-center gap-3 md:hidden">
            {/* 🛒 Carrito móvil */}
            <button
              type="button"
              onClick={openCart}
              className="relative hover:opacity-80 transition"
              aria-label="Abrir carrito"
            >
              <Image
                src="/shopping-cart.png"
                alt="Carrito"
                width={24}
                height={24}
                className="w-6 h-6 cart-wiggle"
              />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </button>

            {/* ☰ Hamburguesa */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white text-2xl focus:outline-none"
              aria-label="Abrir menú"
            >
              ☰
            </button>
          </div>

          {/* Menú desktop */}
          <ul className="hidden md:flex gap-6 font-semibold items-center relative z-[100]">
            <li>
              <Link href="/" className="hover:text-marca-amarillo transition-colors">
                Inicio
              </Link>
            </li>

            {/* Submenú Productos */}
            <li className="relative" ref={productosRef}>
              <button
                onClick={() => {
                  setProductosOpen(!productosOpen)
                  setAyudaOpen(false)
                }}
                className="hover:text-marca-amarillo transition-colors"
              >
                Productos ▾
              </button>
              {productosOpen && (
  <ul
    ref={submenuProductosRef}
    className={`
      absolute right-0 top-full mt-2
      ${NAV_SURFACE} ${NAV_BORDER}
      text-white
      rounded-xl shadow-xl
      z-[300] overflow-visible
    `}


                  style={{
                    width: 'max-content',
                    maxWidth: 'calc(100vw - 32px)',
                    overflowWrap: 'break-word',
                    padding: 0,
                  }}
                >
                  {productosLinks.map((item) => (
                    <li key={item.label || item.href} className="relative">
                      <Link
                        href={item.href}
                        className="block px-4 py-2 text-sm hover:bg-white/10 transition"
                        onClick={() => setProductosOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            <li>
              <Link href="/contacto" className="hover:text-marca-amarillo transition-colors">
                Contacto
              </Link>
            </li>

            {/* Submenú Ayuda */}
            <li className="relative" ref={ayudaRef}>
              <button
                onClick={() => {
                  setAyudaOpen(!ayudaOpen)
                  setProductosOpen(false)
                }}
                className="hover:text-marca-amarillo transition-colors"
              >
                Ayuda ▾
              </button>
              {ayudaOpen && (
  <ul
    ref={submenuRef}
    className={`
      absolute right-0 top-full mt-2
      ${NAV_SURFACE} ${NAV_BORDER}
      text-white
      rounded-xl shadow-xl
      z-[300] overflow-hidden
    `}


                  style={{
                    width: 'max-content',
                    maxWidth: 'calc(100vw - 32px)',
                    overflowWrap: 'break-word',
                    padding: 0,
                  }}
                >
                  {ayudaLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block px-4 py-2 text-sm hover:bg:white/10 hover:bg-white/10 transition"
                        onClick={() => setAyudaOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* 🛒 Carrito desktop */}
            <li>
              <button
                onClick={openCart}
                className="relative hover:opacity-80 transition"
                aria-label="Abrir carrito"
                type="button"
              >
                <Image
                  src="/shopping-cart.png"
                alt="Carrito"
                width={24}
                height={24}
                className="w-6 h-6 cart-wiggle"
                />
                {items.length > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* Menú móvil desplegable */}
        {menuOpen && (
  <ul
    className={`
      md:hidden
      mt-3
      space-y-2
      px-4 py-3
      text-white font-semibold
      bg-transparent
    `}
  >


            <li>
              <Link href="/" onClick={() => setMenuOpen(false)}>
                Inicio
              </Link>
            </li>

            {/* Productos en móvil */}
            <li>
              <button
                onClick={() => setProductosOpen((v) => !v)}
                className="w-full text-left py-1"
              >
                Productos ▾
              </button>
              {productosOpen && (
  <ul className="ml-4 mt-1 space-y-1 text-white bg-transparent p-2">
                <li>
                    <Link href="/productos/mayorista" onClick={() => setMenuOpen(false)}>
                      Mayorista
                    </Link>
                  </li>
                  
                  <li>
                    <Link href="/productos/zapatillas" onClick={() => setMenuOpen(false)}>
                      Zapatillas Promo
                    </Link>
                  </li>
                  <li>
                    <Link href="/productos/zapatillas-individuales" onClick={() => setMenuOpen(false)}>
                      Zapatillas
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <Link href="/contacto" onClick={() => setMenuOpen(false)}>
                Contacto
              </Link>
            </li>

            {/* Ayuda en móvil */}
            <li>
              <button
                onClick={() => setAyudaOpen(!ayudaOpen)}
                className="w-full text-left py-1"
              >
                Ayuda ▾
              </button>
              {ayudaOpen && (
  <ul className="ml-4 mt-1 space-y-1 text-white bg-transparent p-2">

                  {ayudaLinks.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} onClick={() => setMenuOpen(false)}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        )}

        {/* Drawer del carrito */}
        <CartDrawer />
      </nav>

      {/* Cartel “Agregado al carrito” fuera del <nav>, centrado en pantalla */}
      <AddedToCartDialog />
    </>
  )
}
