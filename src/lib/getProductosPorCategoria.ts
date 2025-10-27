// src/lib/getProductosPorCategoria.ts
import { sanityClient } from "./sanity";
import { Q_PRODUCTOS_BY_CATEGORIA } from "./sanityQueries";

// Definimos el tipo acá (no lo importamos de sanityQueries)
export type ProductoPreview = {
  _id: string;
  nombre: string;
  precio: number;
  imagen?: string;
  categoria: string;
  slug: string;
};

export async function getProductosPorCategoria(
  categoriaSlug: string,
  precio: [number, number], // [min, max]
  filtro: string
): Promise<ProductoPreview[]> {
  // Trae por categoría con tu query actual
  const data = await sanityClient.fetch(Q_PRODUCTOS_BY_CATEGORIA, { slug: categoriaSlug });

  const [min, max] = precio;

  const items = (Array.isArray(data) ? data : [])
    .map((p: any) => ({
      _id: String(p?._id ?? ""),
      nombre: String(p?.nombre ?? p?.title ?? ""),
      precio: Number(p?.precio ?? p?.price ?? 0),
      imagen:
        p?.imagen?.asset?.url ??
        p?.portada?.url ??
        (Array.isArray(p?.galeria) ? p.galeria[0]?.url : undefined),
      categoria:
        p?.categoria?.slug?.current ??
        p?.categoria?.slug ??
        String(categoriaSlug),
      slug: p?.slug?.current ?? p?.slug ?? "",
    }))
    .filter((p) => p.precio >= min && p.precio <= max)
    .filter((p) =>
      filtro ? p.nombre.toLowerCase().includes(filtro.toLowerCase()) : true
    );

  return items as ProductoPreview[];
}
