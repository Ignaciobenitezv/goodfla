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
    <main className="min-h-[100dvh] bg-white text-zinc-900 mx-auto max-w-5xl px-4 py-10 mt-10">
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
              Usá esta guía como referencia para elegir el talle que mejor se adapte a tu cuerpo
              y al calce que te gusta.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-xs md:text-sm text-black/80 shadow-sm">
              <p className="font-semibold">Tip rápido</p>
              <p className="mt-1">
                Si estás entre dos talles, elegí el más grande para un calce más relajado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SUBTÍTULO / INFO GENERAL */}
      <p className="mt-8 mx-auto max-w-3xl text-center text-base md:text-lg font-medium leading-relaxed text-zinc-700">
        Medidas tomadas con la prenda apoyada sobre una superficie plana. Puede haber
        tolerancias de ±1–2 cm según el proceso de confección.
      </p>

      {/* REMERAS OVERSIZE */}
      <section className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] items-start">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-zinc-900">
            Remeras Oversize
          </h2>
          <p className="text-sm md:text-[15px] text-zinc-700">
            Corte amplio y relajado, pensado para que la prenda quede suelta en el cuerpo.
            Si preferís un calce menos oversize, podés bajar un talle.
          </p>
          <div className="mt-2 grid gap-2 text-xs md:text-sm text-zinc-700">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Recomendado para:</p>
              <p className="text-zinc-600">
                Looks urbanos, outfits holgados y uso diario con jean o jogger.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Sensación de calce:</p>
              <p className="text-zinc-600">
                Más ancho de pecho y mangas que una remera clásica. El largo suele cubrir parte de la cadera.
              </p>
            </div>
          </div>
        </div>

        <SizeTable caption="Corte oversize" columns={oversizeCols} rows={oversizeRows} />
      </section>

      {/* JEANS BAGGY */}
      <section className="mt-12 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] items-start">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-zinc-900">
            Jeans Baggy
          </h2>
          <p className="text-sm md:text-[15px] text-zinc-700">
            Jean de tiro medio/alto, recto y con pierna amplia. No es chupín ni wide leg extremo:
            queda suelto pero con estructura.
          </p>
          <div className="mt-2 grid gap-2 text-xs md:text-sm text-zinc-700">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Cómo leer la cintura:</p>
              <p className="text-zinc-600">
                La medida de cintura es de lado a lado con la prenda apoyada. Para tu contorno total,
                multiplicá por 2.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Tip de calce:</p>
              <p className="text-zinc-600">
                Si querés que quede más suelto en la cadera, elegí un talle más. Podés usar cinturón
                para ajustar en la cintura.
              </p>
            </div>
          </div>
        </div>

        <SizeTable
          caption="Medidas de jeans baggy"
          columns={baggyCols}
          rows={baggyRows}
        />
      </section>

      {/* REMERAS COMUNES */}
      <section className="mt-12 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] items-start">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide text-zinc-900">
            Remeras comunes
          </h2>
          <p className="text-sm md:text-[15px] text-zinc-700">
            Corte regular, ni muy suelto ni muy ajustado. Ideal para uso diario, look más clásico
            y combinable con todo.
          </p>
          <div className="mt-2 grid gap-2 text-xs md:text-sm text-zinc-700">
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="font-medium">Comparala con una prenda tuya:</p>
              <p className="text-zinc-600">
                Medí una remera que ya uses mucho y te guste cómo te queda, y compará con esta tabla.
              </p>
            </div>
          </div>
        </div>

        <SizeTable caption="Corte regular" columns={comunesCols} rows={comunesRows} />
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

      {/* BLOQUE CÓMO MEDIR */}
      <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 md:px-6 md:py-6">
        <p className="text-sm font-semibold text-zinc-900">Cómo medir tus prendas</p>
        <p className="mt-1 text-xs md:text-sm text-zinc-600">
          Lo ideal es medir una prenda similar que ya tengas y apoyarla sobre una superficie plana.
        </p>
        <ul className="mt-3 grid gap-2 text-xs md:text-sm text-zinc-700 md:grid-cols-2">
          <li>
            <strong>Alto:</strong> desde el punto más alto del hombro hasta el borde inferior.
          </li>
          <li>
            <strong>Ancho:</strong> de axila a axila, con la prenda extendida sin estirar.
          </li>
          <li>
            <strong>Cintura:</strong> medida de un lado a otro en la pretina del jean, sin estirar.
          </li>
          <li>
            <strong>Largo del jean:</strong> desde la pretina hasta el bajo.
          </li>
          <li className="md:col-span-2">
            <strong>Bota:</strong> ancho del bajo de la pierna, con la pierna extendida.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-zinc-500">
          Recordá: las prendas pueden tener una tolerancia de ±1–2 cm por el proceso de confección
          y lavado.
        </p>
      </div>
    </main>
  );
}
