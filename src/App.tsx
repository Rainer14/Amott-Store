import { useEffect } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { CartProvider } from './cart/CartProvider'
import { CartDrawer } from './components/CartDrawer'
import { CartToast } from './components/CartToast'
import { Collection } from './components/Collection'
import { BuyingGuide } from './components/BuyingGuide'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { House } from './components/House'
import { ProductsProvider } from './data/ProductsProvider'
import './App.css'

function ScrollToLocation() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}

function AboutPage() {
  return (
    <>
      <Hero />
      <BuyingGuide />
      <House />
    </>
  )
}

function App() {
  return (
    <ProductsProvider>
      <CartProvider>
        <ScrollToLocation />
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <Header />
        <main id="main">
          <Routes>
            <Route path="/" element={<Collection />} />
            <Route path="/nosotros" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <CartDrawer />
        <CartToast />
      </CartProvider>
    </ProductsProvider>
  )
}

export default App
