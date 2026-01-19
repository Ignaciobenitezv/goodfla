export const productMetaFields = [
  {
    name: "badge",
    title: "Badge",
    type: "string",
    options: {
      list: [
        { title: "Más vendido", value: "MAS_VENDIDO" },
        { title: "Nuevo", value: "NUEVO" },
        { title: "Oferta", value: "OFERTA" },
        { title: "Edición limitada", value: "LIMITADA" },
        { title: "Últimas unidades", value: "ULTIMAS" },
        { title: "Sin badge", value: "NONE" },
      ],
      layout: "dropdown",
    },
    initialValue: "NONE",
  },
  {
    name: "rating",
    title: "Rating (0 a 5)",
    type: "number",
    validation: (Rule) => Rule.min(0).max(5),
    initialValue: 5,
  },
  {
    name: "ratingCount",
    title: "Cantidad de votaciones",
    type: "number",
    validation: (Rule) => Rule.min(0).integer(),
    initialValue: 1,
  },
  {
    name: "precioAnterior",
    title: "Precio anterior",
    type: "number",
    validation: (Rule) => Rule.min(0),
  },
  {
    name: "envioGratis",
    title: "Envío gratis",
    type: "boolean",
    initialValue: false,
  },
]
