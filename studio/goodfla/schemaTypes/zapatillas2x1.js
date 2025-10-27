// /studio/schemaTypes/zapatillas2x1.js
export default {
  name: 'zapatillas2x1',
  title: 'Zapatillas 2×1',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 4
    },
    {
      name: 'precioAntes',
      title: 'Precio antes (opcional)',
      type: 'number'
    },
    {
      name: 'precioActual',
      title: 'Precio actual',
      type: 'number',
      validation: (Rule) => Rule.required().positive()
    },
    {
      name: 'portada',
      title: 'Imagen de portada',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required()
    },
    {
      name: 'galeria',
      title: 'Galería de imágenes',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }]
    },
    {
      // igual que "combos": permite definir slots/cantidades por categoría
      name: 'categoriasIncluidas',
      title: 'Categorías incluidas',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'cantidad',
              title: 'Cantidad',
              type: 'number',
              validation: (Rule) => Rule.required().min(1)
            },
            {
              name: 'categoria',
              title: 'Categoría',
              type: 'reference',
              to: [{ type: 'categoria' }],
              // si querés forzar que SOLO se elija "zapatillas", descomentá el filter:
              // options: {
              //   filter: 'slug.current == "zapatillas"'
              // }
            }
          ],
          preview: {
            select: { titulo: 'categoria.titulo', cant: 'cantidad' },
            prepare({ titulo, cant }) {
              return {
                title: titulo || 'Categoría',
                subtitle: cant ? `Cantidad: ${cant}` : 'Cantidad: —'
              }
            }
          }
        }
      ],
      validation: (Rule) => Rule.required().min(1)
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'nombre',
        maxLength: 96
      },
      validation: (Rule) => Rule.required()
    }
  ],
  preview: {
    select: {
      title: 'nombre',
      media: 'portada',
      precio: 'precioActual'
    },
    prepare({ title, media, precio }) {
      return {
        title,
        subtitle: precio ? `AR$ ${precio}` : 'Sin precio',
        media
      }
    }
  }
}
