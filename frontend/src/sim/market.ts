import { COMPANIES, TRADING_DAYS, type Company } from './companies'
import { NEWS_BY_ID, PUBLIC_NEWS, newsEffect } from './news'
import { normal, rand } from './rng'

/** Why one company's price moved today, as log returns. `total` is the sum of the other three. */
export interface Parts { trend: number; noise: number; news: number; total: number }
export interface ActiveNews { id: string; /** the day it was released */ day: number }

/** A market on one day. Plain data: stepping returns a new object and never mutates. */
export interface Market {
  seed: number
  day: number
  prices: number[]
  /** today's move per company, split by cause */
  parts: Parts[]
  active: ActiveNews[]
  /** events released on this day (by the player or the random feed) */
  released: string[]
  /** random generator state */
  rng: number
}

/** How much of each company's daily noise is shared with the whole market. */
const MARKET_SHARE = 0.5
const OWN_SHARE = Math.sqrt(1 - MARKET_SHARE * MARKET_SHARE)
const NO_MOVE: Parts = { trend: 0, noise: 0, news: 0, total: 0 }

export function createMarket(seed: number, companies: Company[] = COMPANIES): Market {
  return { seed, day: 0, prices: companies.map(c => c.price), parts: companies.map(() => NO_MOVE), active: [], released: [], rng: seed | 0 }
}

/** Releases a news event. Its effect starts with the next step. */
export function release(m: Market, id: string): Market {
  if (!NEWS_BY_ID[id]) throw new Error(`Unknown news event: ${id}`)
  return { ...m, active: [...m.active, { id, day: m.day }], released: [...m.released, id] }
}

/**
 * Advances one trading day. Each company's move is trend + noise + news, kept separate so
 * the screen can show why the price moved.
 * `auto` is the chance per day that a random public headline breaks (0 for none).
 */
export function step(m: Market, opts: { auto?: number; companies?: Company[] } = {}): Market {
  const companies = opts.companies ?? COMPANIES
  let rng = m.rng
  let active = m.active
  let released: string[] = []
  if (opts.auto) {
    let roll: number, pick: number
    ;[roll, rng] = rand(rng)
    ;[pick, rng] = rand(rng)
    if (roll < opts.auto) {
      const e = PUBLIC_NEWS[Math.floor(pick * PUBLIC_NEWS.length)]
      active = [...active, { id: e.id, day: m.day }]
      released = [e.id]
    }
  }
  let shared: number
  ;[shared, rng] = normal(rng)
  const parts: Parts[] = []
  const prices: number[] = []
  companies.forEach((c, i) => {
    let own: number
    ;[own, rng] = normal(rng)
    const trend = c.drift / TRADING_DAYS
    const noise = (c.vol / Math.sqrt(TRADING_DAYS)) * (MARKET_SHARE * shared + OWN_SHARE * own)
    const news = active.reduce((s, a) => s + newsEffect(NEWS_BY_ID[a.id], c.sector, m.day - a.day), 0)
    const total = trend + noise + news
    parts.push({ trend, noise, news, total })
    prices.push(m.prices[i] * Math.exp(total))
  })
  const day = m.day + 1
  // drop events whose effect has fully faded
  active = active.filter(a => day - a.day < NEWS_BY_ID[a.id].ticks)
  return { seed: m.seed, day, prices, parts, active, released, rng }
}

/** Runs `days` steps and returns every day, starting with the given market. */
export function run(m: Market, days: number, opts: { auto?: number; companies?: Company[] } = {}): Market[] {
  const out = [m]
  for (let i = 0; i < days; i++) out.push(step(out[out.length - 1], opts))
  return out
}

/** A log return as a percentage change, for display. */
export const pct = (logReturn: number) => (Math.exp(logReturn) - 1) * 100
