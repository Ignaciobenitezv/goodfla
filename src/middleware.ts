import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

// ❗ SACAMOS /checkout del matcher
export const config = {
  matcher: [
    "/productos",
    "/productos/jeans",
    "/productos/remeras",
  ],
}