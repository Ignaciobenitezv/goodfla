// studio/.../schemaTypes/producto.js
export default {
  name: 'producto',
  title: 'Producto',
  type: 'document',
  fields: [
    { name: 'nombre', title: 'Nombre', type: 'string' },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'nombre' } },
    { name: 'descripcion', title: 'Descripción', type: 'text' },
    { name: 'precio', title: 'Precio', type: 'number' },

    // Imagen principal (fallback)
    { name: 'imagen', title: 'Imagen principal', type: 'image', options: { hotspot: true } },

    // 👇 NUEVO: galería de imágenes
    {
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      options: { layout: 'grid' },
    },

    // 👇 NUEVO: talles (label + stock)
    {
      name: 'talles',
      title: 'Talles',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'talle',
          fields: [
            { name: 'label', title: 'Etiqueta', type: 'string' },
            { name: 'inStock', title: 'Hay stock', type: 'boolean', initialValue: true },
          ],
          preview: { select: { title: 'label', subtitle: 'inStock' } },
        },
      ],
    },

    { name: 'categoria', title: 'Categoría', type: 'reference', to: [{ type: 'categoria' }] },
  ],
}
