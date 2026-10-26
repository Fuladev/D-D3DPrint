import { useMemo, useState } from 'react'
import ProductForm from '../components/ProductForm.jsx'
import { Field, NumberInput } from '../components/ui.jsx'
import { calculate, DEFAULT_COSTS, MULTIPLIERS } from '../lib/calc.js'
import { duration, money, number, percent } from '../lib/format.js'
import { useStore } from '../store.jsx'

const COST_FIELDS = [
  ['filamentPerKg', 'Precio del filamento', 'COP/kg'],
  ['kwhPrice', 'Precio del kWh', 'COP'],
  ['printerWatts', 'Consumo de la impresora', 'W'],
  ['printerPrice', 'Precio de compra de la impresora', 'COP', 'Con 0 solo cuenta los repuestos.'],
  ['sparePartsCost', 'Costo de repuestos', 'COP'],
  ['machineLifeHours', 'Vida útil de la máquina', 'horas', 'Desgaste = (compra + repuestos) ÷ vida útil × horas.'],
  ['failureRate', 'Margen de error / fallas', '%', 'Se aplica a material + luz + desgaste.', true],
  ['laborPerHour', 'Valor de tu hora de trabajo', 'COP/h'],
  ['suppliesMarkup', 'Recargo sobre insumos', '%', null, true],
  ['platformFee', 'Comisión de la plataforma', '%', 'Ej: 20% de MercadoLibre.', true],
  ['platformFixedFee', 'Cargo fijo por venta en plataforma', 'COP'],
  ['roundTo', 'Redondear precio hacia arriba a múltiplos de', 'COP', 'Con 0 no redondea.'],
]

export default function Calculator({ goTo }) {
  const { costs, piece, products, setCosts, setPiece, saveProduct } = useStore()
  const [showCosts, setShowCosts] = useState(false)
  const [form, setForm] = useState(null)
  const r = useMemo(() => calculate(costs, piece), [costs, piece])
  const setC = (k) => (v) => setCosts({ ...costs, [k]: v })
  const setP = (k) => (v) => setPiece({ ...piece, [k]: v })
  const linked = products.find((p) => p.id === piece.productId)

  const productFromCalc = (base = {}) => ({
    ...base,
    hours: Number(piece.hours) || 0,
    minutes: Number(piece.minutes) || 0,
    grams: Number(piece.grams) || 0,
    piecesPerBed: Math.max(1, Number(piece.piecesPerBed) || 1),
    costPerBed: Math.round(r.totalCost),
    bedPrice: Math.round(r.price),
    price: Math.round(r.pricePerPiece || r.price),
  })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Calculadora</h1>
          <p className="muted">Precio de impresión 3D: costo real, ganancia y precio en plataforma.</p>
        </div>
      </div>

      <div className="calc-layout">
        <div className="stack">
          <section className="card">
            <button className="card-toggle" onClick={() => setShowCosts((s) => !s)} aria-expanded={showCosts}>
              <span>
                <h2>1. Gastos fijos</h2>
                <span className="muted small">
                  Filamento {money(costs.filamentPerKg)}/kg · kWh {money(costs.kwhPrice)} · {number(costs.printerWatts)} W · Mano de obra {money(costs.laborPerHour)}/h
                </span>
              </span>
              <span className="chevron">{showCosts ? '▴' : '▾'}</span>
            </button>
            {showCosts && (
              <>
                <div className="form-grid">
                  {COST_FIELDS.map(([k, label, suffix, hint, pct]) => (
                    <Field key={k} label={label} suffix={suffix} hint={hint}>
                      <NumberInput value={costs[k]} onChange={setC(k)} percent={pct} min="0" />
                    </Field>
                  ))}
                </div>
                <button className="btn btn-ghost small" onClick={() => confirm('¿Restaurar los gastos fijos originales del Excel?') && setCosts(DEFAULT_COSTS)}>
                  Restaurar valores del Excel
                </button>
              </>
            )}
          </section>

          <section className="card">
            <h2>2. La pieza / impresión</h2>
            {linked && (
              <p className="info-box">
                Recalculando <strong>{linked.name}</strong>.{' '}
                <button className="link" onClick={() => setPiece({ ...piece, productId: undefined })}>Desvincular</button>
              </p>
            )}
            <div className="form-grid">
              <Field label="Horas de impresión"><NumberInput value={piece.hours} onChange={setP('hours')} min="0" /></Field>
              <Field label="Minutos adicionales"><NumberInput value={piece.minutes} onChange={setP('minutes')} min="0" /></Field>
              <Field label="Gramos de filamento" suffix="g"><NumberInput value={piece.grams} onChange={setP('grams')} min="0" /></Field>
              <Field label="Piezas por impresión (cama)"><NumberInput value={piece.piecesPerBed} onChange={setP('piecesPerBed')} min="0" step="1" /></Field>
              <Field label="Minutos de preparación" hint="Laminar, acomodar cama"><NumberInput value={piece.prepMinutes} onChange={setP('prepMinutes')} min="0" /></Field>
              <Field label="Minutos de postproceso" hint="Quitar soportes, lijar"><NumberInput value={piece.postMinutes} onChange={setP('postMinutes')} min="0" /></Field>
              <Field label="Insumos extra" suffix="COP" hint="Pegante, empaque, etc."><NumberInput value={piece.supplies} onChange={setP('supplies')} min="0" /></Field>
            </div>
          </section>

          <section className="card">
            <h2>3. Margen de ganancia</h2>
            <div className="chips">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m.value}
                  className={`chip ${String(piece.customMultiplier).trim() === '' && Number(piece.multiplier) === m.value ? 'chip-active' : ''}`}
                  onClick={() => setPiece({ ...piece, multiplier: m.value, customMultiplier: '' })}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Multiplicador personalizado (opcional)" hint="Si escribes un número, se usa en lugar de la lista.">
                <input
                  inputMode="decimal"
                  value={piece.customMultiplier}
                  onChange={(e) => setP('customMultiplier')(e.target.value)}
                  placeholder="Ej: 2.8"
                />
              </Field>
              <div className="applied">
                Multiplicador aplicado <strong>×{number(r.multiplier)}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside className="stack results">
          <section className="card">
            <h2>4. Desglose de costos</h2>
            <dl className="breakdown">
              <Row label="Tiempo total" value={duration(r.totalHours)} />
              <Row label="Material" value={money(r.material)} />
              <Row label="Luz" value={money(r.electricity)} />
              <Row label="Desgaste de la máquina" value={money(r.wear)} />
              <Row label="Margen de error / fallas" value={money(r.failure)} />
              <Row label="Mano de obra" value={money(r.labor)} />
              <Row label="Insumos (+ recargo)" value={money(r.supplies)} />
              <Row label="Costo total (tu piso)" value={money(r.totalCost)} strong />
            </dl>
          </section>

          <section className="card card-accent">
            <h2>5. Precio a cobrar</h2>
            <div className="big-price">
              <span>Total venta directa</span>
              <strong>{money(r.price)}</strong>
            </div>
            <dl className="breakdown">
              <Row label="Ganancia" value={`${money(r.profit)} (${percent(r.profitPct)})`} />
              <Row label="Precio por pieza" value={money(r.pricePerPiece)} strong />
              <Row label="Precio en plataforma" value={money(r.platformPrice)} />
              <Row label="Neto después de plataforma" value={money(r.platformNet)} />
              <Row label="Precio por pieza en plataforma" value={money(r.platformPricePerPiece)} />
            </dl>
            <div className="actions-col">
              {linked && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    saveProduct(productFromCalc(linked))
                    goTo('productos')
                  }}
                >
                  Actualizar “{linked.name}”
                </button>
              )}
              <button className={linked ? 'btn' : 'btn btn-primary'} onClick={() => setForm(productFromCalc())}>
                ＋ Guardar como producto nuevo
              </button>
            </div>
          </section>
        </aside>
      </div>

      {form && (
        <ProductForm
          initial={form}
          onClose={() => setForm(null)}
          onSave={(p, stock) => {
            const id = saveProduct(p, stock)
            setPiece({ ...piece, productId: id })
            setForm(null)
            goTo('productos')
          }}
        />
      )}
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={strong ? 'row row-strong' : 'row'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
