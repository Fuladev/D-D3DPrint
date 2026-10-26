import { describe, expect, it } from 'vitest'
import { calculate, ceilingTo, DEFAULT_COSTS, DEFAULT_PIECE } from './calc.js'

describe('calculate', () => {
  it('matches the values of the Calculadora PRO sheet', () => {
    const r = calculate(DEFAULT_COSTS, DEFAULT_PIECE)
    expect(r.totalHours).toBeCloseTo(1.16667, 4)
    expect(r.material).toBeCloseTo(854.1, 6)
    expect(r.electricity).toBeCloseTo(140, 6)
    expect(r.wear).toBeCloseTo(594.1358, 3)
    expect(r.failure).toBeCloseTo(79.4118, 3)
    expect(r.labor).toBeCloseTo(708.3333, 3)
    expect(r.totalCost).toBeCloseTo(2375.981, 2)
    expect(r.price).toBe(8400)
    expect(r.pricePerPiece).toBe(2100)
    expect(r.platformPrice).toBe(10500)
    expect(r.platformNet).toBeCloseTo(8400, 6)
    expect(r.platformPricePerPiece).toBe(2625)
  })

  it('uses the custom multiplier when given', () => {
    const r = calculate(DEFAULT_COSTS, { ...DEFAULT_PIECE, customMultiplier: '2' })
    expect(r.multiplier).toBe(2)
    expect(r.price).toBe(4800)
  })

  it('does not round when roundTo is 0', () => {
    const r = calculate({ ...DEFAULT_COSTS, roundTo: 0 }, DEFAULT_PIECE)
    expect(r.price).toBeCloseTo(r.totalCost * 3.5, 6)
  })
})

describe('ceilingTo', () => {
  it('rounds up to the step and keeps exact multiples', () => {
    expect(ceilingTo(8315.9, 100)).toBe(8400)
    expect(ceilingTo(8400, 100)).toBe(8400)
    expect(ceilingTo(0.1 * 3 * 1000, 100)).toBe(300)
  })
})
