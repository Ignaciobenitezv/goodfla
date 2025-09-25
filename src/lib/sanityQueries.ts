import groq from 'groq'

export const Q_PRODUCTOS = groq`
*[_type == "producto"]{
  _id,
  nombre,
  descripcion,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current
}`

export const Q_PRODUCTOS_DESTACADOS = groq`
*[_type=="producto"] | order(_createdAt desc)[0...$limit]{
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current
}
`

export const Q_PRODUCTO_BY_SLUG = groq`
*[_type=="producto" && slug.current == $slug][0]{
  _id,
  nombre,
  descripcion,
  precio,
  "imagen": imagen.asset->url,
  "galeria": coalesce(galeria[].asset->url, [imagen.asset->url]),
  talles[]{label, inStock},
  colores,
  comboCantidad,
  esCombo,
  "categoria": categoria->slug.current,
  "slug": slug.current
}`

export const Q_COMBO_BY_SLUG = groq`
*[_type == "combo" && slug.current == $slug][0]{
  _id,
  nombre,
  descripcion,
  precioAnterior,
  precio,
  "slug": slug.current,
  "imagen": imagen.asset->url,
  "galeria": coalesce(galeria[].asset->url, [imagen.asset->url]),
  categoriasIncluidas[] {
    cantidad,
    categoria->{
      _id,
      titulo,
      "slug": slug.current
    }
  }
}`

export const Q_COMBOS = groq`
*[_type == "combo"] | order(_createdAt desc){
  _id,
  nombre,
  descripcion,
  precioAnterior,
  precio,
  "slug": slug.current,
  "imagen": imagen.asset->url,
  "galeria": coalesce(galeria[].asset->url, [imagen.asset->url]),
  categoriasIncluidas[] {
    cantidad,
    categoria->{
      _id,
      titulo,
      "slug": slug.current
    }
  }
}`

// Actualización de la consulta de productos por categoría
export const Q_PRODUCTOS_BY_CATEGORIA = groq`
*[_type=="producto" && categoria->slug.current == $slug] | order(_createdAt desc){
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current,
  talles[]{label, inStock},
  colores
}`



export const Q_REMERAS = `*[_type == "producto" && categoria->slug.current == "remeras"] | order(_createdAt desc) {
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "slug": slug.current
}`;
