import { useRef, useState } from 'react'
import { duration, money, number } from '../lib/format.js'
import { fileToThumbnail } from '../lib/image.js'
import { perUnit } from '../lib/stock.js'
import { Field, Modal, NumberInput, ProductThumb } from './ui.jsx'

export const EMPTY_PRODUCT = {
  name: '',
  image: '',
  hours: 0,
  minutes: 0,
  grams: 0,
  piecesPerBed: 1,
  costPerBed: 0,
  bedPrice: 0,
  price: 0,
  notes: '',
}

export default function ProductForm({ initial, onSave, onClose, allowInitialStock = true }) {
  const [p, setP] = useState({ ...EMPTY_PRODUCT, ...initial })
  const [initialStock, setInitialStock] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (v) => setP((s) => ({ ...s, [k]: v }))
  const isNew = !initial?.id
  const unit = perUnit(p)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setP((s) => ({ ...s, image: '' }))
      const image = await fileToThumbnail(file)
      setP((s) => ({ ...s, image }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const submit = (e) => {
    e.preventDefault()
    if (!p.name.trim()) return setError('El producto necesita un nombre.')
    const clean = { ...p, name: p.name.trim() }
    for (const k of ['hours', 'minutes', 'grams', 'piecesPerBed', 'costPerBed', 'bedPrice', 'price']) clean[k] = Number(clean[k]) || 0
    if (clean.piecesPerBed < 1) clean.piecesPerBed = 1
    onSave(clean, isNew && allowInitialStock ? Number(initialStock) || 0 : 0)
  }

  return (
    <Modal
      title={isNew ? 'Nuevo producto' : 'Editar producto'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="product-form" className="btn btn-primary">Guardar producto</button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="form-grid">
        <div className="image-picker span-2">
          <ProductThumb product={p} size={96} />
          <div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <button type="button" className="btn" onClick={() => fileRef.current.click()}>
              📷 {p.image ? 'Cambiar imagen' : 'Agregar imagen de referencia'}
            </button>
            {p.image && (
              <button type="button" className="btn btn-ghost" onClick={() => set('image')('')}>Quitar</button>
            )}
            <p className="field-hint">Se usa como ícono del producto y en la factura.</p>
          </div>
        </div>

        <div className="span-2">
          <Field label="Nombre del producto">
            <input value={p.name} onChange={(e) => set('name')(e.target.value)} autoFocus placeholder="Ej: Llavero Spider-Man" />
          </Field>
        </div>

        <Field label="Tiempo de impresión (horas)" hint="De la cama completa">
          <NumberInput value={p.hours} onChange={set('hours')} min="0" />
        </Field>
        <Field label="Minutos adicionales">
          <NumberInput value={p.minutes} onChange={set('minutes')} min="0" />
        </Field>
        <Field label="Gramos de filamento" hint="De la cama completa" suffix="g">
          <NumberInput value={p.grams} onChange={set('grams')} min="0" />
        </Field>
        <Field label="Piezas por impresión (cama)">
          <NumberInput value={p.piecesPerBed} onChange={set('piecesPerBed')} min="1" step="1" />
        </Field>

        <div className="info-box span-2">
          Por unidad: <strong>⏱ {duration(unit.hours)}</strong> · <strong>🧵 {number(unit.grams)} g</strong>
          {Number(p.piecesPerBed) > 1 && (
            <> — cama completa: {duration(unit.bedHours)} · {number(p.grams)} g</>
          )}
        </div>

        <Field label="Costo de la cama" hint="Lo que te cuesta producirla (de la calculadora)" suffix="COP">
          <NumberInput value={p.costPerBed} onChange={set('costPerBed')} min="0" />
        </Field>
        <Field label="Precio de venta por unidad" suffix="COP">
          <NumberInput value={p.price} onChange={set('price')} min="0" />
        </Field>

        {Number(p.costPerBed) > 0 && (
          <div className="info-box span-2">
            Costo por unidad: <strong>{money(p.costPerBed / Math.max(1, p.piecesPerBed))}</strong> · Ganancia por unidad:{' '}
            <strong>{money(p.price - p.costPerBed / Math.max(1, p.piecesPerBed))}</strong>
          </div>
        )}

        {isNew && allowInitialStock && (
          <Field label="Stock inicial (unidades ya impresas)">
            <NumberInput value={initialStock} onChange={setInitialStock} min="0" step="1" />
          </Field>
        )}

        <div className="span-2">
          <Field label="Notas">
            <textarea rows="2" value={p.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Color, material, archivo STL…" />
          </Field>
        </div>
        {error && <p className="error span-2">{error}</p>}
      </form>
    </Modal>
  )
}
