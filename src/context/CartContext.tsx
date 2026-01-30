"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type CartItem = {
  productId: string     // 🔹 _id real de Sanity
  cartKey: string       // 🔹 id único en el carrito (productId + talle)
  nombre: string
  precio: number
  cantidad: number
  imagen: string
  slug?: string
  talle?: string
  stock?: number        // 🔹 stock global desde Sanity
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "cartKey">) => void
  removeItem: (cartKey: string) => void
  clearCart: () => void
  increaseQuantity: (cartKey: string) => void
  decreaseQuantity: (cartKey: string) => void
  checkout: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // cargar desde localStorage
  useEffect(() => {
  try {
    const stored = localStorage.getItem("cart")
    if (!stored) return
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) setItems(parsed)
  } catch (e) {
    console.warn("[Cart] localStorage cart corrupto, lo reseteo", e)
    localStorage.setItem("cart", "[]")
    setItems([])
  }
}, [])


  // guardar en localStorage
 useEffect(() => {
  // Si quedó vacío, persistimos vacío (ok).
  // Si por alguna razón no existe, lo inicializamos.
  try {
    localStorage.setItem("cart", JSON.stringify(items ?? []))
  } catch (e) {
    console.warn("[Cart] no pude persistir cart", e)
  }
}, [items])


  const addItem = (item: Omit<CartItem, "cartKey">) => {
    const cartKey = `${item.productId}-${item.talle || "default"}`

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey)

      // calcular stock restante considerando lo que ya está en carrito
      const enCarrito = existing ? existing.cantidad : 0
      const stockRestante = (item.stock ?? Infinity) - enCarrito

      if (item.cantidad > stockRestante) {
        alert("No hay suficiente stock disponible")
        return prev
      }

      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        )
      }

      return [...prev, { ...item, cartKey, productId: item.productId }]
    })
  }

  const removeItem = (cartKey: string) => {
  setItems((prev) => {
    // intento normal por cartKey
    const after = prev.filter((i) => i.cartKey !== cartKey)
    if (after.length !== prev.length) {
      console.log("[Cart] removed by cartKey:", cartKey)
      return after
    }

    // 🔁 fallback: por productId + talle (por si el cartKey que llega no coincide 1:1)
    const [pid, ...rest] = cartKey.split("-")
    const sizeFromKey = rest.length ? rest.join("-") : "default"

    const afterFallback = prev.filter(
      (i) => !(i.productId === pid && (i.talle ?? "default") === sizeFromKey)
    )
    if (afterFallback.length !== prev.length) {
      console.log("[Cart] removed by fallback pid+talle:", pid, sizeFromKey)
      return afterFallback
    }

    console.warn("[Cart] removeItem no encontró coincidencias para:", cartKey, prev)
    return prev
  })
}


  const clearCart = () => {
  setItems([])
  try {
    localStorage.setItem("cart", "[]")
  } catch {}
}


  const increaseQuantity = (cartKey: string) => {
  setItems((prev) =>
    prev.map((i) => {
      if (i.cartKey !== cartKey) return i

      if (typeof i.stock !== "number") {
        alert("No se pudo validar stock. Recargá la página.")
        return i
      }

      if (i.cantidad >= i.stock) {
        alert("No hay más stock disponible")
        return i
      }

      return { ...i, cantidad: i.cantidad + 1 }
    })
  )
}



  const decreaseQuantity = (cartKey: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.cartKey === cartKey && i.cantidad > 1
          ? { ...i, cantidad: i.cantidad - 1 }
          : i
      )
    )
  }

// checkout
const checkout = async () => {
  try {
    // 🔹 Guardamos SOLO lo que necesita updateStock
    const lastOrderPayload = items.map((i) => ({
      productId: i.productId, // _id real de Sanity
      cantidad: i.cantidad,
    }))

    localStorage.setItem("lastOrder", JSON.stringify(lastOrderPayload))

    const res = await fetch("/api/checkout/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }), // para MP podés enviar todo el carrito
    })

    const data = await res.json()
    if (data.init_point) {
      window.location.href = data.init_point
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
        checkout,
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
