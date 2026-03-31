// app/guia-de-talles/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía de talles | Goodfla",
  description:
    "Medidas de remeras oversize, remeras comunes, jeans baggy y zapatillas (en cm).",
  openGraph: {
    title: "Guía de talles | Goodfla",
    description: "Tabla de medidas en centímetros para nuestras prendas y zapatillas.",
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
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {caption}
        </p>
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
          Medidas en centímetros
        </span>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-700 border-t border-zinc-200/80">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-left font-medium text-[13px]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={
                i % 2 === 0 ? "bg-white" : "bg-zinc-50/60 border-y border-zinc-100"
              }
            >
              {columns.map((c) => (
                <td key={c} className="px-4 py-3 text-zinc-800">
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
    { Talle: "1", "Alto (cm)": 72, "Ancho (cm)": 54 },
    { Talle: "2", "Alto (cm)": 74, "Ancho (cm)": 56 },
    { Talle: "3", "Alto (cm)": 79, "Ancho (cm)": 58 },
  ];

  const baggyCols = ["Talle", "Cintura (cm)", "Largo (cm)", "Bota (cm)"];
  const baggyRows: Row[] = [
    { Talle: 38, "Cintura (cm)": 39, "Largo (cm)": 103, "Bota (cm)": 20 },
    { Talle: 40, "Cintura (cm)": 40, "Largo (cm)": 103, "Bota (cm)": 23 },
    { Talle: 42, "Cintura (cm)": 42, "Largo (cm)": 105, "Bota (cm)": 23 },
    { Talle: 44, "Cintura (cm)": 42, "Largo (cm)": 107, "Bota (cm)": 23 },
    { Talle: 46, "Cintura (cm)": 44, "Largo (cm)": 107, "Bota (cm)": 26 },
  ];

  const comunesCols = ["Talle", "Alto (cm)", "Ancho (cm)"];
  const comunesRows: Row[] = [
    { Talle: "M", "Alto (cm)": 66, "Ancho (cm)": 50 },
    { Talle: "L", "Alto (cm)": 69, "Ancho (cm)": 51 }, // corregido "alto 69"
    { Talle: "XL", "Alto (cm)": 72, "Ancho (cm)": 55 },
    { Talle: "XXL", "Alto (cm)": 75, "Ancho (cm)": 58 },
  ];

    const zapatillasCols = [
    "Talle (AR)",
    "DC (cm)",
    "Puma (cm)",
    "Campus (cm)",
    "Vans (cm)",
    "Samba (cm)",
    "Superstar (cm)",
  ];

  const zapatillasRows: Row[] = [
    { "Talle (AR)": 38, "DC (cm)": 24, "Puma (cm)": 24, "Campus (cm)": 24, "Vans (cm)": 24, "Samba (cm)": 24, "Superstar (cm)": 24 },
    { "Talle (AR)": 39, "DC (cm)": 25, "Puma (cm)": 24.5, "Campus (cm)": 24.5, "Vans (cm)": 24.5, "Samba (cm)": 24.5, "Superstar (cm)": 24.5 },
    { "Talle (AR)": 40, "DC (cm)": 25, "Puma (cm)": 25, "Campus (cm)": 25, "Vans (cm)": 25, "Samba (cm)": 25, "Superstar (cm)": 25 },
    { "Talle (AR)": 41, "DC (cm)": 26, "Puma (cm)": 26, "Campus (cm)": 26, "Vans (cm)": 26, "Samba (cm)": 27, "Superstar (cm)": 26 },
    { "Talle (AR)": 42, "DC (cm)": 27, "Puma (cm)": 27, "Campus (cm)": 27, "Vans (cm)": 27, "Samba (cm)": 27, "Superstar (cm)": 27 },
    { "Talle (AR)": 43, "DC (cm)": 27.5, "Puma (cm)": 27.5, "Campus (cm)": 27.5, "Vans (cm)": 27.5, "Samba (cm)": 27.5, "Superstar (cm)": 27 },
    { "Talle (AR)": 44, "DC (cm)": 28.5, "Puma (cm)": "-", "Campus (cm)": "-", "Vans (cm)": 28.5, "Samba (cm)": "-", "Superstar (cm)": "-" },
  ];


  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900">
  <main className="mx-auto max-w-5xl px-4 py-10 mt-10">
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-marca-amarillo/90">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-10 md:flex-row md:justify-between md:py-12">
          <div className="text-center md:text-left space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-black/70">
              Guía de talles
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-black">
              Elegí tu talle ideal
            </h1>
            <p className="mt-1 max-w-xl text-sm md:text-base text-black/80">
              Usá esta guía como referencia para elegir el talle que mejor .
            </p>
          </div>
          
        </div>
      </section>

     
            {/* ZAPATILLAS */}
      <section className="mt-12 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] items-start">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-zinc-900">
            Zapatillas
          </h2>
          <p className="text-sm md:text-[15px] text-zinc-700">
            Guía de referencia por marca (medidas en cm). Si estás entre dos talles,
            elegí el más grande para mayor comodidad.
          </p>

          <div className="mt-2 grid gap-2 text-xs md:text-sm text-zinc-700">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Tip rápido:</p>
              <p className="text-zinc-600">
                Medí tu pie (talón a punta) o una plantilla y compará con la columna de tu marca.
              </p>
            </div>
          </div>
        </div>

        <SizeTable
          caption="Guía de talles de zapatillas"
          columns={zapatillasCols}
          rows={zapatillasRows}
        />
      </section>
      </main>
</div>

  );
}
