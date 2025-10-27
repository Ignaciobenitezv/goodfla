// src/app/mayorista/[slug]/page.tsx
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity.client";
import { Q_MAYORISTA_BY_SLUG } from "@/lib/sanityQueries";
import PDPMayoristaDetalle from "@/components/PDPMayoristaDetalle";

export const revalidate = 60;

type Params = { slug: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const pack = await sanityClient.fetch(Q_MAYORISTA_BY_SLUG, { slug });
  if (!pack) return notFound();

  // Mapear Sanity -> props que espera el PDP
  const producto = {
    _id: pack._id,
    nombre: pack.title,
    precioActual: pack.precioActual,
    precioAntes: pack.precioAntes ?? null,
    descripcion: pack.descripcion ?? "",
    slug: pack.slug,
    galeria: [
      pack?.portada?.url,
      ...(Array.isArray(pack?.galeria) ? pack.galeria.map((g: any) => g?.url) : []),
    ].filter(Boolean) as string[],
  };

  return <PDPMayoristaDetalle producto={producto} />;
}
