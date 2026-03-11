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

  const galeriaNormalizada =
    Array.isArray(producto.galeria) && producto.galeria.length > 0
      ? producto.galeria.filter(Boolean)
      : [producto.imagen || "/placeholder.jpg"]

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
    imagen: producto.imagen || galeriaNormalizada[0] || "/placeholder.jpg",
    galeria: galeriaNormalizada,
    talles: Array.isArray(producto.talles) ? producto.talles : [],
    colores: Array.isArray(producto.colores) ? producto.colores : [],
  }

  return <PDPZapatillaIndividualDetalle producto={productoNormalizado} />
}