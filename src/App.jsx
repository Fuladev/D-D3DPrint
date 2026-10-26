import { useEffect, useState } from 'react'
import Calculator from './pages/Calculator.jsx'
import Orders from './pages/Orders.jsx'
import Products from './pages/Products.jsx'
import Settings from './pages/Settings.jsx'
import Stock from './pages/Stock.jsx'

const TABS = [
  ['calculadora', '🧮', 'Calculadora', Calculator],
  ['productos', '📦', 'Productos', Products],
  ['pedidos', '🧾', 'Pedidos', Orders],
  ['stock', '📊', 'Stock', Stock],
  ['ajustes', '⚙️', 'Ajustes', Settings],
]

const fromHash = () => {
  const h = window.location.hash.slice(1)
  return TABS.some(([k]) => k === h) ? h : 'calculadora'
}

export default function App() {
  const [tab, setTab] = useState(fromHash)

  useEffect(() => {
    const onHash = () => setTab(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goTo = (key) => {
    window.location.hash = key
    window.scrollTo(0, 0)
  }
  const Page = TABS.find(([k]) => k === tab)[3]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🧊 <span>Calculadora 3D <b>PRO</b></span></div>
        <nav className="tabs">
          {TABS.map(([k, icon, label]) => (
            <a key={k} href={`#${k}`} className={tab === k ? 'active' : ''}>
              <span className="tab-icon">{icon}</span>
              <span className="tab-label">{label}</span>
            </a>
          ))}
        </nav>
      </header>
      <main>
        <Page goTo={goTo} />
      </main>
    </div>
  )
}
