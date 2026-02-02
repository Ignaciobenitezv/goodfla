// app/api/checkout/preference/route.ts
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@sanity/client"

export const runtime = "nodejs"

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  useCdn: false,
})

type CompactCartItem = { productId: string; talle?: string | null; cantidad: number }

async function getStockSnapshot(productId: string) {
  return sanity.fetch(
    `*[_type=="producto" && _id==$id][0]{_id, stock, talles}`,
    { id: productId }
  )
}

function getAvailable(prod: any, talle: string | null | undefined) {
  if (!prod) return 0

  if (Array.isArray(prod.talles) && talle) {
    const t = prod.talles.find((x: any) => x?.label === talle)
    return Number(t?.stock ?? 0)
  }

  return Number(prod.stock ?? 0)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const compactCart: CompactCartItem[] = (body?.items || []).map((i: any) => ({
  productId: i._id ?? i.productId,     // ✅ soporta ambos
  talle: i.talle || null,
  cantidad: Number(i.cantidad || 1),
}))

if (!compactCart.length) {
  return NextResponse.json(
    { ok: false, error: "empty_cart" },
    { status: 400 }
  )
}


    const invalid = compactCart.find((x: any) => !x.productId)
    if (invalid) {
      return NextResponse.json(
        { error: "Item sin productId (Sanity _id)", details: invalid },
        { status: 400 }
      )
    }

    // ✅ 1.4: Validar stock ANTES de crear preferencia (bloquea oversell)
    const stockChecks = await Promise.all(
      compactCart.map(async (it: CompactCartItem) => {
        const prod = await getStockSnapshot(it.productId)
        const available = getAvailable(prod, it.talle)
        return {
          productId: it.productId,
          talle: it.talle ?? null,
          requested: it.cantidad,
          available,
          ok: available >= it.cantidad,
        }
      })
    )

    const outOfStock = stockChecks.filter((x) => !x.ok)
    if (outOfStock.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "out_of_stock",
          message: "No hay stock suficiente para uno o más productos.",
          details: outOfStock,
        },
        { status: 409 }
      )
    }

    const { origin } = new URL(req.url)
    const baseUrl =
      process.env.SITE_URL ||
      process.env.PUBLIC_BASE_URL ||
      origin ||
      "http://localhost:3000"

    const token = process.env.MP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Missing MP_ACCESS_TOKEN" }, { status: 500 })
    }

    const orderId = randomUUID()

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: (body?.items || []).map((i: any) => ({
          title: `${i?.nombre || "Producto"}${i?.talle ? ` - Talle ${i.talle}` : ""}`,
          quantity: Number(i?.cantidad || 1),
          unit_price: Number(i?.precio || 0),
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mp/webhook`,
        metadata: {
          orderId,
          cart: JSON.stringify(compactCart),
        },
      }),
      cache: "no-store",
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    return NextResponse.json({
      id: data.id,
      init_point: data.sandbox_init_point || data.init_point,
      orderId,
    })
  } catch (error) {
    console.error("❌ Error en servidor:", error)
    return NextResponse.json({ error: "Error al crear preferencia" }, { status: 500 })
  }
}
