import { supabase } from './supabase.js'

// Field maps between the app (camelCase) and the database (snake_case).
const FIELDS = {
  products: {
    id: 'id', name: 'name', image: 'image', hours: 'hours', minutes: 'minutes', grams: 'grams',
    piecesPerBed: 'pieces_per_bed', costPerBed: 'cost_per_bed', bedPrice: 'bed_price', price: 'price',
    notes: 'notes', createdAt: 'created_at',
  },
  orders: {
    id: 'id', number: 'number', client: 'client', phone: 'phone', date: 'date', status: 'status',
    items: 'items', discount: 'discount', shipping: 'shipping', note: 'note', createdAt: 'created_at',
  },
  movements: { id: 'id', productId: 'product_id', type: 'type', qty: 'qty', price: 'price', date: 'date', note: 'note' },
}
const NUMERIC = new Set(['hours', 'minutes', 'grams', 'piecesPerBed', 'costPerBed', 'bedPrice', 'price', 'discount', 'shipping', 'qty'])

export function toRow(table, obj) {
  const row = {}
  for (const [k, col] of Object.entries(FIELDS[table])) {
    if (obj[k] !== undefined && col !== 'created_at') row[col] = obj[k]
  }
  return row
}

export function fromRow(table, row) {
  const obj = {}
  for (const [k, col] of Object.entries(FIELDS[table])) {
    const v = row[col]
    obj[k] = NUMERIC.has(k) ? Number(v) || 0 : v ?? (k === 'items' ? [] : '')
  }
  return obj
}

const check = ({ data, error }) => {
  if (error) throw error
  return data
}

export async function fetchAll() {
  const [products, orders, movements, settings] = await Promise.all([
    supabase.from('products').select('*').order('created_at'),
    supabase.from('orders').select('*').order('number'),
    supabase.from('movements').select('*').order('created_at'),
    supabase.from('settings').select('*').maybeSingle(),
  ])
  return {
    products: check(products).map((r) => fromRow('products', r)),
    orders: check(orders).map((r) => fromRow('orders', r)),
    movements: check(movements).map((r) => fromRow('movements', r)),
    settings: check(settings),
  }
}

export const insert = async (table, objs) =>
  check(await supabase.from(table).insert(objs.map((o) => toRow(table, o))).select()).map((r) => fromRow(table, r))

export const update = async (table, obj) => check(await supabase.from(table).update(toRow(table, obj)).eq('id', obj.id))

export const remove = async (table, id) => check(await supabase.from(table).delete().eq('id', id))

export const saveSettings = async (userId, values) =>
  check(await supabase.from('settings').upsert({ user_id: userId, ...values, updated_at: new Date().toISOString() }))

export async function clearAll() {
  // Movements go with their products through the foreign key cascade.
  for (const table of ['orders', 'products', 'settings']) {
    check(await supabase.from(table).delete().not(table === 'settings' ? 'user_id' : 'id', 'is', null))
  }
}
