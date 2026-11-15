import { describe, expect, it } from 'vitest'
import { holdingsSummary, isLinked, linkedHoldings, quotes, repriced } from './marketDay'
import type { ReplayData } from '../sim/replay'
import type { Asset } from './tracker'

const day: ReplayData = {
  version: 1, date: '2026-11-13', interval: '1m', synthetic: false, source: 'test', times: ['09:15', '09:16', '09:17'],
  index: { symbol: 'NIFTY 50', name: 'Nifty 50', prevClose: 100, close: [100, 101, 102] },
  stocks: [
    { symbol: 'AAA', name: 'Alpha', prevClose: 100, close: [100, 95, 110] },
    { symbol: 'BBB', name: 'Beta', prevClose: 50, close: [50, 49, 45] },
  ],
}
const stock = (p: Partial<Asset>): Asset => ({ id: 'x', type: 'stocks', value: 0, monthly: 0, ...p })

describe('marketDay', () => {
  it('quotes use the last bar and the previous close', () => {
    const [a, b] = quotes(day)
    expect(a).toMatchObject({ price: 110, change: 10, low: 95, high: 110 }); expect(a.pct).toBeCloseTo(10)
    expect(b.pct).toBeCloseTo(-10)
  })
  it('only stocks with a symbol and shares are linked', () => {
    expect(isLinked(stock({ symbol: 'AAA', qty: 3 }))).toBe(true)
    expect(isLinked(stock({ symbol: 'AAA' }))).toBe(false)
    expect(isLinked({ ...stock({ symbol: 'AAA', qty: 3 }), type: 'mf' })).toBe(false)
  })
  it('values linked holdings and the day change, ignoring unknown symbols', () => {
    const list = linkedHoldings(day, [stock({ id: '1', symbol: 'AAA', qty: 2 }), stock({ id: '2', symbol: 'BBB', qty: 10 }), stock({ id: '3', symbol: 'ZZZ', qty: 1 })])
    expect(list.map(h => [h.value, h.dayChange])).toEqual([[220, 20], [450, -50]])
    const s = holdingsSummary(list)
    expect(s.value).toBe(670); expect(s.change).toBe(-30); expect(s.pct).toBeCloseTo((-30 / 700) * 100)
  })
  it('repriced updates only linked holdings, and returns null when nothing changed', () => {
    const assets = [stock({ id: '1', symbol: 'AAA', qty: 2, value: 100 }), stock({ id: '2', value: 5000 })]
    const next = repriced(day, assets)!
    expect(next[0].value).toBe(220); expect(next[1]).toBe(assets[1])
    expect(repriced(day, next)).toBeNull()
  })
})
