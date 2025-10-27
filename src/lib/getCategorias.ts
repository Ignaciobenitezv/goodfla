// lib/getCategorias.ts
import { sanityClient } from './sanity'


export type Categoria = {
  _id: string
  titulo: string
  slug: string
}

export async function getCategorias(): Promise<Categoria[]> {
  return sanityClient.fetch(
    `*[_type == "categoria"]{
      _id,
      titulo,
      "slug": slug.current
    }`
  )
}
