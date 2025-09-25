"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type CartItem = {
  id: string
  nombre: string
  precio: number
  cantidad: number
  imagen: string
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
  checkout: () => void // 👈 agregado
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // 🔹 Cargar carrito desde localStorage al inicio
  useEffect(() => {
    const stored = localStorage.getItem("cart")
    if (stored) {
      setItems(JSON.parse(stored))
    }
  }, [])

  // 🔹 Guardar carrito en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + item.cantidad } : i
        )
      }
      return [...prev, item]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearCart = () => setItems([])

  const increaseQuantity = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i))
    )
  }

  const decreaseQuantity = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.cantidad > 1 ? { ...i, cantidad: i.cantidad - 1 } : i
      )
    )
  }

  // 🔹 Checkout con MercadoPago
  const checkout = async () => {
    try {
      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })

      const data = await res.json()
      console.log("🔗 Preference:", data)

      if (data.init_point) {
        window.location.href = data.init_point // 🚀 Redirige a MP
      } else {
        alert("⚠️ No se pudo iniciar el pago")
      }
    } catch (err) {
      console.error("❌ Error en checkout:", err)
      alert("Hubo un error al procesar el pago")
    }
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        checkout, // 👈 agregado al provider
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
