'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [productosOpen, setProductosOpen] = useState(false)
  const [subMenuUp, setSubMenuUp] = useState(false)

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
    { href: '/productos/calzas-largas', label: 'Calzas Largas' },
    { href: '/productos/calzas-cortas', label: 'Calzas Cortas' },
    { href: '/productos/tops', label: 'Tops' },
    { href: '/productos/conjuntos', label: 'Conjuntos' },
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
    <nav className="bg-marca-crema text-marca-gris shadow-md px-6 py-4 sticky top-0 z-[100]">
      <div className="flex justify-between items-center max-w-7xl mx-auto relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/vucas_logo.svg"
            alt="Logo VUCAS"
            className="h-8 w-auto"
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
            <Link href="/" className="hover:text-marca-piedra transition-colors">
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
              className="hover:text-marca-piedra transition-colors"
            >
              Productos ▾
            </button>
            {productosOpen && (
              <ul
                ref={submenuProductosRef}
                className="absolute right-0 top-full mt-2 bg-marca-blanco border border-gray-200 rounded-md shadow-xl z-[100]"
                style={{
                  width: 'max-content',
                  maxWidth: 'calc(100vw - 32px)',
                  overflowWrap: 'break-word',
                  padding: 0,
                }}
              >
                {productosLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-sm text-marca-crema hover:bg-gray-100 transition"
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
            <Link href="/contacto" className="hover:text-marca-piedra transition-colors">
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
              className="hover:text-marca-piedra transition-colors"
            >
              Ayuda ▾
            </button>
            {ayudaOpen && (
              <ul
                ref={submenuRef}
                className="absolute right-0 top-full mt-2 bg-marca-blanco border border-gray-200 rounded-md shadow-xl z-[100]"
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
                      className="block px-4 py-2 text-sm text-marca-crema hover:bg-gray-100 transition"
                      onClick={() => setAyudaOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
        </ul>
      )}
    </nav>
  )
}
