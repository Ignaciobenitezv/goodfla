// lib/getProductos.ts
import { sanityClient } from './sanity'

export async function getProductos() {
  const query = `*[_type == "producto"]{
    _id,
    nombre,
    descripcion,
    precio,
    "imagen": imagen.asset->url,
    "categoria": categoria->slug.current
  }`
  return await sanityClient.fetch(query)
}
