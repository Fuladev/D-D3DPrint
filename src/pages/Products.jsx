import { useState } from 'react'
import ProductForm from '../components/ProductForm.jsx'
import { Empty, ProductThumb } from '../components/ui.jsx'
import { duration, money, number } from '../lib/format.js'
import { emptyStock, perUnit } from '../lib/stock.js'
import { useStore } from '../store.jsx'

export default function Products({ goTo }) {
  const { products, stock, saveProduct, deleteProduct, loadSampleProducts, piece, setPiece } = useStore()
  const [form, setForm] = useState(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = products.filter((p) => p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))

  const recalc = (p) => {
    setPiece({ ...piece, hours: p.hours, minutes: p.minutes, grams: p.grams, piecesPerBed: p.piecesPerBed, productId: p.id })
    goTo('calculadora')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Productos</h1>
          <p className="muted">{products.length} productos en tu catálogo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({})}>＋ Nuevo producto</button>
      </div>

      {products.length === 0 ? (
        <Empty icon="📦" title="Aún no tienes productos">
          <p>Créalos desde la calculadora o con el botón “Nuevo producto”.</p>
          <button className="btn" onClick={loadSampleProducts}>Cargar los productos de mi Excel</button>
        </Empty>
      ) : (
        <>
          <input className="search" placeholder="🔎 Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="product-grid">
            {list.map((p) => {
              const unit = perUnit(p)
              const s = stock[p.id] || emptyStock
              return (
                <article key={p.id} className="product-card">
                  <div className="product-top">
                    <ProductThumb product={p} size={72} />
                    <div className="product-title">
                      <h3>{p.name}</h3>
                      <span className="price">{money(p.price)} <small>c/u</small></span>
                    </div>
                  </div>
                  <div className="specs">
                    <span title="Tiempo de impresión por unidad">⏱ {duration(unit.hours)}</span>
                    <span title="Filamento por unidad">🧵 {number(unit.grams)} g</span>
                    {p.piecesPerBed > 1 && (
                      <span className="muted small" title="Cama completa">
                        Cama de {p.piecesPerBed}: {duration(unit.bedHours)} · {number(p.grams)} g
                      </span>
                    )}
                  </div>
                  <div className="stock-line">
                    <span className={`badge ${s.stock <= 0 ? 'badge-red' : s.stock < 5 ? 'badge-amber' : 'badge-green'}`}>
                      {s.stock} en stock
                    </span>
                    <span className="muted small">{s.sold} vendidos</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn small" onClick={() => setForm(p)}>Editar</button>
                    <button className="btn small" onClick={() => recalc(p)}>Recalcular</button>
                    <button
                      className="btn btn-ghost small danger"
                      onClick={() => confirm(`¿Eliminar “${p.name}”? Se borra también su historial de producción.`) && deleteProduct(p.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {list.length === 0 && <p className="muted center">No hay productos que coincidan con “{query}”.</p>}
        </>
      )}

      {form && (
        <ProductForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={(p, initialStock) => {
            saveProduct(p, initialStock)
            setForm(null)
          }}
        />
      )}
    </div>
  )
}
