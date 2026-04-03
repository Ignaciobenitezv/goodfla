import { defineField, defineType } from "sanity"

export default defineType({
  name: "coupon",
  title: "Cupones",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre interno",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "code",
      title: "Código",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "isActive",
      title: "Activo",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "discountType",
      title: "Tipo de descuento",
      type: "string",
      options: {
        list: [
          { title: "Porcentaje", value: "percent" },
          { title: "Monto fijo", value: "fixed" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "discountValue",
      title: "Valor del descuento",
      type: "number",
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: "minimumSubtotal",
      title: "Compra mínima",
      type: "number",
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "expiresAt",
      title: "Vencimiento",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      code: "code",
      isActive: "isActive",
      discountType: "discountType",
      discountValue: "discountValue",
    },
    prepare({ title, code, isActive, discountType, discountValue }) {
      const tipo = discountType === "percent" ? "%" : "$"
      const estado = isActive ? "Activo" : "Inactivo"

      return {
        title: `${title || "Cupón"} (${code || "sin código"})`,
        subtitle: `${estado} · ${tipo}${discountValue ?? 0}`,
      }
    },
  },
})