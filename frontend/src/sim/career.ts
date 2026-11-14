import { A } from './assumptions'
import { TRADING_DAYS } from './companies'
import { ACTIVE_FUND, INDEX_ETF, STOCK_PICKS, fundReturn } from './fund'
import { createMarket, release, run, type Market } from './market'
import { fork, stream } from './rng'

/**
 * Retirement Run: a whole career, one year per turn. The market comes from the same engine
 * as the Stocks module, fast-forwarded a year at a time. Guaranteed schemes ignore it.
 */
export type Bucket = 'nps' | 'apy' | 'ppf' | 'epf' | 'mf' | 'etf' | 'stocks' | 'fd'
/** The choices the player splits savings across. `fd` is only used by ghost players. */
export const PLAYER_BUCKETS: Bucket[] = ['nps', 'apy', 'ppf', 'epf', 'mf', 'etf', 'stocks']
/** Buckets whose value follows the market. */
export const MARKET_BUCKETS: Bucket[] = ['mf', 'etf', 'stocks']
/** Buckets that cannot be withdrawn early to pay for a life event. */
const LOCKED: Bucket[] = ['nps', 'apy', 'ppf', 'epf']
const ALL: Bucket[] = [...PLAYER_BUCKETS, 'fd']

export interface Plan {
  /** relative weights per bucket; they do not need to add up to anything */
  weights: Partial<Record<Bucket, number>>
  /** share of NPS held in equity, 0 to A.npsEquityCap */
  npsEquity: number
  /** share of salary saved each year */
  saveRate: number
}
export const DEFAULT_PLAN: Plan = { weights: { nps: 3, apy: 1, ppf: 2, epf: 2, mf: 2, etf: 3, stocks: 1 }, npsEquity: 0.5, saveRate: 0.15 }
const BALANCED: Plan = { weights: { nps: 3, ppf: 2, mf: 2, etf: 3 }, npsEquity: 0.5, saveRate: 0.15 }

export type LifeEvent = 'job_loss' | 'medical' | 'wedding' | 'promotion' | 'inflation' | 'crash' | 'boom'
export interface YearMarket {
  /** total return of each market-linked choice this year, e.g. -0.2 for a 20% fall */
  etf: number; mf: number; stocks: number
  debt: number
  inflation: number
  crash: boolean
  boom: boolean
  /** ids of the public headlines that broke this year */
  news: string[]
}
/** A crash year ends with the index at least this far down. */
const CRASH_YEAR = -0.15

export interface Career { seed: number; startAge: number; retireAge: number; years: number; market: YearMarket[]; life: LifeEvent[][] }

/** Builds the market and life events for a career. The same seed and ages give the same career. */
export function buildCareer(seed: number, startAge: number, retireAge = 60): Career {
  const years = Math.max(retireAge - startAge, 1)
  const r = stream(fork(seed, 1))
  // decide crash and boom years first, so the last decade is sure to hold one crash
  const crash = Array.from({ length: years }, () => false)
  const boom = Array.from({ length: years }, () => false)
  for (let y = 1; y < years; y++) {
    if (!crash[y - 1] && r.chance(0.07)) crash[y] = true
    else if (r.chance(0.05)) boom[y] = true
  }
  if (years >= 10) {
    const from = years - 8, to = years - 3
    if (!crash.slice(from, to + 1).some(Boolean)) {
      const y = from + r.int(to - from + 1)
      crash[y] = true; boom[y] = false
      if (crash[y - 1]) crash[y - 1] = false
      if (y + 1 < years) crash[y + 1] = false
    }
  }

  const market: YearMarket[] = []
  const life: LifeEvent[][] = []
  let m: Market = createMarket(fork(seed, 2))
  for (let y = 0; y < years; y++) {
    if (y > 0 && crash[y - 1]) m = release(m, 'recovery')
    // the year, with a scripted shock part-way through when one is due
    const shockDay = 40 + r.int(120)
    const playOut = (start: Market) => {
      const first = run(start, shockDay, { auto: 1 / 45 })
      let mid = first[first.length - 1]
      if (crash[y]) mid = release(mid, 'crash')
      if (boom[y]) mid = release(mid, 'boom')
      return [...first, ...run(mid, TRADING_DAYS - shockDay, { auto: 1 / 45 }).slice(1)]
    }
    let history = playOut(m)
    // a crash year must read as one: if ordinary noise happened to cancel the fall,
    // replay the year with a different (still seeded) run of noise
    for (let attempt = 1; crash[y] && fundReturn(history, INDEX_ETF) > CRASH_YEAR && attempt <= 12; attempt++) {
      history = playOut({ ...m, rng: fork(m.rng, attempt) })
    }
    m = history[history.length - 1]

    const events: LifeEvent[] = []
    if (crash[y]) events.push('crash')
    if (boom[y]) events.push('boom')
    const spike = y > 0 && r.chance(0.06)
    if (spike) events.push('inflation')
    if (y > 0) {
      const roll = r.next()
      if (roll < 0.04) events.push('job_loss')
      else if (roll < 0.09) events.push('medical')
      else if (roll < 0.12 && y < 12) events.push('wedding')
      else if (roll < 0.2) events.push('promotion')
    }
    life.push(events)
    market.push({
      etf: fundReturn(history, INDEX_ETF), mf: fundReturn(history, ACTIVE_FUND), stocks: fundReturn(history, STOCK_PICKS),
      debt: A.debtRate + (r.next() - 0.5) * 0.02,
      inflation: spike ? A.inflationSpike : A.inflation,
      crash: crash[y], boom: boom[y],
      news: history.flatMap(d => d.released).filter(id => id !== 'crash' && id !== 'boom' && id !== 'recovery'),
    })
  }
  return { seed, startAge, retireAge, years, market, life }
}

export interface Sim {
  /** years played so far */
  year: number
  /** monthly take-home pay this year */
  salary: number
  balances: Record<Bucket, number>
  /** everything paid in so far */
  paid: number
  /** total corpus at the end of each year played */
  history: number[]
  /** prices now compared with the start (1 = no inflation yet) */
  priceLevel: number
  /** years a panic-selling ghost still sits in cash */
  panicLeft: number
}
export const startSim = (salary: number): Sim => ({
  year: 0, salary, paid: 0, history: [], priceLevel: 1, panicLeft: 0,
  balances: { nps: 0, apy: 0, ppf: 0, epf: 0, mf: 0, etf: 0, stocks: 0, fd: 0 },
})
export const corpusOf = (s: Sim) => ALL.reduce((sum, b) => sum + s.balances[b], 0)
/** Share of the corpus that follows the stock market, counting the equity part of NPS. */
export function equityShare(s: Sim, plan: Plan) {
  const total = corpusOf(s)
  return total ? (MARKET_BUCKETS.reduce((sum, b) => sum + s.balances[b], 0) + s.balances.nps * plan.npsEquity) / total : 0
}

export interface YearReport {
  /** age during this year */
  age: number
  events: LifeEvent[]
  news: string[]
  /** amount saved this year after life events */
  saved: number
  /** amount a life event took out of savings and withdrawable money */
  cost: number
  corpusBefore: number
  corpusAfter: number
  /** this year's return on the index ETF, the "market" figure shown to the player */
  marketReturn: number
  /** rupees the market-linked part gained or lost this year */
  marketGain: number
  /** rupees the guaranteed part gained this year */
  safeGain: number
}

/** Plays one year. Returns the new state and what happened; the given state is not changed. */
export function playYear(c: Career, s: Sim, plan: Plan): { sim: Sim; report: YearReport } {
  const y = s.year
  const mk = c.market[y]
  const events = c.life[y]
  const salary = events.includes('promotion') ? s.salary * 1.1 : s.salary
  const b = { ...s.balances }
  const corpusBefore = corpusOf(s)

  let saved = events.includes('job_loss') ? 0 : salary * 12 * plan.saveRate
  let cost = events.includes('medical') ? salary * 3 : events.includes('wedding') ? salary * 6 : 0
  const fromSaving = Math.min(saved, cost)
  saved -= fromSaving
  let owed = cost - fromSaving
  if (owed > 0) {
    // locked schemes cannot pay for emergencies; the rest is sold in proportion
    const free = ALL.filter(k => !LOCKED.includes(k))
    const pool = free.reduce((sum, k) => sum + b[k], 0)
    const take = Math.min(owed, pool)
    if (pool > 0) free.forEach(k => { b[k] -= take * (b[k] / pool) })
    owed -= take
  }
  cost -= owed // what could not be paid is not modelled as debt

  // split this year's saving by weight, respecting yearly limits; anything over a limit goes to NPS
  const weightSum = ALL.reduce((sum, k) => sum + (plan.weights[k] ?? 0), 0)
  const put: Record<Bucket, number> = { nps: 0, apy: 0, ppf: 0, epf: 0, mf: 0, etf: 0, stocks: 0, fd: 0 }
  if (weightSum > 0) ALL.forEach(k => { put[k] = saved * ((plan.weights[k] ?? 0) / weightSum) })
  else put.nps = saved
  const over = Math.max(put.ppf - A.ppfYearlyLimit, 0) + Math.max(put.apy - A.apyYearlyLimit, 0)
  put.ppf = Math.min(put.ppf, A.ppfYearlyLimit); put.apy = Math.min(put.apy, A.apyYearlyLimit); put.nps += over

  const equity = Math.min(Math.max(plan.npsEquity, 0), A.npsEquityCap)
  const rate: Record<Bucket, number> = {
    nps: equity * mk.etf + (1 - equity) * mk.debt,
    apy: A.apyRate, ppf: A.ppfRate, epf: A.epfRate, fd: A.fdRate,
    mf: mk.mf, etf: mk.etf, stocks: mk.stocks,
  }
  let marketGain = 0, safeGain = 0
  ALL.forEach(k => {
    // money added during the year earns about half a year's return
    const gain = b[k] * rate[k] + put[k] * (rate[k] / 2)
    if (MARKET_BUCKETS.includes(k)) marketGain += gain
    else if (k === 'nps') { marketGain += (b[k] + put[k] / 2) * equity * mk.etf; safeGain += (b[k] + put[k] / 2) * (1 - equity) * mk.debt }
    else safeGain += gain
    b[k] = Math.max(b[k] + put[k] + gain, 0)
  })

  const sim: Sim = {
    year: y + 1, salary: salary * (1 + A.salaryGrowth), balances: b, paid: s.paid + saved,
    priceLevel: s.priceLevel * (1 + mk.inflation), panicLeft: s.panicLeft, history: s.history,
  }
  const corpusAfter = corpusOf(sim)
  sim.history = [...s.history, corpusAfter]
  return { sim, report: { age: c.startAge + y, events, news: mk.news, saved, cost, corpusBefore, corpusAfter, marketReturn: mk.etf, marketGain, safeGain } }
}

export interface Result {
  corpus: number
  lump: number
  /** monthly pension bought with part of the corpus */
  pension: number
  /** pension plus a careful monthly draw from the lump sum */
  income: number
  /** monthly amount needed in retirement */
  need: number
  /** the same figures in today's money */
  corpusToday: number; incomeToday: number; needToday: number
  /** income as a share of need, 1 = fully funded */
  ratio: number
  /** 0 to 100 */
  score: number
  state: 'zero' | 'critical' | 'struggling' | 'stable' | 'thriving'
  paid: number
}

export function result(s: Sim): Result {
  const corpus = corpusOf(s)
  const lump = corpus * (1 - A.annuityShare)
  const pension = (corpus * A.annuityShare * A.annuityRate) / 12
  const income = pension + (lump * A.drawdown) / 12
  // s.salary has already grown once past the last working year
  const need = (s.salary / (1 + A.salaryGrowth)) * A.needShare
  const ratio = need ? income / need : 0
  const pctFunded = ratio * 100
  const state = pctFunded >= 100 ? 'thriving' : pctFunded >= 80 ? 'stable' : pctFunded >= 50 ? 'struggling' : pctFunded >= 20 ? 'critical' : 'zero'
  return {
    corpus, lump, pension, income, need, ratio, state, paid: s.paid,
    corpusToday: corpus / s.priceLevel, incomeToday: income / s.priceLevel, needToday: need / s.priceLevel,
    score: Math.round(Math.min(Math.max(pctFunded, 0), 100)),
  }
}

export type GhostId = 'fd' | 'stocks' | 'balanced' | 'late' | 'panic'
export const GHOSTS: GhostId[] = ['fd', 'stocks', 'balanced', 'late', 'panic']

/** Plays the whole career with a fixed strategy, on the same market and life events as the player. */
export function runGhost(c: Career, salary: number, id: GhostId, saveRate = DEFAULT_PLAN.saveRate): Sim {
  let s = startSim(salary)
  for (let y = 0; y < c.years; y++) {
    let plan: Plan = id === 'fd' ? { weights: { fd: 1 }, npsEquity: 0, saveRate }
      : id === 'stocks' ? { weights: { stocks: 1 }, npsEquity: 0, saveRate }
      : { ...BALANCED, saveRate }
    if (id === 'late' && y < 5) plan = { ...plan, saveRate: 0 }
    if (id === 'panic') {
      if (y > 0 && c.market[y - 1].crash) {
        // sells everything that fell, at the bottom, and waits in cash
        const b = { ...s.balances }
        MARKET_BUCKETS.forEach(k => { b.fd += b[k]; b[k] = 0 })
        s = { ...s, balances: b, panicLeft: 3 }
      }
      if (s.panicLeft > 0) {
        plan = { weights: { fd: 1 }, npsEquity: 0, saveRate }
        s = { ...s, panicLeft: s.panicLeft - 1 }
        if (s.panicLeft === 0) {
          // comes back after the recovery has already happened
          const b = { ...s.balances }
          b.etf += b.fd * 0.6; b.mf += b.fd * 0.4; b.fd = 0
          s = { ...s, balances: b }
        }
      }
    }
    s = playYear(c, s, plan).sim
  }
  return s
}

export type LessonId = 'sequence' | 'panic' | 'early' | 'safety' | 'diversify' | 'fd' | 'inflation' | 'save_more'

/** Up to three lessons, chosen from what actually happened in this run. */
export function lessons(c: Career, player: Sim, ghosts: Record<GhostId, Sim>, lateEquity: number): LessonId[] {
  const out: LessonId[] = []
  const crashes = c.market.map((m, y) => (m.crash ? y : -1)).filter(y => y >= 0)
  const lateCrash = crashes.some(y => y >= c.years - 10)
  const corpus = corpusOf(player)
  const safe = player.balances.apy + player.balances.ppf + player.balances.epf
  if (lateCrash && lateEquity > 0.5) out.push('sequence')
  if (crashes.length && corpusOf(ghosts.panic) < corpusOf(ghosts.balanced)) out.push('panic')
  if (c.years > 8 && corpusOf(ghosts.late) < corpusOf(ghosts.balanced)) out.push('early')
  if (crashes.length && corpus > 0 && safe / corpus > 0.15) out.push('safety')
  if (result(player).ratio < 0.8) out.push('save_more')
  if (corpusOf(ghosts.stocks) < corpusOf(ghosts.balanced)) out.push('diversify')
  if (corpusOf(ghosts.fd) < corpusOf(ghosts.balanced)) out.push('fd')
  out.push('inflation')
  return out.slice(0, 3)
}

/**
 * A monthly amount to try in the real plan: this run's first-year saving, raised by the
 * shortfall, rounded to ₹500. Built from the simulation only.
 */
export function suggestedMonthly(firstSalary: number, plan: Plan, r: Result) {
  const now = firstSalary * plan.saveRate
  const target = r.ratio >= 1 ? now : now / Math.max(r.ratio, 0.25)
  return Math.max(Math.round(Math.min(target, firstSalary * 0.5) / 500) * 500, 500)
}
