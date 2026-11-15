import { useSyncExternalStore } from 'react'

/**
 * The player's money picture: held in memory here and persisted to their authenticated account.
 * The backend encrypts it before database writes. Projections remain plain local formulas.
 */
export type AssetType = 'fd' | 'stocks' | 'mf' | 'esop' | 'epf' | 'ppf' | 'nps' | 'gold' | 'property' | 'cash' | 'other'
/** One holding. `name` and `rate` are the player's own; without a rate the class default is used. */
export interface Asset { id: string; type: AssetType; value: number; monthly: number; name?: string; rate?: number; /** last edit, ms */ at?: number
  /** a stock linked to a real NSE symbol: its value is shares × the downloaded closing price */
  symbol?: string; qty?: number }
export interface Cost { id: string; name: string; amt: number }
export interface Money {
  assets: Asset[]
  income: number      // monthly take-home
  expenses: number    // monthly living costs, excluding EMIs
  emi: number         // monthly loan payments
  loans: number       // loans outstanding
  tax: number         // income tax paid a year
  health: boolean     // has health insurance
  term: boolean       // has term life cover
  unlocked: string[]  // vault slots and sections already rewarded
  costs: Cost[]       // the player's own monthly cost lines, added to living expenses
  inflation: number   // assumed yearly inflation, %
  retireSpend: number // spending in retirement as % of today's
}

/** Assumed yearly return per asset class, and whether it is liquid enough to count as an emergency fund. */
export const CLASS: Record<AssetType, { rate: number; liquid: boolean; risky: boolean }> = {
  fd: { rate: 7, liquid: true, risky: false }, stocks: { rate: 12, liquid: false, risky: true },
  mf: { rate: 11, liquid: false, risky: true }, esop: { rate: 10, liquid: false, risky: true },
  epf: { rate: 8.25, liquid: false, risky: false }, ppf: { rate: 7.1, liquid: false, risky: false },
  nps: { rate: 10, liquid: false, risky: false }, gold: { rate: 8, liquid: false, risky: false },
  property: { rate: 6, liquid: false, risky: false }, cash: { rate: 3, liquid: true, risky: false },
  other: { rate: 8, liquid: false, risky: false },
}
export const TYPES = Object.keys(CLASS) as AssetType[]
export const rateOf = (a: Asset) => a.rate ?? CLASS[a.type].rate
/** Living expenses including the player's own cost lines. Every calculation uses this view. */
export const norm = (m: Money): Money => ({ ...m, expenses: m.expenses + m.costs.reduce((s, c) => s + c.amt, 0) })

const EMPTY: Money = { assets: [], income: 0, expenses: 0, emi: 0, loans: 0, tax: 0, health: false, term: false, unlocked: [], costs: [], inflation: 6, retireSpend: 80 }
let ownerId: string | null = null
let cache: Money = { ...EMPTY }
const subs = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined
export function hydrateMoney(id: string, data: Partial<Money>) {
  clearTimeout(saveTimer)
  ownerId = id
  cache = { ...EMPTY, ...data }
  // The authenticated server copy is now authoritative; remove legacy plaintext browser copies.
  for (const key of Object.keys(localStorage)) if (key === 'pq.money' || key.startsWith('pq.money.')) localStorage.removeItem(key)
  subs.forEach(f => f())
}
export function clearMoneyOwner() { clearTimeout(saveTimer); ownerId = null; cache = { ...EMPTY }; subs.forEach(f => f()) }
export function setMoney(p: Partial<Money>) {
  cache = { ...cache, ...p }
  subs.forEach(f => f())
  if (ownerId) {
    clearTimeout(saveTimer)
    const snapshot = JSON.stringify(cache)
    saveTimer = setTimeout(() => {
      void fetch('/api/tracker', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: snapshot }).catch(() => {})
    }, 400)
  }
}
export const getMoney = () => cache
/** Deletes everything the player entered on this device. */
export const resetMoney = () => setMoney({ ...EMPTY })
export const useMoney = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cache)

/** Value of one holding after `years`, with its monthly additions. */
export function futureValue(a: Asset, years: number) {
  const r = rateOf(a) / 100 / 12, n = Math.max(years, 0) * 12
  return a.value * Math.pow(1 + r, n) + (r ? a.monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : a.monthly * n)
}
export const toToday = (v: number, years: number, inflation = 6) => v / Math.pow(1 + inflation / 100, Math.max(years, 0))

export function totals(m0: Money, years: number) {
  const m = norm(m0)
  const now = m.assets.reduce((s, a) => s + a.value, 0)
  const future = m.assets.reduce((s, a) => s + futureValue(a, years), 0)
  const investing = m.assets.reduce((s, a) => s + a.monthly, 0)
  const liquid = m.assets.filter(a => CLASS[a.type].liquid).reduce((s, a) => s + a.value, 0)
  const byType = TYPES.map(t => ({ type: t, value: m.assets.filter(a => a.type === t).reduce((s, a) => s + a.value, 0) })).filter(x => x.value > 0)
  return { now, future, real: toToday(future, years, m.inflation), investing, liquid, byType, netWorth: now - m.loans, surplus: m.income - m.expenses - m.emi - investing }
}

/** Mistakes worth learning from, found in the player's own numbers. */
export interface Insight { id: string; tone: 'bad' | 'warn' | 'good'; vars: Record<string, string | number> }
export function insights(m0: Money, years: number): Insight[] {
  const m = norm(m0)
  const t = totals(m, years), out: Insight[] = []
  if (!m.assets.length || !m.income) return out
  const share = (ty: AssetType[]) => t.now ? m.assets.filter(a => ty.includes(a.type)).reduce((s, a) => s + a.value, 0) / t.now : 0
  const monthsCover = m.expenses ? t.liquid / m.expenses : 0
  if (share(['esop']) > 0.4) out.push({ id: 'esop', tone: 'bad', vars: { p: Math.round(share(['esop']) * 100) } })
  if (share(['fd', 'cash']) > 0.6 && years > 10) out.push({ id: 'safe', tone: 'warn', vars: { p: Math.round(share(['fd', 'cash']) * 100) } })
  if (monthsCover < 3) out.push({ id: 'emergency', tone: 'bad', vars: { n: monthsCover.toFixed(1) } })
  if (m.income && m.emi / m.income > 0.4) out.push({ id: 'emi', tone: 'bad', vars: { p: Math.round((m.emi / m.income) * 100) } })
  if (!m.health) out.push({ id: 'health', tone: 'warn', vars: {} })
  if (!m.term && m.loans > 0) out.push({ id: 'term', tone: 'warn', vars: {} })
  if (!m.assets.some(a => a.type === 'nps') && m.tax > 0) out.push({ id: 'nps', tone: 'warn', vars: {} })
  if (m.income && t.investing / m.income >= 0.2) out.push({ id: 'saver', tone: 'good', vars: { p: Math.round((t.investing / m.income) * 100) } })
  if (t.surplus > m.income * 0.15) out.push({ id: 'idle', tone: 'warn', vars: { amt: Math.round(t.surplus) } })
  return out
}
