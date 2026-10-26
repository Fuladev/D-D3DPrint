import { useState } from 'react'
import { Empty, Field, Modal, NumberInput, ProductThumb, Stat } from '../components/ui.jsx'
import { dateLabel, duration, money, number, today } from '../lib/format.js'
import { emptyStock, perUnit } from '../lib/stock.js'
import { useStore } from '../store.jsx'

const TYPES = { entrada: 'Producción', venta: 'Venta', ajuste: 'Ajuste' }

export default function Stock() {
  const { products, stock, movements, addMovement, deleteMovement } = useStore()
  const [entry, setEntry] = useState(null)
  const [query, setQuery] = useState('')
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))

  const rows = products
    .map((p) => ({ p, s: stock[p.id] || emptyStock }))
    .filter(({ p }) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.p.name.localeCompare(b.p.name))

  const all = products.map((p) => ({ p, s: stock[p.id] || emptyStock }))
  const units = all.reduce((t, { s }) => t + Math.max(0, s.stock), 0)
  const value = all.reduce((t, { p, s }) => t + Math.max(0, s.stock) * p.price, 0)
  const sold = all.reduce((t, { s }) => t + s.sold, 0)
  const out = all.filter(({ s }) => s.stock <= 0).length
  const history = [...movements].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 100)

  if (!products.length) {
    return (
      <div className="page">
        <h1>Stock</h1>
        <Empty icon="📊" title="No hay productos">
          <p>Crea productos para llevar el control de inventario.</p>
        </Empty>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Stock</h1>
          <p className="muted">Lo que hay en bodega y lo que se ha vendido. Las ventas se descuentan al marcar un pedido como entregado.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEntry({ type: 'entrada' })}>＋ Registrar producción</button>
      </div>

      <div className="stats">
        <Stat label="Unidades en stock" value={number(units)} />
        <Stat label="Valor del inventario" value={money(value)} tone="green" />
        <Stat label="Unidades vendidas" value={number(sold)} />
        <Stat label="Productos agotados" value={out} tone={out ? 'red' : undefined} />
      </div>

      <input className="search" placeholder="🔎 Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Producido</th>
              <th className="num">Ajustes</th>
              <th className="num">Vendido</th>
              <th className="num">En stock</th>
              <th className="num hide-sm">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, s }) => {
              const u = perUnit(p)
              return (
                <tr key={p.id}>
                  <td>
                    <div className="cell-product">
                      <ProductThumb product={p} size={36} />
                      <div>
                        <strong>{p.name}</strong>
                        <span className="muted small">⏱ {duration(u.hours)} · 🧵 {number(u.grams)} g c/u</span>
                      </div>
                    </div>
                  </td>
                  <td className="num">{s.produced}</td>
                  <td className="num">{s.adjusted > 0 ? `+${s.adjusted}` : s.adjusted}</td>
                  <td className="num">{s.sold}</td>
                  <td className="num">
                    <span className={`badge ${s.stock <= 0 ? 'badge-red' : s.stock < 5 ? 'badge-amber' : 'badge-green'}`}>{s.stock}</span>
                  </td>
                  <td className="num hide-sm">{money(Math.max(0, s.stock) * p.price)}</td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => setEntry({ type: 'entrada', productId: p.id })}>＋ Producir</button>
                    <button className="btn btn-ghost small" onClick={() => setEntry({ type: 'ajuste', productId: p.id })}>Ajustar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <section className="card">
        <h2>Movimientos</h2>
        {history.length === 0 ? (
          <p className="muted">Todavía no hay movimientos.</p>
        ) : (
          <ul className="moves">
            {history.map((m) => (
              <li key={m.id}>
                <span className={`badge badge-${m.type}`}>{TYPES[m.type]}</span>
                <span className="move-name">{byId[m.productId]?.name || 'Producto eliminado'}</span>
                <span className="muted small">{dateLabel(m.date)}{m.note ? ` · ${m.note}` : ''}</span>
                <strong className={m.type === 'venta' || m.qty < 0 ? 'neg' : 'pos'}>
                  {m.type === 'venta' ? `−${m.qty}` : m.qty > 0 ? `+${m.qty}` : m.qty}
                </strong>
                {m.orderId ? (
                  <span className="icon-btn" title="Se elimina cambiando el estado del pedido" />
                ) : (
                  <button className="icon-btn" onClick={() => confirm('¿Eliminar este movimiento?') && deleteMovement(m.id)} aria-label="Eliminar movimiento">✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {entry && (
        <MovementForm
          initial={entry}
          products={products}
          onClose={() => setEntry(null)}
          onSave={(m) => {
            addMovement(m)
            setEntry(null)
          }}
        />
      )}
    </div>
  )
}

function MovementForm({ initial, products, onSave, onClose }) {
  const [m, setM] = useState({ productId: products[0]?.id, qty: '', date: today(), note: '', ...initial })
  const [beds, setBeds] = useState('')
  const product = products.find((p) => p.id === m.productId)
  const isAdjust = m.type === 'ajuste'
  const set = (k) => (v) => setM((s) => ({ ...s, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    const qty = Number(m.qty)
    if (!m.productId || !qty || (!isAdjust && qty < 0)) return
    onSave({ ...m, qty })
  }

  return (
    <Modal
      title={isAdjust ? 'Ajuste de inventario' : 'Registrar producción'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="move-form" className="btn btn-primary">Guardar</button>
        </>
      }
    >
      <form id="move-form" onSubmit={submit} className="form-grid">
        <div className="span-2">
          <Field label="Producto">
            <select value={m.productId} onChange={(e) => set('productId')(e.target.value)}>
              {[...products].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        {!isAdjust && product?.piecesPerBed > 1 && (
          <Field label="Camas impresas" hint={`${product.piecesPerBed} piezas por cama`}>
            <NumberInput
              value={beds}
              min="0"
              step="1"
              onChange={(v) => {
                setBeds(v)
                set('qty')(v === '' ? '' : Number(v) * product.piecesPerBed)
              }}
            />
          </Field>
        )}
        <Field label={isAdjust ? 'Cantidad (+ suma, − resta)' : 'Unidades producidas'} hint={isAdjust ? 'Ej: −2 por piezas dañadas' : undefined}>
          <NumberInput value={m.qty} onChange={set('qty')} step="1" min={isAdjust ? undefined : '1'} autoFocus />
        </Field>
        <Field label="Fecha">
          <input type="date" value={m.date} onChange={(e) => set('date')(e.target.value)} />
        </Field>
        <Field label="Nota">
          <input value={m.note} onChange={(e) => set('note')(e.target.value)} placeholder={isAdjust ? 'Motivo del ajuste' : 'Opcional'} />
        </Field>
      </form>
    </Modal>
  )
}
