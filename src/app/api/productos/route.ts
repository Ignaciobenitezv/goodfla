// app/api/productos/route.ts
import { NextResponse } from 'next/server'
import { getProductos } from '@/lib/getProductos'

export async function GET() {
  const productos = await getProductos()
  return NextResponse.json(productos)
}
