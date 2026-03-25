export default function PromoBar() {
  const items = [
    "1 par de Zapatillas x $50.000 c/u",
    "2 pares de Zapatillas x $42.800 c/u",
    "10 pares de Zapatillas x $23.000 c/u",
    "30% OFF pagando por transferencia",
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