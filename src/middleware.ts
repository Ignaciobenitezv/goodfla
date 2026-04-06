import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 🔴 REDIRECT CHECKOUT VIEJO → CARRITO
  if (pathname === "/checkout") {
    const url = req.nextUrl.clone()
    url.pathname = "/carrito"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // 🔵 BLOQUEOS DE PRODUCTOS (lo que ya tenías)
  if (
    pathname === "/productos" ||
    pathname === "/productos/jeans" ||
    pathname === "/productos/remeras"
  ) {
    const url = req.nextUrl.clone()
    url.pathname = "/productos/zapatillas"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// 👇 IMPORTANTE: agregar /checkout al matcher
export const config = {
  matcher: [
    "/checkout",
    "/productos",
    "/productos/jeans",
    "/productos/remeras",
  ],
}