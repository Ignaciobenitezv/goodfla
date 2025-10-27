// studio/.../schemaTypes/producto.js
export default {
  name: 'producto',
  title: 'Producto',
  type: 'document',
  fields: [
    { name: 'nombre', title: 'Nombre', type: 'string' },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'nombre' },
    },
    { name: 'descripcion', title: 'Descripción', type: 'text' },
    { name: 'precio', title: 'Precio', type: 'number' },

    // Imagen principal (fallback)
    {
      name: 'imagen',
      title: 'Imagen principal',
      type: 'image',
      options: { hotspot: true },
    },

    // Galería de imágenes
    {
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      options: { layout: 'grid' },
    },

    // 🔹 Talles con stock numérico
    {
      name: 'talles',
      title: 'Talles',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'talle',
          fields: [
            {
              name: 'label',
              title: 'Etiqueta',
              type: 'string',
              description: 'Ejemplo: S, M, L, XL para remeras / 38, 40, 42 para jeans / 40, 41, 42 para zapatillas',
            },
            {
              name: 'stock',
              title: 'Stock disponible',
              type: 'number',
              validation: (Rule) => Rule.min(0).integer(),
            },
          ],
          preview: {
  select: { title: 'title', media: 'portada', precio: 'precioActual' },
  prepare: (value) => ({
    title: value.title,
    subtitle: value.precio != null ? `$${value.precio}` : '',
    media: value.media,
  }),
}

        },
      ],
    },

    { name: 'categoria', title: 'Categoría', type: 'reference', to: [{ type: 'categoria' }] },
  ],
}
