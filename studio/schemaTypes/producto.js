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
      title: 'Imagen',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoria' }],
    },
  ],
})
