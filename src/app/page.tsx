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


  return (
    <>
      <HeroSlider />
      <LogoMarquee />
      <CategoriasDestacadas />

      <LogoMarquee />

      <VideoHero />
<LogoMarquee />

      <section className="relative h-[60vh] bg-cover bg-center" style={{ backgroundImage: 'url(/filagod.png)' }}>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-center">
          <h2 className="text-4xl md:text-5xl font-bold">#GoodflaClub</h2>
        </div>
      </section>

      <FooterSeccion />
    </>
  )
}
