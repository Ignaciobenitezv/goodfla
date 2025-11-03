// app/guia-de-talles/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía de talles | Goodfla",
  description:
    "Medidas de remeras oversize, remeras comunes y jeans baggy: alto, ancho, cintura, largo y bota (en cm).",
  openGraph: {
    title: "Guía de talles | Goodfla",
    description:
      "Tabla de medidas en centímetros para nuestras prendas.",
    type: "article",
    url: "/guia-de-talles",
  },
};

type Row = Record<string, string | number>;

function SizeTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Row[];
}) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <caption className="text-left p-4 font-semibold">{caption}</caption>
        <thead className="bg-zinc-50 text-zinc-700">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}
            >
              {columns.map((c) => (
                <td key={c} className="px-4 py-3">
                  {r[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuiaDeTallesPage() {
  // Datos (en centímetros)
  const oversizeCols = ["Talle", "Alto (cm)", "Ancho (cm)"];
  const oversizeRows: Row[] = [
    { "Talle": "1", "Alto (cm)": 72, "Ancho (cm)": 54 },
    { "Talle": "2", "Alto (cm)": 74, "Ancho (cm)": 56 },
    { "Talle": "3", "Alto (cm)": 79, "Ancho (cm)": 58 },
  ];

  const baggyCols = ["Talle", "Cintura (cm)", "Largo (cm)", "Bota (cm)"];
  const baggyRows: Row[] = [
    { "Talle": 38, "Cintura (cm)": 39, "Largo (cm)": 103, "Bota (cm)": 20 },
    { "Talle": 40, "Cintura (cm)": 40, "Largo (cm)": 103, "Bota (cm)": 23 },
    { "Talle": 42, "Cintura (cm)": 42, "Largo (cm)": 105, "Bota (cm)": 23 },
    { "Talle": 44, "Cintura (cm)": 42, "Largo (cm)": 107, "Bota (cm)": 23 },
    { "Talle": 46, "Cintura (cm)": 44, "Largo (cm)": 107, "Bota (cm)": 26 },
  ];

  const comunesCols = ["Talle", "Alto (cm)", "Ancho (cm)"];
  const comunesRows: Row[] = [
    { "Talle": "M", "Alto (cm)": 66, "Ancho (cm)": 50 },
    { "Talle": "L", "Alto (cm)": 69, "Ancho (cm)": 51 }, // corregido "alto 69"
    { "Talle": "XL", "Alto (cm)": 72, "Ancho (cm)": 55 },
    { "Talle": "XXL", "Alto (cm)": 75, "Ancho (cm)": 58 },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-marca-amarillo py-12">
  <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-widest text-black">
    Guía de talles
  </h1>
</section>


    <p className="mt-2 mx-auto max-w-3xl text-center text-xl md:text-2xl font-bold leading-relaxed text-zinc-700">
  Medidas tomadas con la prenda apoyada sobre una superficie plana.
  Puede haber tolerancias de ±1–2 cm.
</p>


      <section className="mt-10 space-y-6">
        <h2 className="text-3xl md:text-4xl text-center font-bold tracking-wide text-zinc-800">
  Remeras Oversize
</h2>
        <SizeTable caption="Corte oversize" columns={oversizeCols} rows={oversizeRows} />
      </section>

      <section className="mt-10 space-y-6">
<h2 className="text-3xl md:text-4xl text-center font-bold tracking-wide text-zinc-800">
  Jeans Baggy
</h2>
        <SizeTable caption="Medidas de jeans baggy" columns={baggyCols} rows={baggyRows} />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-3xl md:text-4xl text-center font-bold tracking-wide text-zinc-800">
  Remeras comunes
</h2>
        <SizeTable caption="Corte regular" columns={comunesCols} rows={comunesRows} />
      </section>

      <div className="mt-10 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium">Cómo medir</p>
        <ul className="mt-2 list-disc pl-5">
          <li><strong>Alto:</strong> desde el punto más alto del hombro hasta el borde inferior.</li>
          <li><strong>Ancho:</strong> de axila a axila, con la prenda extendida.</li>
          <li><strong>Cintura:</strong> medida de un lado a otro en la pretina, sin estirar.</li>
          <li><strong>Largo:</strong> desde la pretina hasta el bajo.</li>
          <li><strong>Bota:</strong> ancho del bajo de la pierna.</li>
        </ul>
      </div>
      
    </main>
    
  );
}
