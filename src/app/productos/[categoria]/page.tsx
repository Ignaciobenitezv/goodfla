import { sanityClient } from "@/lib/sanity.client"
import { Q_PRODUCTOS } from "@/lib/sanityQueries"
import ProductosClient from "./ProductosClient"

export const revalidate = 60

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const { categoria } = params

  const productos = await sanityClient.fetch(
    `*[_type=="producto" && categoria->slug.current == $slug]{
      _id,
      nombre,
      precio,
      "imagen": imagen.asset->url,
      "slug": slug.current
    }`,
    { slug: categoria }
  )

  return <ProductosClient productos={productos} />
}
