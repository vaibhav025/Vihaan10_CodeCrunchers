import { useEffect, useSyncExternalStore } from 'react'
import { loadReplay, pctChange, type ReplayData } from '../sim/replay'
import { setMoney, useMoney, type Asset } from './tracker'

/**
 * The real NSE trading day downloaded by backend/scripts/fetch_market_day.py, shared by the
 * Dashboard, Tracker, Coach and Lab. Loaded once per visit from /data/replay.json; when only the
 * labelled sample exists, `real` is false and nothing personal is priced from it.
 */
export interface MarketState { status: 'loading' | 'ready' | 'missing' | 'bad'; data: ReplayData | null; real: boolean }
let state: MarketState = { status: 'loading', data: null, real: false }
let started = false
const subs = new Set<() => void>()
const set = (s: MarketState) => { state = s; subs.forEach(f => f()) }
function start() {
  if (started) return
  started = true
  loadReplay()
    .then(d => set({ status: 'ready', data: d, real: !d.synthetic }))
    .catch(e => set({ status: e instanceof Error && e.message === 'missing' ? 'missing' : 'bad', data: null, real: false }))
}
export function useMarketDay(): MarketState {
  start()
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => state)
}

export interface Quote { symbol: string; name: string; price: number; prevClose: number; pct: number; change: number; low: number; high: number; index: number }
export function quotes(d: ReplayData): Quote[] {
  return d.stocks.map((s, index) => {
    const price = s.close[s.close.length - 1]
    return { symbol: s.symbol, name: s.name, price, prevClose: s.prevClose, pct: pctChange(price, s.prevClose), change: price - s.prevClose,
      low: Math.min(...s.close), high: Math.max(...s.close), index }
  })
}
export const quoteOf = (d: ReplayData, symbol?: string) => (symbol ? quotes(d).find(q => q.symbol === symbol) ?? null : null)
export const indexMove = (d: ReplayData) => pctChange(d.index.close[d.index.close.length - 1], d.index.prevClose)
export const dateLabel = (d: ReplayData) =>
  d.synthetic ? '—' : new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** A holding the user has linked to a real NSE stock with a number of shares. */
export const isLinked = (a: Asset) => a.type === 'stocks' && !!a.symbol && (a.qty ?? 0) > 0

export interface LinkedHolding { asset: Asset; quote: Quote; value: number; dayChange: number }
/** The user's linked stocks priced at the day's close, with how much each moved that day. */
export function linkedHoldings(d: ReplayData, assets: Asset[]): LinkedHolding[] {
  const out: LinkedHolding[] = []
  for (const a of assets) {
    if (!isLinked(a)) continue
    const q = quoteOf(d, a.symbol)
    if (q) out.push({ asset: a, quote: q, value: a.qty! * q.price, dayChange: a.qty! * q.change })
  }
  return out
}
export function holdingsSummary(list: LinkedHolding[]) {
  const value = list.reduce((s, h) => s + h.value, 0), change = list.reduce((s, h) => s + h.dayChange, 0)
  const before = value - change
  return { value, change, pct: before > 0 ? (change / before) * 100 : 0 }
}

/** The assets with every linked stock revalued at the day's close, or null when nothing changed. */
export function repriced(d: ReplayData, assets: Asset[]): Asset[] | null {
  let changed = false
  const next = assets.map(a => {
    if (!isLinked(a)) return a
    const q = quoteOf(d, a.symbol)
    if (!q) return a
    const value = Math.round(a.qty! * q.price)
    if (Math.abs(value - a.value) < 1) return a
    changed = true
    return { ...a, value }
  })
  return changed ? next : null
}

/** Keeps linked stock holdings valued at real closing prices, so every total, score and Coach answer uses them. */
export function useRepriceHoldings() {
  const money = useMoney()
  const { data, real } = useMarketDay()
  useEffect(() => {
    if (!data || !real) return
    const next = repriced(data, money.assets)
    if (next) setMoney({ assets: next })
  }, [data, real, money.assets])
}
