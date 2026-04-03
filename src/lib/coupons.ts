import { createClient } from "@sanity/client"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
})

export type CouponDoc = {
  _id: string
  title?: string
  code: string
  isActive?: boolean
  discountType: "percent" | "fixed"
  discountValue: number
  minimumSubtotal?: number
  expiresAt?: string
}

export type CouponValidationResult = {
  valid: boolean
  couponCode: string | null
  couponDiscount: number
  appliedCoupon: {
    _id: string
    title?: string
    code: string
    discountType: "percent" | "fixed"
    discountValue: number
  } | null
  error: string | null
}

function toMoney(n: any) {
  const v = Number(n || 0)
  return Math.round(v * 100) / 100
}

export async function getCouponByCode(code: string): Promise<CouponDoc | null> {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return null

  const coupon = await sanity.fetch(
    `*[
      _type == "coupon" &&
      upper(code) == $code
    ][0]{
      _id,
      title,
      code,
      isActive,
      discountType,
      discountValue,
      minimumSubtotal,
      expiresAt
    }`,
    { code: normalized }
  )

  return coupon || null
}

export async function validateCoupon(params: {
  couponCode?: string | null
  subtotal: number
}): Promise<CouponValidationResult> {
  const rawCouponCode = String(params.couponCode || "").trim().toUpperCase()
  const subtotal = toMoney(params.subtotal)

  if (!rawCouponCode) {
    return {
      valid: false,
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      error: null,
    }
  }

  const coupon = await getCouponByCode(rawCouponCode)

  if (!coupon) {
    return {
      valid: false,
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      error: "Cupón inválido.",
    }
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      error: "Este cupón no está activo.",
    }
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
    return {
      valid: false,
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      error: "Este cupón está vencido.",
    }
  }

  if (subtotal < Number(coupon.minimumSubtotal || 0)) {
    return {
      valid: false,
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,
      error: `Este cupón requiere una compra mínima de $${Number(
        coupon.minimumSubtotal || 0
      ).toLocaleString("es-AR")}.`,
    }
  }

  let couponDiscount = 0

  if (coupon.discountType === "percent") {
    couponDiscount = toMoney(subtotal * (Number(coupon.discountValue || 0) / 100))
  } else if (coupon.discountType === "fixed") {
    couponDiscount = toMoney(Number(coupon.discountValue || 0))
  }

  couponDiscount = Math.min(couponDiscount, subtotal)

  return {
    valid: true,
    couponCode: String(coupon.code || rawCouponCode).toUpperCase(),
    couponDiscount,
    appliedCoupon: {
      _id: String(coupon._id),
      title: coupon.title ? String(coupon.title) : undefined,
      code: String(coupon.code || rawCouponCode).toUpperCase(),
      discountType: coupon.discountType === "fixed" ? "fixed" : "percent",
      discountValue: Number(coupon.discountValue || 0),
    },
    error: null,
  }
}