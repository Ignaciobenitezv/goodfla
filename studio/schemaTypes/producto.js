import { defineType } from 'sanity'

export const producto = defineType({
  name: 'producto',
  title: 'Producto',
  type: 'document',
  fields: [
    { name: 'nombre', title: 'Nombre', type: 'string' },
    { name: 'descripcion', title: 'Descripción', type: 'string' },
    { name: 'precio', title: 'Precio', type: 'number' },
    {
      name: 'imagen',
      title: 'Imagen principal',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoria' }],
    },

    // 🔹 Variantes por color y talle
    {
      name: 'variantes',
      title: 'Variantes (Color + Talle)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'color',
              title: 'Color',
              type: 'string',
            },
            {
              name: 'talle',
              title: 'Talle',
              type: 'string',
            },
            {
              name: 'stock',
              title: 'Stock disponible',
              type: 'number',
              validation: (Rule) => Rule.min(0).integer(),
            },
            {
              name: 'imagenVariante',
              title: 'Imagen de la variante (opcional)',
              type: 'image',
              options: { hotspot: true },
            },
          ],
          preview: {
  select: { title: 'title', media: 'portada', precio: 'precioActual' },
  prepare: (value) => ({
    title: value.title,
    subtitle: value.precio != null ? `$${value.precio}` : '',
    media: value.media,
  }),
},
        },
      ],
    },
  ],
})
