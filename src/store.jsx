import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_COSTS, DEFAULT_PIECE } from './lib/calc.js'
import { today, uid } from './lib/format.js'
import { seedProducts } from './lib/seed.js'
import { stockSummary } from './lib/stock.js'

const KEY = 'd3dprint-data-v1'

export const DEFAULT_BUSINESS = {
  name: 'Mi taller 3D',
  phone: '',
  address: '',
  footer: '¡Gracias por tu compra!',
}

const initial = {
  costs: DEFAULT_COSTS,
  piece: DEFAULT_PIECE,
  business: DEFAULT_BUSINESS,
  products: [],
  orders: [],
  movements: [],
  nextOrderNumber: 1,
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const data = JSON.parse(raw)
    return {
      ...initial,
      ...data,
      costs: { ...DEFAULT_COSTS, ...data.costs },
      piece: { ...DEFAULT_PIECE, ...data.piece },
      business: { ...DEFAULT_BUSINESS, ...data.business },
    }
  } catch {
    return initial
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [data, setData] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      alert('No se pudo guardar: el almacenamiento del navegador está lleno. Usa imágenes más pequeñas o exporta un respaldo.')
    }
  }, [data])

  const update = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), [])

  const actions = useMemo(
    () => ({
      setCosts: (costs) => update(() => ({ costs })),
      setPiece: (piece) => update(() => ({ piece })),
      setBusiness: (business) => update(() => ({ business })),

      // Returns the product id, creating one for new products.
      saveProduct: (product, initialStock = 0) => {
        const id = product.id || uid()
        update((d) => {
          if (d.products.some((p) => p.id === id)) {
            return { products: d.products.map((p) => (p.id === id ? { ...p, ...product } : p)) }
          }
          const movements =
            initialStock > 0
              ? [...d.movements, { id: uid(), productId: id, type: 'entrada', qty: initialStock, date: today(), note: 'Stock inicial' }]
              : d.movements
          return { products: [...d.products, { ...product, id, createdAt: new Date().toISOString() }], movements }
        })
        return id
      },
      deleteProduct: (id) =>
        update((d) => ({
          products: d.products.filter((p) => p.id !== id),
          movements: d.movements.filter((m) => m.productId !== id || m.orderId),
        })),
      loadSampleProducts: () => update((d) => ({ products: [...d.products, ...seedProducts(uid)] })),

      addMovement: (movement) =>
        update((d) => ({ movements: [...d.movements, { id: uid(), date: today(), ...movement }] })),
      deleteMovement: (id) => update((d) => ({ movements: d.movements.filter((m) => m.id !== id) })),

      saveOrder: (order) =>
        update((d) => {
          const exists = order.id && d.orders.some((o) => o.id === order.id)
          const saved = exists ? order : { ...order, id: uid(), number: d.nextOrderNumber }
          const orders = exists ? d.orders.map((o) => (o.id === order.id ? saved : o)) : [...d.orders, saved]
          return {
            orders,
            nextOrderNumber: exists ? d.nextOrderNumber : d.nextOrderNumber + 1,
            movements: syncOrderMovements(d.movements, saved),
          }
        }),
      setOrderStatus: (id, status) =>
        update((d) => {
          const order = { ...d.orders.find((o) => o.id === id), status }
          return {
            orders: d.orders.map((o) => (o.id === id ? order : o)),
            movements: syncOrderMovements(d.movements, order),
          }
        }),
      deleteOrder: (id) =>
        update((d) => ({
          orders: d.orders.filter((o) => o.id !== id),
          movements: d.movements.filter((m) => m.orderId !== id),
        })),

      importData: (incoming) => setData({ ...initial, ...incoming }),
      resetAll: () => setData(initial),
    }),
    [update],
  )

  const stock = useMemo(() => stockSummary(data.movements), [data.movements])

  return <StoreContext.Provider value={{ ...data, stock, data, ...actions }}>{children}</StoreContext.Provider>
}

// A delivered order discounts its items from stock; any other status gives them back.
function syncOrderMovements(movements, order) {
  const rest = movements.filter((m) => m.orderId !== order.id)
  if (order.status !== 'entregado') return rest
  const sales = order.items
    .filter((i) => i.productId && Number(i.qty) > 0)
    .map((i) => ({
      id: uid(),
      productId: i.productId,
      type: 'venta',
      qty: Number(i.qty),
      date: order.deliveredAt || order.date || today(),
      orderId: order.id,
      note: `Pedido #${order.number} – ${order.client}`,
    }))
  return [...rest, ...sales]
}

export const useStore = () => useContext(StoreContext)
