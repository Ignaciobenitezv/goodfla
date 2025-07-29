import { sanityClient } from './sanity'

export async function getProductos() {
  const query = `*[_type == "producto"]{
    _id,
    nombre,
    descripcion,
    precio,
    categoria,
    "imagen": imagen.asset->url
  }`

  return await sanityClient.fetch(query)
}
