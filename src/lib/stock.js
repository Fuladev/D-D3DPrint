// Stock = production + adjustments (movements) − units of delivered orders.
export function stockSummary(movements, orders) {
  const map = {}
  const get = (id) => (map[id] ??= { produced: 0, sold: 0, adjusted: 0 })
  for (const m of movements) {
    if (m.type === 'entrada') get(m.productId).produced += m.qty
    else if (m.type === 'ajuste') get(m.productId).adjusted += m.qty
  }
  for (const o of orders) {
    if (o.status !== 'entregado') continue
    for (const i of o.items) if (i.productId) get(i.productId).sold += Number(i.qty) || 0
  }
  for (const s of Object.values(map)) s.stock = s.produced + s.adjusted - s.sold
  return map
}

// Sales from delivered orders, shaped like movements for the history list.
export function salesHistory(orders) {
  return orders
    .filter((o) => o.status === 'entregado')
    .flatMap((o) =>
      o.items
        .filter((i) => i.productId)
        .map((i, n) => ({
          id: `${o.id}-${n}`,
          productId: i.productId,
          type: 'venta',
          qty: Number(i.qty) || 0,
          date: o.date,
          orderId: o.id,
          note: `Pedido #${o.number} – ${o.client}`,
        })),
    )
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
