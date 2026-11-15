import { describe, expect, it } from 'vitest'
import {
  START_CASH, buy, dayReport, emptyPortfolio, loadReplay, longRunSip, parseReplay, pricesAt, replayScore, sell, whyMoved, worth, type ReplayData,
} from './replay'

const day = (over: Partial<ReplayData> = {}): ReplayData => ({
  version: 1, date: '2026-11-13', interval: '1m', synthetic: false, source: 'test',
  times: ['09:15', '09:16', '09:17'],
  index: { symbol: 'NIFTY 50', name: 'Nifty 50', prevClose: 100, close: [100, 101, 102] },
  stocks: [
    { symbol: 'AAA', name: 'Alpha', prevClose: 200, close: [200, 210, 220] },
    { symbol: 'BBB', name: 'Beta', prevClose: 50, close: [50, 49, 45] },
    { symbol: 'CCC', name: 'Gamma', prevClose: 10, close: [10, 10, 10] },
  ],
  ...over,
})

describe('parseReplay', () => {
  it('accepts a good file and rejects damaged ones', () => {
    expect(parseReplay(day()).stocks).toHaveLength(3)
    expect(() => parseReplay(null)).toThrow()
    expect(() => parseReplay({ ...day(), version: 2 })).toThrow()
    expect(() => parseReplay(day({ times: ['09:15'] }))).toThrow()
    const short = day(); short.stocks[0].close = [200, 210]
    expect(() => parseReplay(short)).toThrow(/AAA/)
    const bad = day(); bad.stocks[1].close = [50, NaN, 45]
    expect(() => parseReplay(bad)).toThrow(/BBB/)
    const zero = day(); zero.index.prevClose = 0
    expect(() => parseReplay(zero)).toThrow()
  })
  it('keeps the synthetic flag only when it is exactly true', () => {
    expect(parseReplay({ ...day(), synthetic: true }).synthetic).toBe(true)
    expect(parseReplay({ ...day(), synthetic: 'yes' as unknown as boolean }).synthetic).toBe(false)
  })
})

describe('loadReplay', () => {
  const reply = (body: unknown, type = 'application/json', ok = true) =>
    ({ ok, headers: { get: () => type }, json: async () => body }) as unknown as Response
  it('prefers the real file, falls back to the sample, and reports when neither exists', async () => {
    const real = await loadReplay((async (u: string) => (u.endsWith('/replay.json') ? reply(day({ source: 'real' })) : reply(day({ source: 'sample' })))) as typeof fetch)
    expect(real.source).toBe('real')
    const sample = await loadReplay((async (u: string) => (u.endsWith('/replay.json') ? reply('<html>', 'text/html') : reply(day({ source: 'sample' })))) as typeof fetch)
    expect(sample.source).toBe('sample')
    await expect(loadReplay((async () => reply('<html>', 'text/html')) as typeof fetch)).rejects.toThrow('missing')
  })
  it('reports a damaged real file instead of hiding it behind the sample', async () => {
    await expect(loadReplay((async () => reply({ version: 1 })) as typeof fetch)).rejects.toThrow()
  })
})

describe('trading', () => {
  it('buys at the price of the moment and never overspends', () => {
    let p = emptyPortfolio(3)
    p = buy(p, 0, 200, 20000)
    expect(p.cash).toBe(START_CASH - 20000)
    expect(p.shares[0]).toBeCloseTo(100)
    p = buy(p, 1, 50, 1e9)
    expect(p.cash).toBeCloseTo(0)
    expect(buy(p, 2, 10, 5000)).toBe(p)          // no cash left: unchanged
    expect(p.trades).toBe(2)
  })
  it('sells a fraction at the later price and the money adds up', () => {
    let p = buy(emptyPortfolio(3), 0, 200, 20000)
    p = sell(p, 0, 220, 0.5)
    expect(p.shares[0]).toBeCloseTo(50)
    expect(p.cash).toBeCloseTo(START_CASH - 20000 + 50 * 220)
    expect(sell(emptyPortfolio(3), 1, 49, 1).trades).toBe(0)   // nothing held
    expect(worth(p, [220, 45, 10])).toBeCloseTo(START_CASH + 100 * (220 - 200))   // 100 shares bought at 200, now worth 220 (half sold)
  })
})

describe('whyMoved and dayReport', () => {
  const d = day()
  it('splits a move into with-the-market and its-own parts', () => {
    const w = whyMoved(d, 0, 2)
    expect(w.total).toBeCloseTo(10)
    expect(w.market).toBeCloseTo(2)
    expect(w.own).toBeCloseTo(8)
    expect(whyMoved(d, 1, 2).own).toBeCloseTo(-10 - 2)
  })
  it('reports the day against the index and the whole basket', () => {
    const p = buy(emptyPortfolio(3), 0, 200, 50000)
    const r = dayReport(d, p, 2)
    expect(pricesAt(d, 2)).toEqual([220, 45, 10])
    expect(r.player).toBeCloseTo(5)              // 50% of the money in a stock that rose 10%
    expect(r.index).toBeCloseTo(2)
    expect(r.best.name).toBe('Alpha'); expect(r.worst.name).toBe('Beta')
    expect(r.biggestSwing.name).toBe('Beta')   // 50 to 45 is a wider range (11.1%) than 200 to 220 (10%)
    expect(r.holdings).toBe(1); expect(r.trades).toBe(1)
    expect(r.topShare).toBeCloseTo(55000 / 105000)
  })
  it('scores spreading money, not trading', () => {
    const idle = dayReport(d, emptyPortfolio(3), 2)
    expect(replayScore(idle)).toBe(40)
    let p = emptyPortfolio(3)
    for (let i = 0; i < 3; i++) p = buy(p, i, d.stocks[i].close[0], 20000)
    expect(replayScore(dayReport(d, p, 2))).toBe(100)
    let churn = emptyPortfolio(3)
    for (let i = 0; i < 30; i++) { churn = buy(churn, 0, 200, 1000); churn = sell(churn, 0, 200, 1) }
    expect(replayScore(dayReport(d, churn, 2))).toBe(40)   // thirty trades earn nothing extra
  })
})

describe('longRunSip', () => {
  it('grows with time and matches the simple case at a zero rate', () => {
    expect(longRunSip(1000, 10, 0)).toBe(120000)
    expect(longRunSip(10000, 30)).toBeGreaterThan(longRunSip(10000, 20))
    expect(longRunSip(10000, 30)).toBeGreaterThan(10000 * 360)
  })
})
