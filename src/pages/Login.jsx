import { useState } from 'react'
import { Logo, ThemeToggle } from '../components/Brand.jsx'
import { Field } from '../components/ui.jsx'
import { supabase } from '../lib/supabase.js'

const MESSAGES = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Primero confirma tu correo con el enlace que te enviamos.',
  'User already registered': 'Ese correo ya tiene una cuenta. Inicia sesión.',
}

export default function Login({ theme, onToggleTheme }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
    setBusy(false)
    if (error) return setMessage({ type: 'error', text: MESSAGES[error.message] || error.message })
    if (mode === 'signup' && !data.session) {
      setMessage({ type: 'ok', text: 'Cuenta creada. Revisa tu correo y abre el enlace de confirmación; luego inicia sesión.' })
      setMode('login')
    }
  }

  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <form className="login-card" onSubmit={submit}>
        <Logo height={84} />
        <p className="muted center">Impresión 3D · calculadora, productos, pedidos y stock</p>
        <h1>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <Field label="Correo">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña" hint={mode === 'signup' ? 'Mínimo 6 caracteres.' : undefined}>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {message && <p className={message.type === 'error' ? 'error' : 'success'}>{message.text}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <p className="muted center small">
          {mode === 'login' ? '¿Primera vez? ' : '¿Ya tienes cuenta? '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null) }}>
            {mode === 'login' ? 'Crea tu cuenta' : 'Inicia sesión'}
          </button>
        </p>
        <p className="muted center small">Usa la misma cuenta en todos tus dispositivos para ver la misma información.</p>
      </form>
    </div>
  )
}
