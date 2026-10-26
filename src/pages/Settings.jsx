import { useRef, useState } from 'react'
import { Field } from '../components/ui.jsx'
import { today } from '../lib/format.js'
import { supabase } from '../lib/supabase.js'
import { LEGACY_KEY, useStore } from '../store.jsx'

const readLegacy = () => {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function Settings() {
  const { business, setBusiness, data, importData, resetAll, session } = useStore()
  const fileRef = useRef(null)
  const [legacy, setLegacy] = useState(readLegacy)
  const set = (k) => (e) => setBusiness({ ...business, [k]: e.target.value })

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `respaldo-dd-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const incoming = JSON.parse(await file.text())
      if (!Array.isArray(incoming.products)) throw new Error()
      if (confirm(`Se agregarán ${incoming.products.length} productos y ${incoming.orders?.length || 0} pedidos a tu cuenta. ¿Continuar?`)) {
        importData(incoming)
      }
    } catch {
      alert('El archivo no es un respaldo válido.')
    }
  }

  const importLegacy = async () => {
    if (!confirm(`Se subirán a la nube ${legacy.products?.length || 0} productos y ${legacy.orders?.length || 0} pedidos guardados en este navegador. ¿Continuar?`)) return
    if (await importData(legacy)) {
      try {
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        // nothing else to clean up
      }
      setLegacy(null)
    }
  }

  return (
    <div className="page narrow">
      <h1>Ajustes</h1>

      {legacy && (legacy.products?.length > 0 || legacy.orders?.length > 0) && (
        <section className="card card-accent">
          <h2>Datos guardados en este navegador</h2>
          <p className="muted">
            Encontramos {legacy.products?.length || 0} productos y {legacy.orders?.length || 0} pedidos de la versión anterior (sin nube).
          </p>
          <button className="btn btn-primary" onClick={importLegacy}>☁️ Subirlos a mi cuenta</button>
        </section>
      )}

      <section className="card">
        <h2>Datos del negocio (salen en la factura)</h2>
        <div className="form-grid">
          <Field label="Nombre del negocio"><input value={business.name} onChange={set('name')} /></Field>
          <Field label="Teléfono / WhatsApp"><input value={business.phone} onChange={set('phone')} /></Field>
          <div className="span-2"><Field label="Dirección / Instagram / correo"><input value={business.address} onChange={set('address')} /></Field></div>
          <div className="span-2"><Field label="Mensaje al pie de la factura"><input value={business.footer} onChange={set('footer')} /></Field></div>
        </div>
      </section>

      <section className="card">
        <h2>Cuenta</h2>
        <p className="muted">
          Conectado como <strong>{session.user.email}</strong>. Tus datos se guardan en la nube y se ven en cualquier dispositivo donde entres con esta cuenta.
        </p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </section>

      <section className="card">
        <h2>Respaldo</h2>
        <p className="muted">Descarga una copia de toda tu información o agrega la de un respaldo anterior.</p>
        <div className="actions-row">
          <button className="btn btn-primary" onClick={exportData}>⬇ Descargar respaldo</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          <button className="btn" onClick={() => fileRef.current.click()}>⬆ Importar respaldo</button>
          <button
            className="btn btn-ghost danger"
            onClick={() => confirm('¿Borrar TODOS los productos, pedidos y stock de tu cuenta? No se puede deshacer.') && resetAll()}
          >
            Borrar todo
          </button>
        </div>
      </section>
    </div>
  )
}
