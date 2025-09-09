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
}`

export const Q_PRODUCTOS_BY_CATEGORIA = groq`
*[_type=="producto" && categoria->slug.current == $slug] | order(_createdAt desc){
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current
}`

export const Q_PRODUCTO_BY_SLUG = groq`
*[_type=="producto" && slug.current == $slug][0]{
  _id,
  nombre,
  descripcion,
  precio,
  // imagen principal + galería
  "imagen": imagen.asset->url,
  "galeria": coalesce(galeria[].asset->url, [imagen.asset->url]),
  // variantes
  talles[]{label, inStock},
  colores,
  comboCantidad,
  esCombo,
  // routing
  "categoria": categoria->slug.current,
  "slug": slug.current
}`
