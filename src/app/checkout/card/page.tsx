"use client";
import { useEffect } from "react";

export default function CheckoutPage() {
  useEffect(() => {
    const initializeBrick = async () => {
      // Evita inyectar el script dos veces
      if (!document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.async = true;
        script.onload = handleReady;
        document.body.appendChild(script);
      } else {
        handleReady();
      }

      async function handleReady() {
        const MP = (window as any).MercadoPago;
        if (!MP) return;

        const mp = new MP(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, { locale: "es-AR" });
        const bricksBuilder = mp.bricks();

        // Llamo al backend para obtener la preferencia
        const res = await fetch("/api/checkout", { method: "POST" });
        const pref = await res.json();

        bricksBuilder.create("payment", "paymentBrick_container", {
          initialization: {
            amount: 10000, // monto de la compra
            preferenceId: pref.id, // preferencia del backend
          },
          customization: {
            visual: { style: { theme: "default" } }, // otros: "dark", "flat"
          },
          callbacks: {
            onReady: () => console.log("Brick listo"),
            onSubmit: (formData: any) => {
              console.log("Datos enviados:", formData);
            },
            onError: (error: any) => console.error("Error en brick:", error),
          },
        });
      }
    };

    initializeBrick();
  }, []);

  return (
    <main className="max-w-[600px] mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Pagar con MercadoPago</h1>
      <div id="paymentBrick_container"></div>
    </main>
  );
}
