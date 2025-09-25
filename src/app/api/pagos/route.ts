import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, // 👈 tu Access Token
      },
      body: JSON.stringify({
        items: [
          {
            title: "Zapatillas deportivas",
            quantity: 1,
            unit_price: 10000,
          },
        ],
        back_urls: {
          success: `${process.env.PUBLIC_BASE_URL}/success`,
          failure: `${process.env.PUBLIC_BASE_URL}/failure`,
          pending: `${process.env.PUBLIC_BASE_URL}/pending`,
        },
        auto_return: "approved",
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error creando preferencia:", error);
    return NextResponse.json({ error: "Error creando preferencia" }, { status: 500 });
  }
}
