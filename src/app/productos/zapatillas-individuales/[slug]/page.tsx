import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPATILLA_INDIVIDUAL_BY_SLUG } from "@/lib/sanityQueries"
import PDPZapatillaIndividualDetalle from "@/components/PDPZapatillaIndividualDetalle"
import { notFound } from "next/navigation"

export const revalidate = 60

type Params = { slug: string }

export default async function ZapatillaIndividualPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params

  const producto = await sanityClient.fetch(Q_ZAPATILLA_INDIVIDUAL_BY_SLUG, { slug })

  if (!producto) return notFound()

  // ✅ Normalizamos galería para soportar mediaItem igual que en 2x1
  const galeriaUrls = (producto.galeria || [])
    .map((m: any) => {
      if (m && typeof m === "object") return m.videoUrl || m.imagenUrl
      if (typeof m === "string") return m
      return null
    })
    .filter(Boolean) as string[]

  const productoNormalizado = {
    _id: producto._id,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? "",
    precio: typeof producto.precio === "number" ? producto.precio : null,
    precioActual:
      typeof producto.precioActual === "number"
        ? producto.precioActual
        : typeof producto.precio === "number"
        ? producto.precio
        : 0,
    precioAntes:
      typeof producto.precioAntes === "number" ? producto.precioAntes : null,
    slug: producto.slug,
    imagen: producto.imagen || galeriaUrls[0] || "/placeholder.jpg",
    galeria: galeriaUrls,
    talles: Array.isArray(producto.talles) ? producto.talles : [],
    colores: Array.isArray(producto.colores) ? producto.colores : [],
  }

  return <PDPZapatillaIndividualDetalle producto={productoNormalizado} />
}