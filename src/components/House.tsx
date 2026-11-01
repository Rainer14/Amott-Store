const principles = [
  {
    title: 'Variedad',
    body: 'Reunimos productos de distintos rubros para que puedas encontrar opciones para tu hogar, tu trabajo y tus proyectos.',
  },
  {
    title: 'Fácil de explorar',
    body: 'Organizamos los productos por categorías para ayudarte a recorrer el catálogo y encontrar lo que buscas.',
  },
  {
    title: 'Atención cercana',
    body: '¿Tienes dudas sobre un producto? Escríbenos y estaremos encantados de ayudarte.',
  },
]

export function House() {
  return (
    <section className="house" id="casa">
      <div className="container house__grid">
        <div className="house__intro">
          <h2>Una tienda para todo lo que tienes en mente.</h2>
          <p>
            Amott es una tienda online multirrubro. Queremos hacer más simple
            encontrar productos útiles para tu día a día, desde distintas
            categorías en un solo lugar.
          </p>
          <a className="house__place" href="mailto:hola@amott.shop">
            ¿Necesitas ayuda? Contáctanos.
          </a>
        </div>

        <dl className="principles">
          {principles.map((principle) => (
            <div className="principle" key={principle.title}>
              <dt>{principle.title}</dt>
              <dd>{principle.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
