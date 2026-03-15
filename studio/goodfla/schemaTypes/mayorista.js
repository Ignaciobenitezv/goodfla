// schemaTypes/mayorista.js
export default {
  name: 'packMayorista',
  title: 'Pack Mayorista',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
    },
    {
      name: 'precioAntes',
      title: 'Precio antes (opcional)',
      type: 'number',
      description: 'Si se completa, se mostrará tachado como precio anterior',
    },
    {
      name: 'precioActual',
      title: 'Precio actual',
      type: 'number',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'portada',
      title: 'Imagen de portada',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      of: [{ type: 'mediaItem' }],
      options: { layout: 'grid' },
    },
    {
      name: 'categoriasIncluidas',
      title: 'Categorías incluidas',
      type: 'array',
      validation: (Rule) => Rule.required().min(1),
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'cantidad',
              title: 'Cantidad',
              type: 'number',
              validation: (Rule) => Rule.required().min(1),
            },
            {
              name: 'categoria',
              title: 'Categoría',
              type: 'reference',
              to: [{ type: 'categoria' }],
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: {
              cantidad: 'cantidad',
              titulo: 'categoria.titulo',
            },
            prepare({ cantidad, titulo }) {
              return {
                title: `${titulo || 'Categoría'} x${cantidad || 0}`,
              }
            },
          },
        },
      ],
    },
    {
      name: 'badge',
      title: 'Badge',
      type: 'string',
      options: {
        list: [
          { title: 'Ninguno', value: 'NONE' },
          { title: 'Nuevo', value: 'NUEVO' },
          { title: 'Más vendido', value: 'MAS_VENDIDO' },
          { title: 'Oferta', value: 'OFERTA' },
          { title: 'Edición limitada', value: 'LIMITADA' },
          { title: 'Últimas unidades', value: 'ULTIMAS' },
        ],
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
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'envioGratis',
      title: 'Envío gratis',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
    },
  ],
}