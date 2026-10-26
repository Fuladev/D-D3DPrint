// Port of the "Calculadora PRO" sheet from Calculadora_3D_PRO.xlsx.

export const MULTIPLIERS = [
  { label: '×2 – Alto volumen / descuento', value: 2 },
  { label: '×2.5 – Volumen medio', value: 2.5 },
  { label: '×3 – Mayorista', value: 3 },
  { label: '×3.5 – Intermedio', value: 3.5 },
  { label: '×4 – Minorista', value: 4 },
  { label: '×5 – Llaveros / piezas chicas', value: 5 },
]

export const DEFAULT_COSTS = {
  filamentPerKg: 90000,
  kwhPrice: 1000,
  printerWatts: 120,
  printerPrice: 1600000,
  sparePartsCost: 600000,
  machineLifeHours: 4320,
  failureRate: 0.05,
  laborPerHour: 8500,
  suppliesMarkup: 0.3,
  platformFee: 0.2,
  platformFixedFee: 0,
  roundTo: 100,
}

export const DEFAULT_PIECE = {
  hours: 1,
  minutes: 10,
  grams: 9.49,
  prepMinutes: 5,
  postMinutes: 0,
  supplies: 0,
  piecesPerBed: 4,
  multiplier: 3.5,
  customMultiplier: '',
}

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

// Excel CEILING(x, step) for positive values, tolerant to float noise.
export function ceilingTo(x, step) {
  if (!(step > 0)) return x
  return Math.ceil(x / step - 1e-9) * step
}

export function calculate(costs, piece) {
  const c = Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, num(v)]))
  const p = {
    hours: num(piece.hours),
    minutes: num(piece.minutes),
    grams: num(piece.grams),
    prepMinutes: num(piece.prepMinutes),
    postMinutes: num(piece.postMinutes),
    supplies: num(piece.supplies),
    piecesPerBed: num(piece.piecesPerBed),
  }
  const custom = String(piece.customMultiplier ?? '').trim()
  const multiplier = custom !== '' && Number.isFinite(num(custom)) && num(custom) > 0 ? num(custom) : num(piece.multiplier)

  const totalHours = p.hours + p.minutes / 60
  const material = (p.grams * c.filamentPerKg) / 1000
  const electricity = (c.printerWatts / 1000) * totalHours * c.kwhPrice
  const wear = c.machineLifeHours > 0 ? ((c.printerPrice + c.sparePartsCost) / c.machineLifeHours) * totalHours : 0
  const failure = (material + electricity + wear) * c.failureRate
  const labor = ((p.prepMinutes + p.postMinutes) / 60) * c.laborPerHour
  const supplies = p.supplies * (1 + c.suppliesMarkup)
  const totalCost = material + electricity + wear + failure + labor + supplies

  const rawPrice = totalCost * multiplier
  const price = c.roundTo > 0 ? ceilingTo(rawPrice, c.roundTo) : rawPrice
  const profit = price - totalCost
  const profitPct = price > 0 ? profit / price : 0
  const pricePerPiece = p.piecesPerBed > 0 ? price / p.piecesPerBed : 0

  let platformPrice = 0
  if (c.platformFee < 1) {
    const raw = (price + c.platformFixedFee) / (1 - c.platformFee)
    platformPrice = c.roundTo > 0 ? ceilingTo(raw, c.roundTo) : raw
  }
  const platformNet = platformPrice * (1 - c.platformFee) - c.platformFixedFee
  const platformPricePerPiece = p.piecesPerBed > 0 ? platformPrice / p.piecesPerBed : 0

  return {
    multiplier,
    totalHours,
    material,
    electricity,
    wear,
    failure,
    labor,
    supplies,
    totalCost,
    costPerPiece: p.piecesPerBed > 0 ? totalCost / p.piecesPerBed : 0,
    price,
    profit,
    profitPct,
    pricePerPiece,
    platformPrice,
    platformNet,
    platformPricePerPiece,
  }
}
