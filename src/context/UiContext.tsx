"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type UiContextType = {
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const UiContext = createContext<UiContextType | undefined>(undefined)

export function UiProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false)

  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  return (
    <UiContext.Provider value={{ isCartOpen, openCart, closeCart }}>
      {children}
    </UiContext.Provider>
  )
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error("useUi debe usarse dentro de UiProvider")
  return ctx
}
