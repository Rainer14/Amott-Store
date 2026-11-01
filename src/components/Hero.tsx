import { Link } from 'react-router-dom'
import { DinoMark } from './DinoMark'

export function Hero() {
  return (
    <section className="hero" id="nosotros">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 className="hero__title">
            <span>Todo lo que</span>
            <span>buscas, en un</span>
            <span>solo lugar.</span>
          </h1>
          <p className="hero__lede">
            En Amott encuentras productos para distintos espacios y necesidades:
            automotriz, hogar, computación, electrónica, ferretería, iluminación
            y mucho más.
          </p>
          <div className="hero__actions">
            <Link className="button button--solid" to="/">
              Explorar productos
            </Link>
            <Link className="button button--ghost" to="/nosotros#comprar">
              Cómo comprar
            </Link>
          </div>
          <p className="hero__small">
            Variedad para acompañarte en cada proyecto.
          </p>
        </div>

        <figure className="plate">
          <div className="plate__frame">
            <DinoMark tone="bone" className="plate__dino" />
          </div>
          <figcaption className="plate__caption">
            <span>La mascota de Amott</span>
            <span>Nuestro Triceratops</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
