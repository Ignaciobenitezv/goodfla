"use client";
import { useEffect } from "react";

export default function CheckoutPage() {
  useEffect(() => {
    let controller: any = null;

    const initializeBrick = async () => {
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

        const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
        if (!publicKey) {
          console.error("Falta NEXT_PUBLIC_MP_PUBLIC_KEY");
          return;
        }

        const mp = new MP(publicKey, { locale: "es-AR" });
        const bricksBuilder = mp.bricks();

        // IMPORTANT: CardPayment Brick (tarjeta) -> NO usa preferenceId
        controller = await bricksBuilder.create("cardPayment", "paymentBrick_container", {
          initialization: {
            amount: 10000,
          },
          customization: {
            visual: { style: { theme: "default" } },
          },
          callbacks: {
            onReady: () => console.log("Brick listo"),
            onSubmit: async (formData: any) => {
              // Enviar al backend para crear el pago con token, issuer, installments, etc.
              const r = await fetch("/api/payments/card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...formData,
                  amount: 10000,
                }),
              });

              const data = await r.json();
              console.log("Respuesta backend:", data);
            },
            onError: (error: any) => console.error("Error en brick:", error),
          },
        });
      }
    };

    initializeBrick();

    return () => {
      // Limpieza para evitar bricks duplicados
      try {
        controller?.unmount?.();
      } catch {}
    };
  }, []);

  return (
    <main className="max-w-[600px] mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Pagar con MercadoPago</h1>
      <div id="paymentBrick_container"></div>
    </main>
  );
}
