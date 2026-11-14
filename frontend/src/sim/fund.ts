import { COMPANIES, TRADING_DAYS } from './companies'
import type { Market } from './market'

/** A fund or ETF: a weighted basket of the simulated companies, with a yearly fee. */
export interface Fund {
  id: string
  /** one weight per company, in COMPANIES order; they are normalised to add up to 1 */
  weights: number[]
  /** yearly expense ratio, e.g. 0.015 for 1.5%; charged a little every trading day */
  expense: number
}

const equal = COMPANIES.map(() => 1)
const byId = (w: Record<string, number>) => COMPANIES.map(c => w[c.id] ?? 0)

/** Holds every company equally and charges very little, like an index ETF. */
export const INDEX_ETF: Fund = { id: 'etf', weights: equal, expense: 0.001 }
/** A manager picks favourites and charges more, like an actively managed fund. */
export const ACTIVE_FUND: Fund = { id: 'mf', weights: byId({ sjb: 3, sgi: 3, ggf: 2, aap: 2, shc: 2, nsb: 1, lgs: 1, tpp: 1 }), expense: 0.015 }
/** Two wild companies and nothing else: what "a few individual stocks" looks like. */
export const STOCK_PICKS: Fund = { id: 'stocks', weights: byId({ tpp: 1, lgs: 1 }), expense: 0 }

const normalise = (w: number[]) => { const sum = w.reduce((a, b) => a + b, 0); return sum > 0 ? w.map(x => x / sum) : w }

/** The fund's value after one day: the basket's move, less one day's share of the fee. */
export function fundStep(nav: number, before: number[], after: number[], fund: Fund) {
  const w = normalise(fund.weights)
  const growth = w.reduce((s, wi, i) => s + wi * (after[i] / before[i]), 0)
  return nav * growth * (1 - fund.expense / TRADING_DAYS)
}

/** The fund's value on every day of a market history, starting at `start`. */
export function navSeries(history: Market[], fund: Fund, start = 100) {
  const out = [start]
  for (let i = 1; i < history.length; i++) out.push(fundStep(out[i - 1], history[i - 1].prices, history[i].prices, fund))
  return out
}

/** A fund's total return over a market history, e.g. 0.12 for +12%. */
export const fundReturn = (history: Market[], fund: Fund) => { const s = navSeries(history, fund, 1); return s[s.length - 1] - 1 }
