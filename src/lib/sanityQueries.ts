import groq from 'groq'

export const Q_PRODUCTOS = `
*[_type == "producto"]{
  _id,
  nombre,
  descripcion,
  precio,
  "imagen": coalesce(imagen[0].asset->url, imagen.asset->url),
  "categoria": categoria->slug.current,
  "slug": coalesce(slug.current, _id)
}
`


export const Q_PRODUCTOS_DESTACADOS = groq`
*[_type=="producto"] | order(_createdAt desc)[0...$limit]{
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current,
  talles[]{label, stock}
}
`

export const Q_PRODUCTO_BY_SLUG = groq`
*[_type=="producto" && slug.current == $slug][0]{
  _id,
  nombre,
  descripcion,
  precio,
  "imagen": imagen.asset->url,

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  talles[]{label, stock},
  esCombo,
  comboCantidad,
  "categoria": categoria->slug.current,
  "slug": slug.current
}`


export const Q_COMBOS = groq`
*[_type == "combo"] | order(_createdAt desc){
  _id,
  _createdAt,
  nombre,
  descripcion,
  precioAnterior,
  precio,

  // ✅ meta dinámico
  badge,
  rating,
  ratingCount,
  "envioGratis": coalesce(envioGratis, false),

  "slug": slug.current,
  "imagen": imagen.asset->url,


  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  "categoria": "combos",
  categoriasIncluidas[] {
    cantidad,
    categoria->{
      _id,
      titulo,
      "slug": slug.current
    }
  }
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

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  categoriasIncluidas[] {
    cantidad,
    categoria->{
      _id,
      titulo,
      "slug": slug.current
    }
  }
}`

export const Q_PRODUCTOS_BY_CATEGORIA = groq`
*[_type=="producto" && categoria->slug.current == $slug] | order(_createdAt desc){
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "categoria": categoria->slug.current,
  "slug": slug.current,
  talles[]{label, stock}
}`

export const Q_REMERAS = groq`
*[_type == "producto" && categoria->slug.current == "remeras"] | order(_createdAt desc) {
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "slug": slug.current,
  talles[]{label, stock}
}`;


export const Q_JEANS = groq`
*[_type == "producto" && categoria->slug.current == "jeans"] | order(_createdAt desc) {
  _id,
  nombre,
  precio,
  "imagen": imagen.asset->url,
  "slug": slug.current,
  talles[]{label, stock}
}`;

export const Q_ZAPATILLAS = groq`
*[_type == "producto" && categoria->slug.current == "zapatillas"] | order(_createdAt desc) {
  _id,
  _createdAt,
  nombre,
  precio,
  "imagen": imagen.asset->url,

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  "slug": slug.current,
  talles[]{label, stock}
}`




export const Q_ZAPA2X1_LIST = groq`
*[_type == "zapatillas2x1" && defined(slug.current)] | order(_createdAt desc){
  _id,
  _createdAt,
  nombre,
  descripcion,
  precioAntes,
  precioActual,

  // ✅ meta dinámico
  badge,
  rating,
  ratingCount,
  "envioGratis": coalesce(envioGratis, false),

  "slug": slug.current,


  // ✅ este es el campo que tu grid probablemente espera
  "imagen": portada.asset->url,

  // opcional por si querés mostrar miniaturas mixtas
  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  categoriasIncluidas[]{
    cantidad,
    categoria->{ _id, titulo, "slug": slug.current }
  },
  _createdAt
}
`





export const Q_MAYORISTA_LIST = groq`
*[_type == "packMayorista" && activo == true] | order(title asc){
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  descripcion,
  precioAntes,
  precioActual,

  // ✅ meta dinámico
  badge,
  rating,
  ratingCount,
  "envioGratis": coalesce(envioGratis, false),

  "portada": portada.asset->{ url, _id, metadata{ lqip, dimensions } },

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  _createdAt
}`



export const Q_MAYORISTA_BY_SLUG = groq`
*[_type == "packMayorista" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  descripcion,
  precioAntes,
  precioActual,
  "portada": portada.asset->{ url, _id, metadata{ lqip, dimensions } },

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  }
}`



export const Q_COMBOS_ZAPATILLAS_2X1 = groq`
*[
  _type == "combo" &&
  // Debe haber al menos 2 slots que apunten a la categoría "zapatillas"
  count(categoriasIncluidas[ categoria->slug.current == "zapatillas" ]) >= 2
] | order(_createdAt desc){
  _id,
  nombre,
  descripcion,
  precioAnterior,
  precio,
  "slug": slug.current,
  // portada/galería como en Q_COMBOS
  "imagen": imagen.asset->url,
  galeria[]{
  tipo,
  "imagenUrl": imagen.asset->url,
  "videoUrl": video.asset->url
},

  categoriasIncluidas[] {
    cantidad,
    categoria->{
      _id,
      titulo,
      "slug": slug.current
    }
  }
}
`

export const Q_ZAPATILLAS_2X1 = groq`
*[
  _type == "combo" &&
  (
    count(categoriasIncluidas[categoria->slug.current == "zapatillas"]) >= 2 ||
    count(categoriasIncluidas[categoria->slug.current == "zapatillas" && cantidad >= 2]) >= 1
  )
] | order(_createdAt desc){
  _id,
  nombre,
  descripcion,
  precioAnterior,
  precio,
  "slug": slug.current,
  "imagen": imagen.asset->url,
  galeria[]{
  tipo,
  "imagenUrl": imagen.asset->url,
  "videoUrl": video.asset->url
},
  categoriasIncluidas[]{
    cantidad,
    categoria->{ _id, titulo, "slug": slug.current }
  }
}
`

export const Q_ZAPA2X1_BY_SLUG = groq`
*[_type == "zapatillas2x1" && slug.current == $slug][0]{
  _id,
  nombre,
  descripcion,
  precioAntes,
  precioActual,
  "slug": slug.current,

  // portada como URL simple
  "portadaUrl": portada.asset->url,

  // galería como mediaItem
  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  categoriasIncluidas[]{
    cantidad,
    categoria->{ _id, titulo, "slug": slug.current }
  }
}
`


export const Q_ZAPATILLAS_INDIVIDUALES_LIST = groq`
*[
  _type == "producto" &&
  categoria->slug.current == "zapatillas"
] | order(_createdAt desc) {
  _id,
  _createdAt,
  nombre,
  precio,
  precioActual,
  precioAntes,
  "slug": slug.current,

  "badge": coalesce(badge, "NONE"),
  "rating": coalesce(rating, 0),
  "ratingCount": coalesce(ratingCount, 0),
  "envioGratis": coalesce(envioGratis, false),

  "imagen": coalesce(
    imagen.asset->url,
    galeria[0].imagen.asset->url
  )
}
`

export const Q_ZAPATILLA_INDIVIDUAL_BY_SLUG = groq`
*[
  _type == "producto" &&
  categoria->slug.current == "zapatillas" &&
  slug.current == $slug
][0]{
  _id,
  nombre,
  descripcion,
  precio,
  precioActual,
  precioAntes,
  "slug": slug.current,

  "badge": coalesce(badge, "NONE"),
  "rating": coalesce(rating, 0),
  "ratingCount": coalesce(ratingCount, 0),
  "envioGratis": coalesce(envioGratis, false),

  "imagen": coalesce(
    imagen.asset->url,
    galeria[0].imagen.asset->url
  ),

  galeria[]{
    tipo,
    "imagenUrl": imagen.asset->url,
    "videoUrl": video.asset->url
  },

  talles[]{
    label,
    stock
  },

  colores
}
`