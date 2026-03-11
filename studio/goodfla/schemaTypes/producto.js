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

    {
      name: 'precioActual',
      title: 'Precio actual',
      type: 'number',
      description: 'Precio final que se muestra en la tienda',
    },
    {
      name: 'precioAntes',
      title: 'Precio anterior',
      type: 'number',
      description: 'Opcional, para mostrar precio tachado',
    },

    {
      name: 'badge',
      title: 'Badge',
      type: 'string',
      options: {
        list: [
          { title: 'Ninguno', value: 'NONE' },
          { title: 'Más vendido', value: 'MAS_VENDIDO' },
          { title: 'Nuevo', value: 'NUEVO' },
          { title: 'Oferta', value: 'OFERTA' },
          { title: 'Edición limitada', value: 'LIMITADA' },
          { title: 'Últimas unidades', value: 'ULTIMAS' },
        ],
        layout: 'dropdown',
      },
      initialValue: 'NONE',
    },

    {
      name: 'rating',
      title: 'Rating',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(5),
    },

    {
      name: 'ratingCount',
      title: 'Cantidad de valoraciones',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    },

    {
      name: 'envioGratis',
      title: 'Envío gratis',
      type: 'boolean',
      initialValue: false,
    },

    {
      name: 'colores',
      title: 'Colores',
      type: 'array',
      of: [{ type: 'string' }],
    },

    {
      name: 'imagen',
      title: 'Imagen principal',
      type: 'image',
      options: { hotspot: true },
    },

    {
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      of: [{ type: 'mediaItem' }],
      options: { layout: 'grid' },
    },

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
              description:
                'Ejemplo: S, M, L, XL para remeras / 38, 40, 42 para jeans / 40, 41, 42 para zapatillas',
            },
            {
              name: 'stock',
              title: 'Stock disponible',
              type: 'number',
              validation: (Rule) => Rule.min(0).integer(),
            },
          ],
          preview: {
            select: {
              title: 'label',
              stock: 'stock',
            },
            prepare({ title, stock }) {
              return {
                title: title || 'Sin talle',
                subtitle: typeof stock === 'number' ? `Stock: ${stock}` : '',
              }
            },
          },
        },
      ],
    },

    {
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoria' }],
    },
  ],
}