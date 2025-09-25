import Image from 'next/image'
import Link from 'next/link'

type ProductCardProps = {
  product: {
    _id: string
    nombre: string
    precio: number
    imagen: string
    slug: string
  }
  view: "list" | "grid2" | "grid3" | "grid4"
}

const ProductCard = ({ product, view }: ProductCardProps) => {
  // Clases dinámicas para el grid
  const gridClass =
    view === "list"
      ? "flex flex-col gap-6"
      : view === "grid2"
      ? "grid grid-cols-2 gap-4"
      : view === "grid3"
      ? "grid grid-cols-3 gap-4"
      : "grid grid-cols-4 gap-4"

  const imageWrapClass =
    view === "list"
      ? "relative bg-gray-50 shrink-0 w-36 sm:w-44 lg:w-52 aspect-square rounded-md overflow-hidden"
      : "relative bg-gray-50 w-full aspect-[4/5] rounded-md overflow-hidden"

  const imageSizes =
    view === "list"
      ? "(min-width:1024px) 208px, (min-width:640px) 176px, 144px"
      : "(min-width:1280px) calc((100vw - 250px - 48px)/4), (min-width:1024px) calc((100vw - 250px - 48px)/3), (min-width:640px) calc((100vw - 250px - 32px)/2), 100vw"

  return (
    <Link
      key={product._id}
      href={`/producto/${product.slug}`}
      className="block shadow hover:shadow-lg transition rounded-2xl overflow-hidden bg-white"
    >
      {/* Imagen */}
      <div className={imageWrapClass}>
        {product.imagen ? (
          <Image
            src={product.imagen}
            alt={product.nombre}
            fill
            sizes={imageSizes}
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Sin imagen
          </span>
        )}
      </div>

      {/* Texto debajo */}
      <div className="p-4">
        <h2 className="font-semibold text-base">{product.nombre}</h2>
        <p className="text-red-600 font-bold text-lg">
          ${product.precio.toLocaleString("es-AR")}
        </p>
      </div>
    </Link>
  )
}

export default ProductCard
