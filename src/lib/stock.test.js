import { describe, expect, it } from 'vitest'
import { salesHistory, stockSummary } from './stock.js'

const orders = [
  { id: 'o1', number: 1, client: 'Ana', status: 'entregado', date: '2026-10-01', items: [{ productId: 'p1', qty: 3 }] },
  { id: 'o2', number: 2, client: 'Ana', status: 'pendiente', date: '2026-10-02', items: [{ productId: 'p1', qty: 5 }] },
]
const movements = [
  { productId: 'p1', type: 'entrada', qty: 10 },
  { productId: 'p1', type: 'ajuste', qty: -1 },
]

describe('stockSummary', () => {
  it('subtracts only delivered orders', () => {
    expect(stockSummary(movements, orders).p1).toEqual({ produced: 10, adjusted: -1, sold: 3, stock: 6 })
  })
})

describe('salesHistory', () => {
  it('lists sales of delivered orders', () => {
    const h = salesHistory(orders)
    expect(h).toHaveLength(1)
    expect(h[0]).toMatchObject({ productId: 'p1', qty: 3, type: 'venta', orderId: 'o1' })
  })
})
