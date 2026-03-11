import { sanityClient } from "@/lib/sanity.client"
import { Q_ZAPATILLAS_INDIVIDUALES_LIST } from "@/lib/sanityQueries"
import CombosClient from "@/app/productos/combos/CombosClient"

export const revalidate = 60

export default async function ZapatillasIndividualesPage() {
  const productos = await sanityClient.fetch(Q_ZAPATILLAS_INDIVIDUALES_LIST)

  // 👇 LOG ACÁ

  const productosAdaptados = (Array.isArray(productos) ? productos : []).map((p: any, i: number) => ({
    _id: p._id,
    nombre: p.nombre,
    precio:
      typeof p.precioActual === "number"
        ? p.precioActual
        : typeof p.precio === "number"
        ? p.precio
        : null,
    precioAnterior: typeof p.precioAntes === "number" ? p.precioAntes : 0,
    imagen: p.imagen || null,
    slug: p.slug,
    inStock: true,
    _createdAt: p._createdAt ?? i,

    badge: p.badge ?? "NONE",
    rating: typeof p.rating === "number" ? p.rating : 0,
    ratingCount: typeof p.ratingCount === "number" ? p.ratingCount : 0,
    envioGratis: typeof p.envioGratis === "boolean" ? p.envioGratis : false,
  }))

  return (
    <CombosClient
      combos={productosAdaptados}
      basePath="/productos/zapatillas-individuales"
    />
  )
}