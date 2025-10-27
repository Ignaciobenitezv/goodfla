import PDPBase from "./PDPBase"

const accordionSections = [
  {
    title: "Origen y Cuidados",
    content: (
      <div className="space-y-3 text-base leading-relaxed">
        <p><strong>Origen</strong></p>
        <p>
          Nuestras prendas son 1000% argentinas tanto en su materia prima como en su elaboración artesanal.
          Creemos en el valor de lo hecho a mano, y al no ser un proceso mecanizado,
          cada prenda puede contar con pequeñas diferencias o imperfecciones.
        </p>

        <p><strong>Cuidados*</strong></p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Lavado a máquina en agua fría (máx. 30ºC), del revés.</li>
          <li>Secado al aire libre; evitar la secadora o usar ciclo frío y retirar al 80% seco.</li>
          <li>Plancha a baja temperatura (máx. 110ºC), del revés.</li>
          <li>No usar lavandina ni cloro.</li>
          <li>Lavar con colores similares; evitar limpieza en seco.</li>
        </ul>

        <p className="italic text-gray-500">
          Aclaraciones: Nuestros productos no se encuentran prelavados (a excepción de los de Jean),
          por lo que aquellos que contienen algodón pueden encoger hasta un 5%.
        </p>
      </div>
    ),
  },
  {
    title: "Retiros y Envios",
    content: (
      <div className="space-y-3 text-base leading-relaxed">
        <p>Enviamos a todo el país excepto Tierra del Fuego.</p>
        <p>Nuestros tiempos de despacho son de 48hs a 72hs hábiles luego de acreditado el pago.</p>

        <p><strong>Tipos de envío:</strong></p>
        <p><strong>Retiros</strong></p>
        <p>Podés hacer tu pedido en la web y retirarlo en nuestra ubicación en Resistencia, Chaco ni bien se acredite tu pago.</p>

        <ul className="list-disc ml-6 space-y-1">
          <li>Hace tu pedido y pagalo antes de las 11 am y recibilo en el día, sino al día siguiente hábil.</li>
          <li>Entrega en 24 hs luego de acreditado el pago* y despachado.</li>
          <li><strong>Correo Argentino:</strong> A domicilio o a sucursal.</li>
        </ul>

        <p className="italic text-gray-500">
          *Una vez despachado, los tiempos dependen 100% de la empresa de logística. Mercado Pago se acredita automáticamente, transferencia puede demorar hasta 48hs.
        </p>
        <p className="italic text-gray-500">
          *Importante sobre envíos con Correo Argentino: no cuentan con seguro. Cualquier inconveniente comprobable que sea responsabilidad de Correo Argentino no será asumido por Goodfla.
        </p>
      </div>
    ),
  },
  {
    title: "Cambios y Devoluciones",
    content: (
      <div className="space-y-3 text-base leading-relaxed">
        <p><strong>Cambios</strong></p>
        <p>
          Nuestro sistema automatizado facilita el proceso de cambios a domicilio,
          con un plazo de aprobación de 24 a 72 horas hábiles desde que se completa la solicitud.
          Si hay alguna diferencia de pago o inconveniente, se le dará prioridad.
        </p>
        <p>
          Tenés hasta 30 días desde la recepción del pedido para solicitar un cambio,
          y recibirás confirmación por email en cada etapa del proceso.
        </p>
        <p>Los cambios se realizan a través de OCA, con un costo mayor al envío convencional.</p>

        <p><strong>Devoluciones</strong></p>
        <p>
          Contamos con un proceso automatizado y eficiente. Disponés de 30 días desde la recepción del pedido para realizar la devolución,
          y recibirás notificaciones por email.
        </p>
        <p>Los retiros de paquetes por devolución se realizan mediante OCA, con un costo mayor al estándar.</p>

        <p><strong>Política de Descuentos</strong></p>
        <p>Los descuentos aplicados al pedido original también se aplican en caso de cambios o devoluciones.</p>
      </div>
    ),
  },
]

type PDPRemeraProps = {
  producto: {
    nombre: string
    precio: number
    descripcion?: string
    composicion?: string
    galeria?: string[]
    talles?: { label: string; stock: number }[]
  }
}

export default function PDPRemera({ producto }: PDPRemeraProps) {
  return <PDPBase producto={producto} accordionSections={accordionSections} />
}
