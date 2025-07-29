export type CategoriaProducto =
  | 'todos'
  | 'calzas-largas'
  | 'calzas-cortas'
  | 'tops'
  | 'conjuntos'

export interface Producto {
  id: string
  nombre: string
  descripcion: string
  precio: number
  imagen: string
  categoria: CategoriaProducto
}
