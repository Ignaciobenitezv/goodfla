import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic"; // opcional: evita cachear esta página

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Procesando pago…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
