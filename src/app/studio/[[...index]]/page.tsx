/* src/app/studio/[[...index]]/page.tsx */
"use client";

import nextDynamic from "next/dynamic";
import rawConfig from "../../../../studio/goodfla/sanity.config";

const NextStudio = nextDynamic(
  () => import("next-sanity/studio").then((m) => m.NextStudio),
  { ssr: false }
);

const config = rawConfig as unknown as import("sanity").Config;

export default function StudioPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "black", // opcional, evita “fugas” del layout
      }}
    >
      <NextStudio config={config} />
    </div>
  );
}
