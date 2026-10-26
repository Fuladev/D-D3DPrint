import { useState } from 'react'
import { Empty, Field, Modal, NumberInput, ProductThumb, Stat } from '../components/ui.jsx'
import { dateLabel, money, today } from '../lib/format.js'
import { emptyStock, orderTotals } from '../lib/stock.js'
import { useStore } from '../store.jsx'

const STATUSES = [
  ['pendiente', 'Pendiente'],
  ['entregado', 'Entregado'],
  ['cancelado', 'Cancelado'],
]

export default function Orders() {
  const { orders, products, business, saveOrder, setOrderStatus, deleteOrder } = useStore()
  const [form, setForm] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(null)

  const q = query.trim().toLowerCase()
  const list = orders
    .filter((o) => filter === 'todos' || o.status === filter)
    .filter((o) => !q || o.client.toLowerCase().includes(q) || String(o.number).includes(q))
    .sort((a, b) => b.number - a.number)

  const sum = (status) => orders.filter((o) => o.status === status).reduce((s, o) => s + orderTotals(o).total, 0)

  // jsPDF is heavy, so the invoice module loads only when a PDF is needed.
  const download = async (o) => {
    const { buildInvoice, invoiceFileName } = await import('../lib/invoice.js')
    const doc = await buildInvoice(o, business, products)
    doc.save(invoiceFileName(o))
  }

  const share = async (o) => {
    setBusy(o.id)
    try {
      const { sendInvoice } = await import('../lib/invoice.js')
      await sendInvoice(o, business, products)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Pedidos</h1>
          <p className="muted">Arma pedidos con tus productos, genera la factura y envíala por WhatsApp.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})} disabled={!products.length}>
          ＋ Nuevo pedido
        </button>
      </div>

      <div className="stats">
        <Stat label="Pedidos" value={orders.length} />
        <Stat label="Por cobrar (pendientes)" value={money(sum('pendiente'))} tone="amber" />
        <Stat label="Vendido (entregados)" value={money(sum('entregado'))} tone="green" />
      </div>

      {!products.length && !orders.length ? (
        <Empty icon="🧾" title="Primero crea tus productos">
          <p>Los pedidos se arman seleccionando productos de tu catálogo.</p>
        </Empty>
      ) : orders.length === 0 ? (
        <Empty icon="🧾" title="Sin pedidos todavía">
          <button className="btn btn-primary" onClick={() => setForm({})}>Crear el primer pedido</button>
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <input className="search" placeholder="🔎 Buscar por cliente o N.º…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="segmented">
              {[['todos', 'Todos'], ...STATUSES].map(([k, l]) => (
                <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="order-list">
            {list.map((o) => {
              const t = orderTotals(o)
              const units = o.items.reduce((s, i) => s + Number(i.qty), 0)
              return (
                <article key={o.id} className={`order-card status-${o.status}`}>
                  <div className="order-main">
                    <div>
                      <span className="order-number">#{String(o.number).padStart(4, '0')}</span>
                      <h3>{o.client}</h3>
                      <span className="muted small">
                        {dateLabel(o.date)} · {units} unidades{o.phone ? ` · ${o.phone}` : ''}
                      </span>
                    </div>
                    <div className="order-total">{money(t.total)}</div>
                  </div>
                  <ul className="order-items">
                    {o.items.map((i, idx) => (
                      <li key={idx}>
                        <ProductThumb product={products.find((p) => p.id === i.productId) || { name: i.name }} size={24} />
                        {i.qty} × {i.name}
                      </li>
                    ))}
                  </ul>
                  <div className="order-actions">
                    <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)} aria-label="Estado">
                      {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <button className="btn small btn-whatsapp" onClick={() => share(o)} disabled={busy === o.id}>
                      {busy === o.id ? 'Generando…' : '📲 WhatsApp'}
                    </button>
                    <button className="btn small" onClick={() => download(o)}>
                      📄 PDF
                    </button>
                    <button className="btn small" onClick={() => setForm(o)}>Editar</button>
                    <button
                      className="btn btn-ghost small danger"
                      onClick={() => confirm(`¿Eliminar el pedido #${o.number} de ${o.client}?`) && deleteOrder(o.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {form && (
        <OrderForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={async (o) => {
            if (await saveOrder(o)) setForm(null)
          }}
        />
      )}
    </div>
  )
}

function OrderForm({ initial, onSave, onClose }) {
  const { products, stock, orders } = useStore()
  const [o, setO] = useState({
    client: '',
    phone: '',
    date: today(),
    status: 'pendiente',
    discount: 0,
    shipping: 0,
    note: '',
    items: [],
    ...initial,
  })
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (v) => setO((s) => ({ ...s, [k]: v }))
  const clients = [...new Map(orders.map((x) => [x.client, x.phone])).entries()]

  const add = (p) =>
    setO((s) => {
      const idx = s.items.findIndex((i) => i.productId === p.id)
      if (idx >= 0) return { ...s, items: s.items.map((i, n) => (n === idx ? { ...i, qty: Number(i.qty) + 1 } : i)) }
      return { ...s, items: [...s.items, { productId: p.id, name: p.name, qty: 1, price: p.price }] }
    })
  const setItem = (idx, k, v) => setO((s) => ({ ...s, items: s.items.map((i, n) => (n === idx ? { ...i, [k]: v } : i)) }))
  const remove = (idx) => setO((s) => ({ ...s, items: s.items.filter((_, n) => n !== idx) }))

  // Units of this order already counted as sold, so editing a delivered order doesn't double count.
  const ownSold = (productId) =>
    initial.status === 'entregado' ? (initial.items || []).filter((i) => i.productId === productId).reduce((s, i) => s + Number(i.qty), 0) : 0
  const available = (productId) => (stock[productId] || emptyStock).stock + ownSold(productId)

  const q = query.trim().toLowerCase()
  const catalog = products.filter((p) => p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
  const t = orderTotals(o)

  const submit = (e) => {
    e.preventDefault()
    if (!o.client.trim()) return setError('Escribe el nombre del cliente.')
    const items = o.items.filter((i) => Number(i.qty) > 0).map((i) => ({ ...i, qty: Number(i.qty), price: Number(i.price) || 0 }))
    if (!items.length) return setError('Agrega al menos un producto.')
    setSaving(true)
    Promise.resolve(onSave({ ...o, client: o.client.trim(), items, discount: Number(o.discount) || 0, shipping: Number(o.shipping) || 0 })).finally(() =>
      setSaving(false),
    )
  }

  return (
    <Modal
      wide
      title={initial.id ? `Editar pedido #${initial.number}` : 'Nuevo pedido'}
      onClose={onClose}
      footer={
        <>
          <span className="footer-total">Total: <strong>{money(t.total)}</strong></span>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" form="order-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar pedido'}
          </button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} className="order-form">
        <div className="form-grid">
          <Field label="Nombre del cliente">
            <input
              list="clients"
              value={o.client}
              autoFocus
              onChange={(e) => {
                const client = e.target.value
                const known = clients.find(([c]) => c === client)
                setO((s) => ({ ...s, client, phone: known && !s.phone ? known[1] : s.phone }))
              }}
              placeholder="Ej: Danna Fula"
            />
            <datalist id="clients">{clients.map(([c]) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="WhatsApp del cliente" hint="Ej: 300 123 4567">
            <input type="tel" value={o.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="300 123 4567" />
          </Field>
          <Field label="Fecha">
            <input type="date" value={o.date} onChange={(e) => set('date')(e.target.value)} />
          </Field>
          <Field label="Estado" hint="Al marcar “Entregado” se descuenta del stock.">
            <select value={o.status} onChange={(e) => set('status')(e.target.value)}>
              {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>

        <div className="order-columns">
          <section>
            <h3>Selecciona productos</h3>
            <input className="search" placeholder="🔎 Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="picker">
              {catalog.map((p) => {
                const inOrder = o.items.find((i) => i.productId === p.id)
                return (
                  <button type="button" key={p.id} className={`pick ${inOrder ? 'pick-active' : ''}`} onClick={() => add(p)}>
                    <ProductThumb product={p} size={44} />
                    <span className="pick-name">{p.name}</span>
                    <span className="pick-meta">{money(p.price)} · {available(p.id)} disp.</span>
                    {inOrder && <span className="pick-qty">{inOrder.qty}</span>}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <h3>Detalle del pedido</h3>
            {o.items.length === 0 ? (
              <p className="muted">Toca un producto para agregarlo.</p>
            ) : (
              <div className="items">
                {o.items.map((i, idx) => {
                  const product = products.find((p) => p.id === i.productId)
                  const short = product && Number(i.qty) > available(i.productId)
                  return (
                    <div key={idx} className="item-row">
                      <ProductThumb product={product || { name: i.name }} size={36} />
                      <div className="item-info">
                        <strong>{i.name}</strong>
                        {short && <span className="warn small">Solo hay {available(i.productId)} en stock</span>}
                      </div>
                      <div className="qty">
                        <button type="button" onClick={() => setItem(idx, 'qty', Math.max(1, Number(i.qty) - 1))}>−</button>
                        <NumberInput value={i.qty} onChange={(v) => setItem(idx, 'qty', v)} min="1" step="1" aria-label="Cantidad" />
                        <button type="button" onClick={() => setItem(idx, 'qty', Number(i.qty) + 1)}>＋</button>
                      </div>
                      <span className="with-suffix item-price">
                        <NumberInput value={i.price} onChange={(v) => setItem(idx, 'price', v)} min="0" aria-label="Precio unitario" />
                      </span>
                      <span className="item-sub">{money((Number(i.qty) || 0) * (Number(i.price) || 0))}</span>
                      <button type="button" className="icon-btn" onClick={() => remove(idx)} aria-label="Quitar">✕</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="form-grid totals-grid">
              <Field label="Descuento" suffix="COP"><NumberInput value={o.discount} onChange={set('discount')} min="0" /></Field>
              <Field label="Envío" suffix="COP"><NumberInput value={o.shipping} onChange={set('shipping')} min="0" /></Field>
            </div>
            <dl className="breakdown">
              <div className="row"><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
              {t.discount > 0 && <div className="row"><dt>Descuento</dt><dd>− {money(t.discount)}</dd></div>}
              {t.shipping > 0 && <div className="row"><dt>Envío</dt><dd>{money(t.shipping)}</dd></div>}
              <div className="row row-strong"><dt>Total del pedido</dt><dd>{money(t.total)}</dd></div>
            </dl>
            <Field label="Notas (salen en la factura)">
              <textarea rows="2" value={o.note} onChange={(e) => set('note')(e.target.value)} placeholder="Colores, fecha de entrega, abono…" />
            </Field>
          </section>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </Modal>
  )
}
