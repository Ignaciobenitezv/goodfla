export default function PromoBar() {
  return (
    <div className="w-full bg-[#000] text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-center gap-8 text-center flex-wrap">
        <span className="font-medium">15% OFF en pagos con transferencia</span>
        <span className="hidden md:inline">|</span>
        <span>3 cuotas sin interés</span>
        <span className="hidden md:inline">|</span>
        <span>6 cuotas desde $150.000</span>
        <span className="hidden md:inline">|</span>
        <span>Envío gratis en compras mayores a $120.000</span>
      </div>
    </div>
  )
}
