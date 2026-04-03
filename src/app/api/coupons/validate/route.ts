import { NextResponse } from "next/server"
import { validateCoupon } from "@/lib/coupons"

export const runtime = "nodejs"

function toMoney(n: any) {
  const v = Number(n || 0)
  return Math.round(v * 100) / 100
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const couponCode = String(body?.couponCode || "").trim()
    const subtotal = toMoney(body?.subtotal ?? 0)

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_subtotal",
          message: "Subtotal inválido.",
        },
        { status: 400 }
      )
    }

    const result = await validateCoupon({
      couponCode,
      subtotal,
    })

    return NextResponse.json({
      ok: true,
      valid: result.valid,
      couponCode: result.couponCode,
      couponDiscount: result.couponDiscount,
      appliedCoupon: result.appliedCoupon,
      error: result.error,
      subtotal,
      computedTotal: toMoney(subtotal - result.couponDiscount),
    })
  } catch (err) {
    console.error("❌ Error en /api/coupons/validate:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: "Error interno.",
      },
      { status: 500 }
    )
  }
}