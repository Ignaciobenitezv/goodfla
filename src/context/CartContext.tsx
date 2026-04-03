"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Quote = {
  subtotal: number
  shippingPrice: number
  computedTotal: number
}


type CartItem = {
  productId: string
  comboId?: string
  packMayoristaId?: string
  cartKey: string
  nombre: string
  precio: number
  cantidad: number
  imagen: string
  slug?: string
  talle?: string
  stock?: number
}

type CartContextType = {
  items: CartItem[]
  comboId: string | null
  quote: Quote | null
  hasMayorista: boolean

  couponCode: string | null
  couponStatus: "idle" | "checking" | "applied" | "invalid"
  couponDiscount: number
  couponError: string | null
  appliedCoupon: {
    _id: string
    title?: string
    code: string
    discountType: "percent" | "fixed"
    discountValue: number
  } | null

  // ✅ setear/limpiar combo activo (para cobrar precio de combo)
  setActiveCombo: (id: string | null) => void
  setCouponCode: (code: string | null) => void
  applyCoupon: (subtotal: number, codeOverride?: string | null) => Promise<void>
  clearCoupon: () => void

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
const [comboId, setComboId] = useState<string | null>(null)
const [quote, setQuote] = useState<Quote | null>(null)

const [couponCode, setCouponCodeState] = useState<string | null>(null)
const [couponStatus, setCouponStatus] = useState<"idle" | "checking" | "applied" | "invalid">("idle")
const [couponDiscount, setCouponDiscount] = useState(0)
const [couponError, setCouponError] = useState<string | null>(null)
const [appliedCoupon, setAppliedCoupon] = useState<{
  _id: string
  title?: string
  code: string
  discountType: "percent" | "fixed"
  discountValue: number
} | null>(null)

const hasMayorista = items.some((item) => !!item.packMayoristaId)
  // cargar desde localStorage
  useEffect(() => {
  try {
    const stored = localStorage.getItem("cart")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) setItems(parsed)
    }

    const storedComboId = localStorage.getItem("cartComboId")
    if (storedComboId && typeof storedComboId === "string") {
      setComboId(storedComboId)
    }

    const storedCouponCode = localStorage.getItem("cartCouponCode")
    const storedCouponDiscount = localStorage.getItem("cartCouponDiscount")
    const storedAppliedCoupon = localStorage.getItem("cartAppliedCoupon")

    if (storedCouponCode) {
      setCouponCodeState(storedCouponCode)
    }

    if (storedCouponDiscount) {
      setCouponDiscount(Number(storedCouponDiscount) || 0)
    }

    if (storedAppliedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(storedAppliedCoupon))
        setCouponStatus("applied")
      } catch {}
    }
  } catch (e) {
    console.warn("[Cart] localStorage corrupto, reseteo", e)
    localStorage.setItem("cart", "[]")
    localStorage.removeItem("cartComboId")
    localStorage.removeItem("cartCouponCode")
    localStorage.removeItem("cartCouponDiscount")
    localStorage.removeItem("cartAppliedCoupon")
    setItems([])
    setComboId(null)
    setCouponCodeState(null)
    setCouponDiscount(0)
    setCouponError(null)
    setAppliedCoupon(null)
    setCouponStatus("idle")
  }
}, [])

  // guardar carrito
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(items ?? []))
    } catch (e) {
      console.warn("[Cart] no pude persistir cart", e)
    }
  }, [items])

  useEffect(() => {
  try {
    if (couponCode) localStorage.setItem("cartCouponCode", couponCode)
    else localStorage.removeItem("cartCouponCode")
  } catch (e) {
    console.warn("[Cart] no pude persistir cartCouponCode", e)
  }
}, [couponCode])

useEffect(() => {
  try {
    if (couponDiscount > 0) localStorage.setItem("cartCouponDiscount", String(couponDiscount))
    else localStorage.removeItem("cartCouponDiscount")
  } catch (e) {
    console.warn("[Cart] no pude persistir cartCouponDiscount", e)
  }
}, [couponDiscount])

useEffect(() => {
  try {
    if (appliedCoupon) localStorage.setItem("cartAppliedCoupon", JSON.stringify(appliedCoupon))
    else localStorage.removeItem("cartAppliedCoupon")
  } catch (e) {
    console.warn("[Cart] no pude persistir cartAppliedCoupon", e)
  }
}, [appliedCoupon])

  useEffect(() => {
  let cancelled = false

  async function run() {
    try {
      if (!items.length) {
        setQuote(null)
        return
      }

      // armamos payload igual que en /api/payments/card
      const payload = {
        quoteOnly: true,
        shipping: { type: "sucursal" as const }, // para carrito "a calcular"
        items: items.map((i) => ({
  _id: i.productId,
  talle: i.talle ?? null,
  cantidad: i.cantidad,
  comboId: i.comboId ?? null,
  packMayoristaId: i.packMayoristaId ?? null,
})),
      }

      const res = await fetch("/api/payments/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (cancelled) return

      if (!res.ok || !data?.ok) {
        console.warn("[Cart] quote failed:", data)
        setQuote(null)
        return
      }

      setQuote({
        subtotal: Number(data.subtotal ?? 0),
        shippingPrice: Number(data.shippingPrice ?? 0),
        computedTotal: Number(data.computedTotal ?? 0),
      })
    } catch (e) {
      console.warn("[Cart] quote error:", e)
      if (!cancelled) setQuote(null)
    }
  }

  run()
  return () => {
    cancelled = true
  }
}, [items])


  // guardar comboId
  useEffect(() => {
    try {
      if (comboId) localStorage.setItem("cartComboId", comboId)
      else localStorage.removeItem("cartComboId")
    } catch (e) {
      console.warn("[Cart] no pude persistir cartComboId", e)
    }
  }, [comboId])

  // ✅ API pública para setear combo activo
  const setActiveCombo = (id: string | null) => {
    setComboId(id ? String(id).trim() : null)
  }
const setCouponCode = (code: string | null) => {
  const normalized = String(code || "").trim().toUpperCase()
  setCouponCodeState(normalized || null)

  if (!normalized) {
    setCouponStatus("idle")
    setCouponDiscount(0)
    setCouponError(null)
    setAppliedCoupon(null)
  }
}

const clearCoupon = () => {
  setCouponCodeState(null)
  setCouponStatus("idle")
  setCouponDiscount(0)
  setCouponError(null)
  setAppliedCoupon(null)

  try {
    localStorage.removeItem("cartCouponCode")
    localStorage.removeItem("cartCouponDiscount")
    localStorage.removeItem("cartAppliedCoupon")
  } catch {}
}

const applyCoupon = async (subtotal: number, codeOverride?: string | null) => {
  const normalized = String(codeOverride ?? couponCode ?? "").trim().toUpperCase()
  
  if (!normalized) {
    setCouponStatus("invalid")
    setCouponDiscount(0)
    setCouponError("Ingresá un cupón.")
    setAppliedCoupon(null)
    return
  }

  try {
    setCouponStatus("checking")
    setCouponError(null)

    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        couponCode: normalized,
        subtotal,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.ok || !data?.valid) {
      setCouponStatus("invalid")
      setCouponDiscount(0)
      setAppliedCoupon(null)
      setCouponError(data?.error || data?.message || "Cupón inválido.")
      return
    }

    setCouponCodeState(data.couponCode ?? normalized)
    setCouponDiscount(Number(data.couponDiscount ?? 0))
    setAppliedCoupon(data.appliedCoupon ?? null)
    setCouponError(null)
    setCouponStatus("applied")
  } catch (e) {
    console.warn("[Cart] applyCoupon error:", e)
    setCouponStatus("invalid")
    setCouponDiscount(0)
    setAppliedCoupon(null)
    setCouponError("No se pudo validar el cupón.")
  }
}
  const addItem = (item: Omit<CartItem, "cartKey">) => {
    // ✅ si agregás un producto normal, limpiamos comboId para no cobrar combo por error
    // (si estás armando un combo, setealo explícitamente desde la pantalla de combo usando setActiveCombo)

    const cartKey = `${item.productId}-${item.talle || "default"}`

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey)

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
      const after = prev.filter((i) => i.cartKey !== cartKey)
      if (after.length !== prev.length) {
        console.log("[Cart] removed by cartKey:", cartKey)
        return after
      }

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
  setComboId(null)
  setQuote(null)
  clearCoupon()

  try {
    localStorage.setItem("cart", "[]")
    localStorage.removeItem("cartComboId")
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
       if (hasMayorista) {
      alert("Tu carrito contiene productos mayoristas. Por eso, esta compra solo puede abonarse por transferencia bancaria.")
      return
    }
      // payload stock (tuyo)
      const lastOrderPayload = items.map((i) => ({
        productId: i.productId,
        cantidad: i.cantidad,
        talle: i.talle ?? null,
      }))
      localStorage.setItem("lastOrder", JSON.stringify(lastOrderPayload))

      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ CLAVE: mandamos comboId si existe
        body: JSON.stringify({ items, comboId }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        console.error("[Cart] checkout error:", data)
        alert("⚠️ No se pudo iniciar el pago")
        return
      }

      if (data?.init_point) {
        window.location.href = data.init_point
        return
      }

      alert("⚠️ No se pudo iniciar el pago")
    } catch (err) {
      console.error("❌ Error en checkout:", err)
      alert("Hubo un error al procesar el pago")
    }
  }

  return (
    <CartContext.Provider
      value={{
  items,
  comboId,
  quote,
  hasMayorista,
  couponCode,
  couponStatus,
  couponDiscount,
  couponError,
  appliedCoupon,
  setActiveCombo,
  setCouponCode,
  applyCoupon,
  clearCoupon,
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
