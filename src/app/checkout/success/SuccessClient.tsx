"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SuccessClient() {
  const sp = useSearchParams();
  const [done, setDone] = useState(false);

  // MP suele enviar estos params
  const paymentId =
    sp.get("payment_id") || sp.get("collection_id") || sp.get("preference_id");
  const status = sp.get("status") || sp.get("collection_status") || "approved";
  const merchantOrderId = sp.get("merchant_order_id") || "";

  useEffect(() => {
    // Ejemplo: actualizar stock con lo que guardaste en localStorage
    (async () => {
      try {
        const lastOrderRaw = localStorage.getItem("lastOrder");
        if (lastOrderRaw) {
          const lastOrder = JSON.parse(lastOrderRaw);
          await fetch("/api/stock/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: lastOrder, paymentId, status }),
          });
          // limpiar carrito local si querés
          localStorage.removeItem("cart");
          localStorage.removeItem("lastOrder");
        }
      } catch (e) {
        console.error("Error al actualizar stock:", e);
      } finally {
        setDone(true);
      }
    })();
  }, [paymentId, status]);

  return (
    <main className="max-w-2xl mx-auto p-8 text-center space-y-6">
      <h1 className="text-2xl font-bold">¡Gracias por tu compra! 🎉</h1>
      <p>
        Estado del pago:{" "}
        <span className="font-semibold uppercase">{status}</span>
      </p>
      {paymentId && <p>ID de pago: <span className="font-mono">{paymentId}</span></p>}
      {merchantOrderId && (
        <p>Orden: <span className="font-mono">{merchantOrderId}</span></p>
      )}
      <p className="text-gray-600">
        {done ? "Tu pedido está siendo procesado." : "Confirmando tu pago…"}
      </p>
      <Link
        href="/productos"
        className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
      >
        Seguir comprando
      </Link>
    </main>
  );
}
