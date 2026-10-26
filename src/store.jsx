import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_COSTS, DEFAULT_PIECE } from './lib/calc.js'
import * as db from './lib/db.js'
import { today } from './lib/format.js'
import { seedProducts } from './lib/seed.js'
import { stockSummary } from './lib/stock.js'
import { supabase } from './lib/supabase.js'

export const LEGACY_KEY = 'd3dprint-data-v1'

export const DEFAULT_BUSINESS = {
  name: 'D&D',
  phone: '',
  address: '',
  footer: '¡Gracias por tu compra!',
}

const newId = () => crypto.randomUUID()

const StoreContext = createContext(null)

export function StoreProvider({ session, children }) {
  const userId = session.user.id
  const [status, setStatus] = useState('loading')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [movements, setMovements] = useState([])
  const [settings, setSettings] = useState({ costs: DEFAULT_COSTS, piece: DEFAULT_PIECE, business: DEFAULT_BUSINESS })
  const settingsRef = useRef(settings)
  const saveTimer = useRef(null)
  const productsRef = useRef(products)
  productsRef.current = products

  const refresh = useCallback(async (withSettings = false) => {
    try {
      const data = await db.fetchAll()
      setProducts(data.products)
      setOrders(data.orders)
      setMovements(data.movements)
      if (withSettings && data.settings) {
        const s = data.settings
        const next = {
          costs: { ...DEFAULT_COSTS, ...s.costs },
          piece: { ...DEFAULT_PIECE, ...s.piece },
          business: { ...DEFAULT_BUSINESS, ...s.business },
        }
        settingsRef.current = next
        setSettings(next)
      }
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [])

  // Initial load plus live updates when another device changes something.
  useEffect(() => {
    refresh(true)
    let timer
    const channel = supabase
      .channel('dd-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => schedule())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => schedule())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => schedule())
      .subscribe()
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => refresh(), 400)
    }
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [refresh])

  // Writes are optimistic: the screen updates at once and reloads from the server if saving fails.
  const run = useCallback(
    async (fn) => {
      try {
        await fn()
        return true
      } catch (err) {
        console.error(err)
        alert(`No se pudo guardar en la nube: ${err.message || err}`)
        refresh()
        return false
      }
    },
    [refresh],
  )

  const setSetting = useCallback(
    (key, value) => {
      const next = { ...settingsRef.current, [key]: value }
      settingsRef.current = next
      setSettings(next)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => run(() => db.saveSettings(userId, settingsRef.current)), 800)
    },
    [run, userId],
  )

  const actions = useMemo(
    () => ({
      setCosts: (v) => setSetting('costs', v),
      setPiece: (v) => setSetting('piece', v),
      setBusiness: (v) => setSetting('business', v),

      // Returns the product id right away; the cloud write continues in the background.
      saveProduct: (product, initialStock = 0) => {
        const id = product.id || newId()
        if (productsRef.current.some((p) => p.id === id)) {
          setProducts((l) => l.map((p) => (p.id === id ? { ...p, ...product } : p)))
          run(() => db.update('products', { ...product, id }))
          return id
        }
        const created = { ...product, id }
        const entry = initialStock > 0 && { id: newId(), productId: id, type: 'entrada', qty: initialStock, date: today(), note: 'Stock inicial' }
        setProducts((l) => [...l, created])
        if (entry) setMovements((m) => [...m, entry])
        run(async () => {
          await db.insert('products', [created])
          if (entry) await db.insert('movements', [entry])
        })
        return id
      },
      deleteProduct: (id) => {
        setProducts((l) => l.filter((p) => p.id !== id))
        setMovements((l) => l.filter((m) => m.productId !== id))
        run(() => db.remove('products', id))
      },
      loadSampleProducts: () => {
        const sample = seedProducts(newId)
        setProducts((l) => [...l, ...sample])
        run(() => db.insert('products', sample))
      },

      addMovement: (movement) => {
        const m = { id: newId(), date: today(), ...movement }
        setMovements((l) => [...l, m])
        run(() => db.insert('movements', [m]))
      },
      deleteMovement: (id) => {
        setMovements((l) => l.filter((m) => m.id !== id))
        run(() => db.remove('movements', id))
      },

      // New orders wait for the database, which assigns the invoice number.
      saveOrder: (order) =>
        run(async () => {
          if (order.id) {
            setOrders((l) => l.map((o) => (o.id === order.id ? order : o)))
            await db.update('orders', order)
          } else {
            const [saved] = await db.insert('orders', [{ ...order, id: newId() }])
            setOrders((l) => (l.some((o) => o.id === saved.id) ? l : [...l, saved]))
          }
        }),
      setOrderStatus: (id, status) => {
        setOrders((l) => l.map((o) => (o.id === id ? { ...o, status } : o)))
        run(() => db.update('orders', { id, status }))
      },
      deleteOrder: (id) => {
        setOrders((l) => l.filter((o) => o.id !== id))
        run(() => db.remove('orders', id))
      },

      importData: (incoming) =>
        run(async () => {
          setStatus('loading')
          const ids = {}
          const newProducts = (incoming.products || []).map((p) => ({ ...p, id: (ids[p.id] = newId()) }))
          const keepNumbers = orders.length === 0
          const newOrders = (incoming.orders || []).map((o) => ({
            ...o,
            id: newId(),
            number: keepNumbers ? o.number : undefined,
            items: (o.items || []).map((i) => ({ ...i, productId: ids[i.productId] || null })),
          }))
          // Order sales are derived from delivered orders, so only the other movements are imported.
          const newMovements = (incoming.movements || [])
            .filter((m) => !m.orderId && ids[m.productId])
            .map(({ orderId, ...m }) => m)
            .map((m) => ({ ...m, id: newId(), productId: ids[m.productId] }))
          if (newProducts.length) await db.insert('products', newProducts)
          if (newMovements.length) await db.insert('movements', newMovements)
          for (const o of newOrders) await db.insert('orders', [o])
          if (incoming.costs || incoming.business) {
            const next = {
              costs: { ...DEFAULT_COSTS, ...incoming.costs },
              piece: { ...DEFAULT_PIECE, ...incoming.piece },
              business: { ...DEFAULT_BUSINESS, ...incoming.business },
            }
            settingsRef.current = next
            setSettings(next)
            await db.saveSettings(userId, next)
          }
          await refresh()
        }),
      resetAll: () =>
        run(async () => {
          setStatus('loading')
          await db.clearAll()
          const next = { costs: DEFAULT_COSTS, piece: DEFAULT_PIECE, business: DEFAULT_BUSINESS }
          settingsRef.current = next
          setSettings(next)
          await refresh()
        }),
    }),
    [run, setSetting, refresh, orders.length, userId],
  )

  const stock = useMemo(() => stockSummary(movements, orders), [movements, orders])
  const data = { ...settings, products, orders, movements }

  return (
    <StoreContext.Provider value={{ ...data, data, stock, status, session, refresh, ...actions }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
