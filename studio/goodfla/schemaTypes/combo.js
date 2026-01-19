import { productMetaFields } from "./productMetaFields"

export default {
  name: "combo",
  title: "Combo",
  type: "document",
  fields: [
    {
      name: "nombre",
      title: "Nombre",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "descripcion",
      title: "Descripción",
      type: "text",
    },

    // 👉 META CAMPOS COMPARTIDOS
    ...productMetaFields,

    {
      name: "precio",
      title: "Precio actual",
      type: "number",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "imagen",
      title: "Imagen de portada",
      type: "image",
      options: { hotspot: true },
    },
    {
      name: "galeria",
      title: "Galería",
      type: "array",
      of: [{ type: "mediaItem" }],
      options: { layout: "grid" },
    },
    {
      name: "categoriasIncluidas",
      title: "Categorías incluidas",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "cantidad", type: "number", title: "Cantidad" },
            {
              name: "categoria",
              type: "reference",
              to: [{ type: "categoria" }],
            },
          ],
        },
      ],
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "nombre",
        maxLength: 96,
      },
    },
  ],
}
