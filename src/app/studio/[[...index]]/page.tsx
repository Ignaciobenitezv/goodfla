/* ecomerce/ecomerce/src/app/studio/[[...index]]/page.tsx */
"use client";

import nextDynamic from "next/dynamic";
import rawConfig from "../../../../studio/goodfla/sanity.config";

// Cargamos NextStudio solo en cliente (sin SSR)
const NextStudio = nextDynamic(
  () => import("next-sanity/studio").then((m) => m.NextStudio),
  { ssr: false }
);

// Parche de tipos por el doble node_modules (Opción 2)
const config = rawConfig as unknown as import("sanity").Config;

export default function StudioPage() {
  return <NextStudio config={config} />;
}
