const notes = [
  {
    title: 'Explora por categoría',
    time: '01',
    body: 'Recorre los rubros disponibles y utiliza los filtros para encontrar rápidamente productos relacionados con lo que necesitas.',
  },
  {
    title: 'Revisa los detalles',
    time: '02',
    body: 'Consulta el nombre, la categoría, la marca y la información disponible de cada producto antes de añadirlo a tu bolsa.',
  },
  {
    title: '¿Tienes preguntas?',
    time: '03',
    body: 'Si necesitas más información para elegir, escríbenos a hola@amott.shop. Estamos aquí para ayudarte.',
  },
]

export function BuyingGuide() {
  return (
    <section className="notes" id="comprar">
      <div className="container">
        <div className="section-head section-head--notes">
          <h2>Tu compra, paso a paso</h2>
          <p>
            Encuentra lo que buscas y conoce la información disponible de cada
            producto antes de comprar.
          </p>
        </div>

        <div className="notes__grid">
          <article className="dispatch">
            <div>
              <h3>Encuentra tu próximo producto</h3>
              <p>
                En Amott reunimos categorías como automotriz, hogar,
                computación, electrónica, ferretería e iluminación, además de
                otros rubros que puedes explorar en la tienda.
              </p>
              <p>
                Compara los detalles disponibles y añade a tu bolsa los
                productos que quieras revisar antes de continuar.
              </p>
            </div>
            <p className="dispatch__meta">Amott · Tienda online multirrubro</p>
          </article>

          <div className="notes__list">
            {notes.map((note) => (
              <details className="note" key={note.title}>
                <summary>
                  <span>{note.title}</span>
                  <span className="note__time">{note.time}</span>
                </summary>
                <p>{note.body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
