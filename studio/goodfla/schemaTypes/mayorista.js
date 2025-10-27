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
      title: 'Galería de imágenes',
      type: 'array',
      of: [{ type: 'image' }],
      options: { layout: 'grid' },
    },
    {
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
    },
  ],
};
