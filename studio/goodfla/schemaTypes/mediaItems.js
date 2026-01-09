export default {
  name: 'mediaItem',
  title: 'Media (Imagen o Video)',
  type: 'object',
  fields: [
    {
      name: 'tipo',
      title: 'Tipo',
      type: 'string',
      options: {
        list: [
          { title: 'Imagen', value: 'image' },
          { title: 'Video', value: 'video' },
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.tipo !== 'image',
    },
    {
      name: 'video',
      title: 'Video',
      type: 'file',
      options: { accept: 'video/mp4,video/webm,video/quicktime' },
      hidden: ({ parent }) => parent?.tipo !== 'video',
    },
  ],
  preview: {
    select: { tipo: 'tipo', imagen: 'imagen' },
    prepare({ tipo, imagen }) {
      return { title: tipo === 'video' ? 'Video' : 'Imagen', media: imagen };
    },
  },
}
