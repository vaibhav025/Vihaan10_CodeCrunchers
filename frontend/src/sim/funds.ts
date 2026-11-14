import { COMPANIES, TRADING_DAYS } from './companies'
import { ACTIVE_FUND, INDEX_ETF, fundStep, type Fund } from './fund'
import { createMarket, release, run, step, type Market } from './market'
import { fork, stream } from './rng'

/** Trading days in a month, for SIPs. */
export const MONTH = 21

/** Prices only, for long runs where the per-day breakdown is not needed. */
function pricePath(seed: number, days: number, opts: { crashAt?: number; recoverAfter?: number; auto?: number } = {}) {
  const out: number[][] = []
  let m: Market = createMarket(seed)
  out.push(m.prices)
  for (let d = 0; d < days; d++) {
    if (opts.crashAt === d) m = release(m, 'crash')
    if (opts.crashAt !== undefined && d === opts.crashAt + (opts.recoverAfter ?? 15)) m = release(m, 'recovery')
    m = step(m, { auto: opts.auto ?? 1 / 40 })
    out.push(m.prices)
  }
  return out
}

/** Value of a monthly SIP into each fund over a price path. Units are bought at each month's NAV. */
function sipValues(path: number[][], funds: Fund[], monthly: number) {
  const nav = funds.map(() => 100)
  const units = funds.map(() => 0)
  const series: number[][] = funds.map(() => [])
  for (let d = 0; d < path.length; d++) {
    if (d > 0) funds.forEach((f, i) => { nav[i] = fundStep(nav[i], path[d - 1], path[d], f) })
    if (d % MONTH === 0 && d < path.length - 1) funds.forEach((_, i) => { units[i] += monthly / nav[i] })
    if (d % MONTH === 0 || d === path.length - 1) funds.forEach((_, i) => series[i].push(units[i] * nav[i]))
  }
  return series
}

/**
 * Fee drag: the same monthly SIP into a low-cost index ETF, a costlier active fund, and the
 * active fund's own basket with no fee at all, over `years`. The gap between the last two is
 * what the fee cost in rupees.
 */
export function feeDrag(seed: number, years: number, monthly: number, activeFee = ACTIVE_FUND.expense, etfFee = INDEX_ETF.expense) {
  const path = pricePath(fork(seed, 31), years * TRADING_DAYS)
  const funds: Fund[] = [{ ...INDEX_ETF, expense: etfFee }, { ...ACTIVE_FUND, expense: activeFee }, { ...ACTIVE_FUND, expense: 0 }]
  const [etf, active, noFee] = sipValues(path, funds, monthly)
  const paid = monthly * Math.ceil(path.length / MONTH - 1)
  const last = (s: number[]) => s[s.length - 1]
  return { etf, active, noFee, paid, feeCost: last(noFee) - last(active), gap: last(etf) - last(active) }
}

/** The month the crash arrives in the SIP experiment. */
export const SIP_CRASH_MONTH = 1

/**
 * SIP against a lump sum over two years with a crash early in the first year and a slow
 * recovery, so the SIP keeps buying while prices are down. Both put in the same total; the
 * lump sum goes in on day one. No other news, so the crash is the only story.
 */
export function sipVsLump(seed: number, total = 120000, months = 12, crashMonth = SIP_CRASH_MONTH) {
  // Rarely, a strong run of noise right after the crash cancels the lesson. Replay with a
  // different (still seeded) run of noise so the experiment always shows what it explains.
  let r = sipRun(seed, total, months, crashMonth)
  for (let attempt = 1; attempt <= 20 && !(r.avgCost < 100 && r.sip[r.sip.length - 1] > r.lump[r.lump.length - 1]); attempt++) {
    r = sipRun(fork(seed, 4100 + attempt), total, months, crashMonth)
  }
  return r
}

function sipRun(seed: number, total: number, months: number, crashMonth: number) {
  const days = 24 * MONTH
  const path = pricePath(fork(seed, 41), days, { crashAt: crashMonth * MONTH - 16, recoverAfter: 11 * MONTH, auto: 0 })
  const f = INDEX_ETF
  let nav = 100, sipUnits = 0
  const lumpUnits = total / nav
  const sip: number[] = [], lump: number[] = [], navs: number[] = [], buys: { month: number; nav: number; units: number }[] = []
  for (let d = 0; d <= days; d++) {
    if (d > 0) nav = fundStep(nav, path[d - 1], path[d], f)
    const month = d / MONTH
    if (d % MONTH === 0 && month < months) {
      const u = total / months / nav
      sipUnits += u
      buys.push({ month, nav, units: u })
    }
    if (d % MONTH === 0 || d === days) { sip.push(sipUnits * nav); lump.push(lumpUnits * nav); navs.push(nav) }
  }
  const avgCost = total / sipUnits
  return { sip, lump, navs, buys, total, avgCost, lowest: Math.min(...navs.slice(0, months + 1)) }
}

/**
 * One trading day of an ETF, minute by minute: a random path from yesterday's close that
 * ends exactly at today's close (a Brownian bridge). A mutual fund has only the closing NAV.
 */
export function intraday(prevClose: number, close: number, seed: number, points = 75, dailyVol = 0.012) {
  const r = stream(fork(seed, 51))
  const walk = [0]
  for (let i = 1; i <= points; i++) walk.push(walk[i - 1] + r.normal() * (dailyVol / Math.sqrt(points)))
  const end = walk[points], target = Math.log(close / prevClose)
  return walk.map((w, i) => prevClose * Math.exp(w - (end - target) * (i / points)))
}

/** A few days of an index ETF's closes, for the NAV lesson. */
export function etfCloses(seed: number, days = 6) {
  const hist = run(createMarket(fork(seed, 61)), days, { auto: 1 / 10 })
  let nav = 100
  const closes = [nav]
  for (let i = 1; i < hist.length; i++) { nav = fundStep(nav, hist[i - 1].prices, hist[i].prices, INDEX_ETF); closes.push(nav) }
  return closes
}

/**
 * Baskets against bets: across many simulated markets, ₹1 in each single company against
 * ₹1 in the index ETF, over `years`. Returns every final value.
 */
export function basketVsBets(seeds: number, years = 10, baseSeed = 1) {
  const single: number[] = [], basket: number[] = []
  for (let k = 0; k < seeds; k++) {
    const path = pricePath(fork(baseSeed, 1000 + k), years * TRADING_DAYS, { auto: 1 / 30 })
    const first = path[0], last = path[path.length - 1]
    COMPANIES.forEach((_, i) => single.push(last[i] / first[i]))
    let nav = 1
    for (let d = 1; d < path.length; d++) nav = fundStep(nav, path[d - 1], path[d], INDEX_ETF)
    basket.push(nav)
  }
  const lossShare = (v: number[]) => v.filter(x => x < 1).length / v.length
  const sorted = (v: number[]) => [...v].sort((a, b) => a - b)
  const pctl = (v: number[], p: number) => sorted(v)[Math.min(Math.floor(p * v.length), v.length - 1)]
  return {
    single, basket,
    singleLoss: lossShare(single), basketLoss: lossShare(basket),
    singleRange: [pctl(single, 0.1), pctl(single, 0.9)] as const,
    basketRange: [pctl(basket, 0.1), pctl(basket, 0.9)] as const,
  }
}
