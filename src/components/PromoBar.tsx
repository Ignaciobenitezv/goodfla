export default function PromoBar() {
  const items = [
    "15% OFF por transferencia",
    "3 cuotas sin interés",
    "6 cuotas desde $150.000",
    "Envío gratis desde $120.000",
  ]

  // Repetimos varias veces para evitar huecos visibles
  const loopItems = [...items, ...items, ...items, ...items]

  return (
    <div className="w-full overflow-hidden bg-black text-white text-sm">
      <div className="promo-marquee py-2">
        <div className="promo-track">
          {loopItems.map((item, index) => (
            <div key={index} className="promo-item">
              <span>{item}</span>
              <span className="promo-separator">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}