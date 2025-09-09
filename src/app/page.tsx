import HeroSlider from '@/components/HeroSlider'
import LogoMarquee from '@/components/LogoMarquee'
import CategoriasDestacadas from '@/components/CategoriasDestacadas'
import BeneficiosGrid from '@/components/BeneficiosGrid'
import ProductosDestacados from '@/components/ProductosDestacados'
import CategoriasGrid from '@/components/CategoriasGrid'
import FooterSeccion from '@/components/FooterSeccion'
import VideoHero from '@/components/VideoHero'
import { getProductosDestacados } from '@/lib/getProductos'

export const revalidate = 60

export default async function Home() {
  let destacados:
    | { id?: string | number; nombre: string; precio: number; imagen: string; slug?: string; categoria?: string }[]
    | undefined

  try {
    const data = await getProductosDestacados(6)
    destacados = (data ?? []).map((p) => ({
      id: p._id,
      nombre: p.nombre,
      precio: p.precio,
      imagen: p.imagen,
      slug: p.slug,
      categoria: p.categoria,
    }))
  } catch {
    destacados = undefined
  }

  return (
    <>
      <HeroSlider />
      <LogoMarquee />
      <CategoriasDestacadas />
      <BeneficiosGrid />

      

      <VideoHero />
<ProductosDestacados productos={destacados} />
      <section className="bg-marca-crema text-marca-gris py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Hecho para moverte</h2>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed">
          Cada prenda de VUCAS nace con un propósito: acompañarte en tu entrenamiento, darte confianza y adaptarse a vos.
          Diseñamos pensando en cada detalle, combinando funcionalidad y estilo para que entrenar sea más cómodo, más tuyo.
        </p>
      </section>

      <CategoriasGrid />

      <section className="relative h-[60vh] bg-cover bg-center" style={{ backgroundImage: 'url(/filagod.png)' }}>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-center">
          <h2 className="text-4xl md:text-5xl font-bold">#GoodflaClub</h2>
        </div>
      </section>

      <FooterSeccion />
    </>
  )
}
