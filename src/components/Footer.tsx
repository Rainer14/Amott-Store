import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-strata" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="container footer__inner">
        <div className="newsletter">
          <div>
            <h2>¿Buscas algo en particular?</h2>
            <p>
              Cuéntanos qué necesitas. Nuestro equipo puede orientarte sobre los
              productos disponibles.
            </p>
          </div>
          <a className="button button--solid" href="mailto:hola@amott.shop">
            Escríbenos
          </a>
        </div>

        <div className="footer__columns">
          <div className="footer__brand">
            <Logo tone="bone" />
            <p>
              Una tienda online multirrubro con productos para tu hogar, tus
              proyectos y tu día a día.
            </p>
          </div>

          <nav className="footer__nav" aria-label="Enlaces del pie">
            <div>
              <h3>Explorar</h3>
              <Link to="/">Tienda</Link>
              <Link to="/nosotros">Sobre nosotros</Link>
              <Link to="/nosotros#comprar">Guía de compra</Link>
              <Link to="/nosotros#casa">Nuestra tienda</Link>
            </div>
            <div>
              <h3>Contacto</h3>
              <a href="mailto:hola@amott.shop">hola@amott.shop</a>
              <a href="mailto:hola@amott.shop?subject=Consulta%20sobre%20env%C3%ADos">
                Consultas sobre envíos
              </a>
            </div>
          </nav>
        </div>

        <div className="footer__bottom">
          <p>© 2026 Amott. Tienda online multirrubro.</p>
          <p>Precios en USD.</p>
        </div>
      </div>
    </footer>
  )
}
