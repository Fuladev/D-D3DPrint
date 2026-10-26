import { useState } from 'react'
import { Empty, Field, Modal, NumberInput, ProductThumb, Stat } from '../components/ui.jsx'
import { dateLabel, duration, money, number, today } from '../lib/format.js'
import { emptyStock, perUnit, salesHistory } from '../lib/stock.js'
import { useStore } from '../store.jsx'

const TYPES = { entrada: 'Producción', venta: 'Venta', ajuste: 'Ajuste' }
const isCounterSale = (m) => m.type === 'venta' && !m.orderId

export default function Stock() {
  const { products, orders, stock, movements, addMovement, deleteMovement } = useStore()
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
  const counterSales = movements.filter(isCounterSale).reduce((t, m) => t + m.qty * (m.price || 0), 0)
  const history = [...movements, ...salesHistory(orders)].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 100)

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
          <p className="muted">Lo que hay en bodega y lo que se ha vendido. Las ventas se descuentan al marcar un pedido como entregado o al registrar una venta de mostrador.</p>
        </div>
        <div className="actions-row">
          <button className="btn btn-primary" onClick={() => setEntry({ type: 'venta' })}>🛒 Venta mostrador</button>
          <button className="btn" onClick={() => setEntry({ type: 'entrada' })}>＋ Registrar producción</button>
        </div>
      </div>

      <div className="stats">
        <Stat label="Unidades en stock" value={number(units)} />
        <Stat label="Valor del inventario" value={money(value)} tone="green" />
        <Stat label="Unidades vendidas" value={number(sold)} />
        <Stat label="Ventas de mostrador" value={money(counterSales)} tone="green" />
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
                    <button className="btn small btn-primary" onClick={() => setEntry({ type: 'venta', productId: p.id })}>🛒 Vender</button>
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
                <span className={`badge badge-${m.type}`}>{isCounterSale(m) ? 'Mostrador' : m.orderId ? 'Pedido' : TYPES[m.type]}</span>
                <span className="move-name">{byId[m.productId]?.name || 'Producto eliminado'}</span>
                <span className="muted small">
                  {dateLabel(m.date)}
                  {isCounterSale(m) && m.price ? ` · ${money(m.qty * m.price)}` : ''}
                  {m.note ? ` · ${m.note}` : ''}
                </span>
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
          stock={stock}
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

function MovementForm({ initial, products, stock, onSave, onClose }) {
  const isSale = initial.type === 'venta'
  const isAdjust = initial.type === 'ajuste'
  const first = initial.productId ? products.find((p) => p.id === initial.productId) : products[0]
  const [m, setM] = useState({ productId: first?.id, qty: isSale ? 1 : '', price: first?.price ?? 0, date: today(), note: '', ...initial })
  const [beds, setBeds] = useState('')
  const product = products.find((p) => p.id === m.productId)
  const available = (stock[m.productId] || emptyStock).stock
  const set = (k) => (v) => setM((s) => ({ ...s, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    const qty = Number(m.qty)
    if (!m.productId || !qty || (!isAdjust && qty < 0)) return
    const { price, ...rest } = m
    onSave(isSale ? { ...rest, qty, price: Number(price) || 0 } : { ...rest, qty })
  }

  const title = isSale ? 'Venta de mostrador' : isAdjust ? 'Ajuste de inventario' : 'Registrar producción'
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {isSale && <span className="footer-total">Total: <strong>{money((Number(m.qty) || 0) * (Number(m.price) || 0))}</strong></span>}
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="move-form" className="btn btn-primary">{isSale ? 'Registrar venta' : 'Guardar'}</button>
        </>
      }
    >
      <form id="move-form" onSubmit={submit} className="form-grid">
        {isSale && <p className="info-box span-2">Venta directa sin factura: se descuenta del stock y cuenta como vendido.</p>}
        <div className="span-2">
          <Field label="Producto">
            <select
              value={m.productId}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value)
                setM((s) => ({ ...s, productId: e.target.value, price: isSale ? p?.price ?? 0 : s.price }))
              }}
            >
              {[...products].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        {!isSale && !isAdjust && product?.piecesPerBed > 1 && (
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
        <Field
          label={isSale ? 'Unidades vendidas' : isAdjust ? 'Cantidad (+ suma, − resta)' : 'Unidades producidas'}
          hint={isSale ? `${available} en stock` : isAdjust ? 'Ej: −2 por piezas dañadas' : undefined}
        >
          <NumberInput value={m.qty} onChange={set('qty')} step="1" min={isAdjust ? undefined : '1'} autoFocus />
        </Field>
        {isSale && (
          <Field label="Precio por unidad" suffix="COP">
            <NumberInput value={m.price} onChange={set('price')} min="0" />
          </Field>
        )}
        {isSale && Number(m.qty) > available && <p className="warn span-2">Estás vendiendo más de lo que hay en stock ({available}).</p>}
        <Field label="Fecha">
          <input type="date" value={m.date} onChange={(e) => set('date')(e.target.value)} />
        </Field>
        <Field label="Nota">
          <input value={m.note} onChange={(e) => set('note')(e.target.value)} placeholder={isSale ? 'Cliente, medio de pago… (opcional)' : isAdjust ? 'Motivo del ajuste' : 'Opcional'} />
        </Field>
      </form>
    </Modal>
  )
}
