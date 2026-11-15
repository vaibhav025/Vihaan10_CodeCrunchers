/**
 * Replay of one real trading day. The prices are real (downloaded once into a JSON file by
 * backend/scripts/fetch_market_day.py); the money is virtual. Pure functions only: no React,
 * no network apart from loadReplay, so everything here is unit-testable.
 */
export interface ReplayStock { symbol: string; name: string; prevClose: number; close: number[] }
export interface ReplayData {
  version: 1
  date: string            // trading day, YYYY-MM-DD
  interval: string        // "1m", "5m"...
  synthetic: boolean      // true for the made-up sample file
  source: string
  times: string[]         // "09:15"... one per bar, Indian time
  index: { symbol: string; name: string; prevClose: number; close: number[] }
  stocks: ReplayStock[]
}

export const START_CASH = 100000
/** An illustration of long-run growth, not a forecast. TODO verify before quoting it as fact. */
export const LONG_RUN_RETURN = 0.1

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const series = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(x => isNum(x) && x > 0)

/** Checks a downloaded file and returns it typed, or throws a plain-language error. */
export function parseReplay(raw: unknown): ReplayData {
  const d = raw as Partial<ReplayData> | null
  if (!d || typeof d !== 'object' || d.version !== 1) throw new Error('not a replay file')
  if (!Array.isArray(d.times) || d.times.length < 2) throw new Error('no time axis')
  const n = d.times.length
  const ix = d.index
  if (!ix || !isNum(ix.prevClose) || ix.prevClose <= 0 || !series(ix.close, n)) throw new Error('bad index series')
  if (!Array.isArray(d.stocks) || d.stocks.length === 0) throw new Error('no stocks')
  for (const s of d.stocks) {
    if (!s || typeof s.symbol !== 'string' || typeof s.name !== 'string' || !isNum(s.prevClose) || s.prevClose <= 0 || !series(s.close, n))
      throw new Error(`bad stock series${s && s.symbol ? `: ${s.symbol}` : ''}`)
  }
  return {
    version: 1, date: String(d.date ?? ''), interval: String(d.interval ?? '1m'), synthetic: d.synthetic === true,
    source: String(d.source ?? ''), times: d.times as string[], index: ix as ReplayData['index'], stocks: d.stocks as ReplayStock[],
  }
}

/** Loads the real day if it has been downloaded, otherwise the labelled sample. */
export async function loadReplay(get: typeof fetch = fetch): Promise<ReplayData> {
  for (const file of ['/data/replay.json', '/data/replay-sample.json']) {
    try {
      const res = await get(file, { cache: 'no-cache' })
      // a dev server answers unknown paths with index.html, which is not JSON: treat that as "not there"
      if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return parseReplay(await res.json())
    } catch (e) {
      if (e instanceof Error && !(e instanceof TypeError) && !(e instanceof SyntaxError)) throw e
    }
  }
  throw new Error('missing')
}

export const pctChange = (now: number, base: number) => (now / base - 1) * 100

export interface Portfolio { cash: number; shares: number[]; trades: number }
export const emptyPortfolio = (stocks: number): Portfolio => ({ cash: START_CASH, shares: Array(stocks).fill(0), trades: 0 })

/** Buys up to `amount` rupees of stock `i` at `price`. Never spends more cash than there is. */
export function buy(p: Portfolio, i: number, price: number, amount: number): Portfolio {
  const spend = Math.min(amount, p.cash)
  if (spend < 1 || !(price > 0)) return p
  return { cash: p.cash - spend, shares: p.shares.map((n, k) => (k === i ? n + spend / price : n)), trades: p.trades + 1 }
}

/** Sells a fraction (0 to 1) of what is held in stock `i` at `price`. */
export function sell(p: Portfolio, i: number, price: number, fraction: number): Portfolio {
  const n = p.shares[i] * Math.min(Math.max(fraction, 0), 1)
  if (n <= 0 || !(price > 0)) return p
  return { cash: p.cash + n * price, shares: p.shares.map((x, k) => (k === i ? x - n : x)), trades: p.trades + 1 }
}

export const worth = (p: Portfolio, prices: number[]) => p.cash + p.shares.reduce((s, n, i) => s + n * prices[i], 0)
export const pricesAt = (d: ReplayData, at: number) => d.stocks.map(s => s.close[at])

/**
 * Splits a stock's move so far into the part that came with the whole market and the part that was its own.
 * It cannot say why: the news behind the part that was its own has to be looked up.
 */
export function whyMoved(d: ReplayData, i: number, at: number) {
  const s = d.stocks[i]
  const total = pctChange(s.close[at], s.prevClose)
  const market = pctChange(d.index.close[at], d.index.prevClose)
  return { total, market, own: total - market }
}

export interface DayReport {
  player: number; index: number; basket: number
  best: { name: string; pct: number }; worst: { name: string; pct: number }
  biggestSwing: { name: string; pct: number }
  trades: number; holdings: number; topShare: number
}

/** How the day went, at bar `at` (normally the last). */
export function dayReport(d: ReplayData, p: Portfolio, at: number): DayReport {
  const prices = pricesAt(d, at)
  const total = worth(p, prices)
  const moves = d.stocks.map((s, i) => ({ name: s.name, pct: pctChange(prices[i], s.prevClose) }))
  const swings = d.stocks.map(s => {
    const part = s.close.slice(0, at + 1)
    return { name: s.name, pct: (Math.max(...part) / Math.min(...part) - 1) * 100 }
  })
  const values = p.shares.map((n, i) => n * prices[i])
  return {
    player: pctChange(total, START_CASH),
    index: pctChange(d.index.close[at], d.index.prevClose),
    basket: moves.reduce((a, m) => a + m.pct, 0) / moves.length,
    best: moves.reduce((a, m) => (m.pct > a.pct ? m : a)),
    worst: moves.reduce((a, m) => (m.pct < a.pct ? m : a)),
    biggestSwing: swings.reduce((a, m) => (m.pct > a.pct ? m : a)),
    trades: p.trades,
    holdings: p.shares.filter(n => n > 0).length,
    topShare: total > 0 ? Math.max(0, ...values) / total : 0,
  }
}

/** Score for the XP rule: finishing the day, spreading money, and not betting it all on one stock. Never trading itself. */
export function replayScore(r: DayReport) {
  return 40 + (r.holdings >= 3 ? 30 : 0) + (r.holdings > 0 && r.topShare <= 0.4 ? 30 : 0)
}

/** Value after `years` of investing `monthly` rupees a month at `rate` a year. */
export function longRunSip(monthly: number, years: number, rate = LONG_RUN_RETURN) {
  const r = rate / 12, n = years * 12
  return r ? monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : monthly * n
}
