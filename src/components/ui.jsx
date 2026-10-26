import { useEffect } from 'react'

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, suffix }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={suffix ? 'field-input with-suffix' : 'field-input'}>
        {children}
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

// Numeric input that keeps the raw text while typing so values like "0," or "" are editable.
export function NumberInput({ value, onChange, percent, ...props }) {
  const shown = percent ? round(Number(value) * 100) : value
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      value={shown === 0 || shown ? shown : ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange('')
        const n = Number(raw)
        onChange(percent ? n / 100 : n)
      }}
      {...props}
    />
  )
}

const round = (n) => (Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : '')

export function ProductThumb({ product, size = 48 }) {
  const style = { width: size, height: size }
  if (product?.image) return <img className="thumb" src={product.image} alt="" style={style} />
  const letter = (product?.name || '?').trim().charAt(0).toUpperCase()
  return (
    <span className="thumb thumb-empty" style={{ ...style, fontSize: size * 0.42 }}>
      {letter}
    </span>
  )
}

export function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}
