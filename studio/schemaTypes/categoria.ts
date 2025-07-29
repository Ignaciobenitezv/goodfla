import { defineType } from 'sanity'

export const categoria = defineType({
  name: 'categoria',
  title: 'Categoría',
  type: 'document',
  fields: [
    { name: 'nombre', title: 'Nombre', type: 'string' },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'nombre', maxLength: 96 },
    },
  ],
})
