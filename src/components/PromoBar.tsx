export default function PromoBar() {
  const items = [
    "Zapatillas x $35.000 c/u",
    "2   -   Zapatillas x $59.999 c/u",
    "10   -   Zapatillas x $250.000 c/u",
    "3 cuotas sin interes",
    "Envío gratis",
  ]

  const loopItems = [...items, ...items, ...items, ...items]

  return (
    <div className="w-full overflow-hidden bg-black text-white text-sm">
      <div className="promo-marquee py-2">
        <div className="promo-track">
          {loopItems.map((item, index) => (
            <div key={index} className="promo-item">
              <span className="promo-text">{item}</span>
              <span className="promo-separator">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}