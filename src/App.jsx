import { useEffect, useState } from 'react'
import { Logo, ThemeToggle } from './components/Brand.jsx'
import { supabase } from './lib/supabase.js'
import { useTheme } from './lib/theme.js'
import Calculator from './pages/Calculator.jsx'
import Login from './pages/Login.jsx'
import Orders from './pages/Orders.jsx'
import Products from './pages/Products.jsx'
import Settings from './pages/Settings.jsx'
import Stock from './pages/Stock.jsx'
import { StoreProvider, useStore } from './store.jsx'

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
  const [theme, toggleTheme] = useTheme()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (!session) return <Login theme={theme} onToggleTheme={toggleTheme} />
  return (
    <StoreProvider key={session.user.id} session={session}>
      <Shell theme={theme} onToggleTheme={toggleTheme} />
    </StoreProvider>
  )
}

function Shell({ theme, onToggleTheme }) {
  const { status, refresh } = useStore()
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
        <a href="#calculadora" className="brand" aria-label="D&D – inicio">
          <Logo height={34} />
        </a>
        <nav className="tabs">
          {TABS.map(([k, icon, label]) => (
            <a key={k} href={`#${k}`} className={tab === k ? 'active' : ''}>
              <span className="tab-icon">{icon}</span>
              <span className="tab-label">{label}</span>
            </a>
          ))}
        </nav>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>
      <main>
        {status === 'loading' && <Splash inline />}
        {status === 'error' && (
          <div className="empty">
            <div className="empty-icon">⚠️</div>
            <h3>No se pudo conectar con la nube</h3>
            <p className="muted">Revisa tu conexión a internet.</p>
            <button className="btn btn-primary" onClick={() => refresh(true)}>Reintentar</button>
          </div>
        )}
        {status === 'ready' && <Page goTo={goTo} />}
      </main>
    </div>
  )
}

function Splash({ inline }) {
  return (
    <div className={inline ? 'splash splash-inline' : 'splash'}>
      <Logo height={inline ? 48 : 72} />
      <span className="muted">Cargando…</span>
    </div>
  )
}
