// Stock is derived from movements: production adds, sales subtract, adjustments add or subtract.
export function stockSummary(movements) {
  const map = {}
  for (const m of movements) {
    const s = (map[m.productId] ??= { produced: 0, sold: 0, adjusted: 0 })
    if (m.type === 'entrada') s.produced += m.qty
    else if (m.type === 'venta') s.sold += m.qty
    else if (m.type === 'ajuste') s.adjusted += m.qty
  }
  for (const s of Object.values(map)) s.stock = s.produced + s.adjusted - s.sold
  return map
}

export const emptyStock = { produced: 0, sold: 0, adjusted: 0, stock: 0 }

// Per-unit print time (hours) and grams for a product whose data is per bed.
export function perUnit(product) {
  const pieces = Math.max(1, Number(product.piecesPerBed) || 1)
  const hours = (Number(product.hours) || 0) + (Number(product.minutes) || 0) / 60
  return { hours: hours / pieces, grams: (Number(product.grams) || 0) / pieces, bedHours: hours }
}

export function orderTotals(order) {
  const subtotal = order.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0)
  const discount = Math.min(subtotal, Number(order.discount) || 0)
  const shipping = Number(order.shipping) || 0
  return { subtotal, discount, shipping, total: subtotal - discount + shipping }
}
