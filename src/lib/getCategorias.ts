// lib/getCategorias.ts
import { sanityClient } from './sanity'

export async function getCategorias() {
  const query = `*[_type == "categoria"]{
    _id,
    nombre,
    "slug": slug.current
  }`
  return await sanityClient.fetch(query)
}
