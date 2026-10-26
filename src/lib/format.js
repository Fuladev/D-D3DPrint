const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const dec = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export const money = (v) => cop.format(Math.round(Number(v) || 0))
export const number = (v) => dec.format(Number(v) || 0)
export const percent = (v) => `${dec.format((Number(v) || 0) * 100)}%`

export function duration(hours) {
  const total = Math.round((Number(hours) || 0) * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}

export const today = () => new Date().toISOString().slice(0, 10)

export function dateLabel(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

