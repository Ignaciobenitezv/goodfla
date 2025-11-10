"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type AddedDialogData = {
  title?: string
  image?: string
}

type UiContextType = {
  // Carrito
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void

  // Diálogo “Agregado al carrito”
  addedDialogOpen: boolean
  addedDialogData: AddedDialogData | null
  showAddedDialog: (data?: AddedDialogData) => void
  hideAddedDialog: () => void
}

const UiContext = createContext<UiContextType | undefined>(undefined)

export function UiProvider({ children }: { children: ReactNode }) {
  // === Carrito ===
  const [isCartOpen, setIsCartOpen] = useState(false)
  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  // === Diálogo “Agregado al carrito” ===
  const [addedDialogOpen, setAddedDialogOpen] = useState(false)
  const [addedDialogData, setAddedDialogData] = useState<AddedDialogData | null>(null)

  const showAddedDialog = (data?: AddedDialogData) => {
    setAddedDialogData(data ?? null)
    setAddedDialogOpen(true)
  }

  const hideAddedDialog = () => {
    setAddedDialogOpen(false)
    // si querés limpiar los datos cuando se cierre:
    // setAddedDialogData(null)
  }

  return (
    <UiContext.Provider
      value={{
        // carrito
        isCartOpen,
        openCart,
        closeCart,
        // diálogo agregado
        addedDialogOpen,
        addedDialogData,
        showAddedDialog,
        hideAddedDialog,
      }}
    >
      {children}
    </UiContext.Provider>
  )
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error("useUi debe usarse dentro de UiProvider")
  return ctx
}
