import { useRef } from 'react'
import { Field } from '../components/ui.jsx'
import { today } from '../lib/format.js'
import { useStore } from '../store.jsx'

export default function Settings() {
  const { business, setBusiness, data, importData, resetAll } = useStore()
  const fileRef = useRef(null)
  const set = (k) => (e) => setBusiness({ ...business, [k]: e.target.value })

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `respaldo-3d-${today()}.json`
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
      if (confirm('Esto reemplaza todos los datos actuales por los del respaldo. ¿Continuar?')) importData(incoming)
    } catch {
      alert('El archivo no es un respaldo válido.')
    }
  }

  return (
    <div className="page narrow">
      <h1>Ajustes</h1>
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
        <h2>Respaldo</h2>
        <p className="muted">
          Los datos se guardan en este navegador. Descarga un respaldo de vez en cuando o para pasarlos a otro dispositivo.
        </p>
        <div className="actions-row">
          <button className="btn btn-primary" onClick={exportData}>⬇ Descargar respaldo</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          <button className="btn" onClick={() => fileRef.current.click()}>⬆ Restaurar respaldo</button>
          <button
            className="btn btn-ghost danger"
            onClick={() => confirm('¿Borrar TODOS los productos, pedidos y stock? No se puede deshacer.') && resetAll()}
          >
            Borrar todo
          </button>
        </div>
      </section>
    </div>
  )
}
