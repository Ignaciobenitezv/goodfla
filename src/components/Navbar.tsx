'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import Image from 'next/image'
import CartDrawer from "./CartDrawer"
import { useUi } from "@/context/UiContext"
import { useCart } from "@/context/CartContext"

export default function Navbar() {
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

  const ayudaLinks = [
    { href: '/guia-de-talles', label: 'Guía de talles' },
    { href: '/cuidado-de-tus-prendas', label: 'Cuidado de tus prendas' },
    { href: '/politica-de-cambios', label: 'Política de Cambios' },
  ]

  const productosLinks = [
    { href: '/productos', label: 'Todos los productos' },
    { href: '/productos/remeras', label: 'Remeras' },
    { href: '/productos/jeans', label: 'Jeans' },
    { href: '/productos/zapatillas', label: 'Zapatillas' },
    { href: '/productos/combos', label: 'Combos' },
  ]

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
    <nav className="bg-marca-crema text-marca-gris shadow-md px-0 py-4 sticky top-0 z-[100]">
      <div className="flex justify-between items-center w-full max-w-none mx-0 px-2 md:px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/goodlogo.png"
            alt="Logo Goodfla"
            width={200}
            height={48}
            priority
            className="h-14 md:h-12 w-auto shrink-0"
          />
        </Link>

        {/* Botón hamburguesa móvil */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-marca-blanco text-2xl focus:outline-none"
          >
            ☰
          </button>
        </div>

        {/* Menú desktop */}
        <ul className="hidden md:flex gap-6 font-medium items-center relative z-[100]">
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
                className="absolute right-0 top-full mt-2 bg-white text-marca-gris border border-black/10 rounded-xl shadow-2xl z-[300] overflow-hidden"
                style={{ width:'max-content', maxWidth:'calc(100vw - 32px)', overflowWrap:'break-word', padding:0 }}
              >
                {productosLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-black/5 transition"
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
                className="absolute right-0 top-full mt-2 bg-white text-marca-gris border border-black/10 rounded-xl shadow-2xl z-[300] overflow-hidden"
                style={{ width:'max-content', maxWidth:'calc(100vw - 32px)', overflowWrap:'break-word', padding:0 }}
              >
                {ayudaLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-black/5 transition"
                      onClick={() => setAyudaOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* 🛒 Carrito */}
          <li>
            <button
              onClick={openCart}
              className="relative hover:text-marca-amarillo transition-colors"
            >
              🛒
              {items.length > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <ul className="md:hidden mt-3 space-y-2 px-4 text-marca-blanco font-medium">
          <li>
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Inicio
            </Link>
          </li>
          <li>
            <Link href="/productos" onClick={() => setMenuOpen(false)}>
              Productos
            </Link>
          </li>
          <li>
            <Link href="/contacto" onClick={() => setMenuOpen(false)}>
              Contacto
            </Link>
          </li>
          <li>
            <button
              onClick={() => setAyudaOpen(!ayudaOpen)}
              className="w-full text-left py-1"
            >
              Ayuda ▾
            </button>
            {ayudaOpen && (
              <ul className="ml-4 mt-1 space-y-1 text-marca-crema bg-marca-blanco p-2 rounded-md">
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
          {/* 🛒 Carrito en móvil */}
          <li>
            <button
              onClick={() => {
                setMenuOpen(false)
                openCart()
              }}
              className="relative"
            >
              🛒 Carrito
              {items.length > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </button>
          </li>
        </ul>
      )}

      {/* Drawer del carrito */}
      <CartDrawer />
    </nav>
  )
}
