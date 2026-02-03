import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Bloqueo exacto (solo estas 3 rutas)
  if (
    pathname === "/productos" ||
    pathname === "/productos/jeans" ||
    pathname === "/productos/remeras"
  ) {
    const url = req.nextUrl.clone()
    url.pathname = "/productos/combos" // o "/" si preferís mandar al home
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Ejecuta middleware solo en esas 3 rutas (más eficiente)
export const config = {
  matcher: ["/productos", "/productos/jeans", "/productos/remeras"],
}
