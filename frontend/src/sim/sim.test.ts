import { describe, expect, it } from 'vitest'
import { COMPANIES, SECTORS, TRADING_DAYS } from './companies'
import { ACTIVE_FUND, INDEX_ETF, fundStep, navSeries } from './fund'
import { createMarket, release, run, step } from './market'
import { NEWS, NEWS_BY_ID, PUBLIC_NEWS, directionOf, newsEffect, newsWeight } from './news'
import { DEFAULT_PLAN, GHOSTS, buildCareer, corpusOf, lessons, playYear, result, runGhost, startSim, type GhostId, type Sim } from './career'
import { A } from './assumptions'

const sectorIndex = (s: string) => COMPANIES.findIndex(c => c.sector === s)

describe('market', () => {
  it('gives the same prices for the same seed', () => {
    const a = run(createMarket(42), 300, { auto: 1 / 30 })
    const b = run(createMarket(42), 300, { auto: 1 / 30 })
    expect(a.map(d => d.prices)).toEqual(b.map(d => d.prices))
    expect(a.map(d => d.released)).toEqual(b.map(d => d.released))
  })

  it('gives different prices for a different seed', () => {
    const a = run(createMarket(1), 50), b = run(createMarket(2), 50)
    expect(a[50].prices).not.toEqual(b[50].prices)
  })

  it('does not mutate the market it steps from', () => {
    const m = createMarket(7)
    const before = JSON.stringify(m)
    step(release(m, 'rate_cut'))
    expect(JSON.stringify(m)).toBe(before)
  })

  it('splits every move into trend, noise and news', () => {
    const days = run(release(createMarket(9), 'infra_push'), 20)
    for (const d of days.slice(1)) {
      d.parts.forEach((p, i) => {
        expect(p.trend + p.noise + p.news).toBeCloseTo(p.total, 12)
        expect(d.prices[i]).toBeGreaterThan(0)
      })
    }
    // price is the product of every day's total move
    const i = sectorIndex('cement')
    const sum = days.slice(1).reduce((s, d) => s + d.parts[i].total, 0)
    expect(days[20].prices[i]).toBeCloseTo(COMPANIES[i].price * Math.exp(sum), 6)
  })

  it('has no news component when no news is active', () => {
    const days = run(createMarket(3), 30)
    expect(days.every(d => d.parts.every(p => p.news === 0))).toBe(true)
  })
})

describe('news', () => {
  it('has at least 12 public events, each touching a known sector', () => {
    expect(PUBLIC_NEWS.length).toBeGreaterThanOrEqual(12)
    for (const e of NEWS) for (const s of Object.keys(e.impact)) expect(SECTORS).toContain(s)
    expect(new Set(NEWS.map(n => n.id)).size).toBe(NEWS.length)
  })

  it('moves the right sectors in the right direction and leaves the rest alone', () => {
    for (const e of PUBLIC_NEWS) {
      const day = step(release(createMarket(11), e.id))
      COMPANIES.forEach((c, i) => {
        const want = e.impact[c.sector] ?? 0
        expect(Math.sign(day.parts[i].news)).toBe(Math.sign(want))
        expect(directionOf(e, c.sector)).toBe(want > 0 ? 'up' : want < 0 ? 'down' : 'flat')
      })
    }
  })

  it('is strongest on the first day, fades, then stops', () => {
    const e = NEWS_BY_ID.infra_push
    const days = run(release(createMarket(5), e.id), e.ticks + 5).slice(1)
    const news = days.map(d => d.parts[sectorIndex('construction')].news)
    for (let k = 1; k < e.ticks; k++) expect(news[k]).toBeLessThan(news[k - 1])
    expect(news[e.ticks - 1]).toBeGreaterThan(0)
    expect(news.slice(e.ticks).every(v => v === 0)).toBe(true)
    expect(days[e.ticks - 1].active).toEqual([])
  })

  it('adds up to the stated total effect', () => {
    const e = NEWS_BY_ID.loan_defaults
    let total = 0
    for (let k = 0; k < e.ticks + 3; k++) total += newsEffect(e, 'bank', k)
    expect(total).toBeCloseTo(e.impact.bank!, 12)
    expect(newsWeight(e.ticks, -1)).toBe(0)
  })
})

describe('funds', () => {
  it('charges the expense ratio a little each day', () => {
    const flat = COMPANIES.map(c => c.price)
    // prices do not move, so the only change is the fee
    expect(fundStep(100, flat, flat, { id: 'x', weights: flat.map(() => 1), expense: 0 })).toBe(100)
    const afterYear = Array.from({ length: TRADING_DAYS }).reduce<number>(nav => fundStep(nav, flat, flat, ACTIVE_FUND), 100)
    expect(afterYear).toBeCloseTo(100 * Math.pow(1 - 0.015 / TRADING_DAYS, TRADING_DAYS), 9)
    expect(afterYear).toBeLessThan(98.6)
    expect(afterYear).toBeGreaterThan(98.4)
  })

  it('makes a costly fund trail the same basket with a low fee', () => {
    const history = run(createMarket(21), TRADING_DAYS * 10)
    const cheap = navSeries(history, { ...INDEX_ETF, expense: 0.001 })
    const costly = navSeries(history, { ...INDEX_ETF, expense: 0.015 })
    const last = history.length - 1
    expect(costly[last]).toBeLessThan(cheap[last])
    expect(costly[last] / cheap[last]).toBeCloseTo(Math.pow((1 - 0.015 / TRADING_DAYS) / (1 - 0.001 / TRADING_DAYS), last), 6)
  })

  it('follows a basket by weight', () => {
    const before = COMPANIES.map(() => 100)
    const after = COMPANIES.map((_, i) => (i === 0 ? 110 : 100))
    const onlyFirst = { id: 'a', weights: COMPANIES.map((_, i) => (i === 0 ? 1 : 0)), expense: 0 }
    expect(fundStep(100, before, after, onlyFirst)).toBeCloseTo(110, 9)
    expect(fundStep(100, before, after, { id: 'b', weights: COMPANIES.map(() => 1), expense: 0 })).toBeCloseTo(100 + 10 / COMPANIES.length, 9)
  })
})

describe('retirement run', () => {
  const career = buildCareer(2026, 25)
  const play = () => { let s = startSim(40000); for (let y = 0; y < career.years; y++) s = playYear(career, s, DEFAULT_PLAN).sim; return s }

  it('builds the same career for the same seed', () => {
    expect(buildCareer(2026, 25)).toEqual(career)
    expect(buildCareer(2027, 25).market).not.toEqual(career.market)
  })

  it('always has a crash in the last ten years, and never two in a row', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const c = buildCareer(seed, 25)
      const crash = c.market.map(m => m.crash)
      expect(crash.slice(c.years - 10).some(Boolean)).toBe(true)
      crash.forEach((x, y) => { if (x && y > 0) expect(crash[y - 1]).toBe(false) })
    }
  })

  it('makes crash years hurt the market and leaves guaranteed schemes untouched', () => {
    const y = career.market.findIndex(m => m.crash)
    expect(career.market[y].etf).toBeLessThan(-0.1)
    let s: Sim = { ...startSim(50000), year: y, balances: { nps: 0, apy: 100000, ppf: 100000, epf: 100000, mf: 0, etf: 100000, stocks: 0, fd: 0 } }
    s = playYear(career, s, { weights: {}, npsEquity: 0, saveRate: 0 }).sim
    expect(s.balances.ppf).toBeCloseTo(100000 * (1 + A.ppfRate), 6)
    expect(s.balances.epf).toBeCloseTo(100000 * (1 + A.epfRate), 6)
    expect(s.balances.apy).toBeCloseTo(100000 * (1 + A.apyRate), 6)
    expect(s.balances.etf).toBeLessThan(90000)
  })

  it('shows sequence risk: a late crash costs more with high equity', () => {
    const y = career.market.map(m => m.crash).lastIndexOf(true)
    const start = (): Sim => ({ ...startSim(50000), year: y, balances: { nps: 1000000, apy: 0, ppf: 0, epf: 0, mf: 0, etf: 0, stocks: 0, fd: 0 } })
    const high = playYear(career, start(), { weights: {}, npsEquity: 0.75, saveRate: 0 }).sim
    const low = playYear(career, start(), { weights: {}, npsEquity: 0.1, saveRate: 0 }).sim
    expect(corpusOf(high)).toBeLessThan(corpusOf(low))
  })

  it('respects yearly limits and sends the overflow to NPS', () => {
    const s = playYear({ ...career, life: career.life.map(() => []) }, startSim(500000), { weights: { ppf: 1 }, npsEquity: 0, saveRate: 0.2 }).sim
    expect(s.balances.ppf).toBeLessThanOrEqual(A.ppfYearlyLimit * (1 + A.ppfRate))
    expect(s.balances.nps).toBeGreaterThan(0)
    expect(s.paid).toBeCloseTo(500000 * 12 * 0.2, 6)
  })

  it('skips saving in a job-loss year', () => {
    const y = 3
    const c = { ...career, life: career.life.map((e, i) => (i === y ? ['job_loss' as const] : [])) }
    const { report } = playYear(c, { ...startSim(40000), year: y }, DEFAULT_PLAN)
    expect(report.saved).toBe(0)
  })

  it('scores a finished run and compares it with every ghost', () => {
    const me = play()
    const r = result(me)
    expect(r.corpus).toBeGreaterThan(me.paid)
    expect(r.corpusToday).toBeLessThan(r.corpus)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.income).toBeCloseTo(r.pension + (r.lump * A.drawdown) / 12, 6)
    const ghosts = Object.fromEntries(GHOSTS.map(g => [g, runGhost(career, 40000, g)])) as Record<GhostId, Sim>
    expect(corpusOf(ghosts.late)).toBeLessThan(corpusOf(ghosts.balanced))
    expect(corpusOf(ghosts.panic)).toBeLessThan(corpusOf(ghosts.balanced))
    expect(corpusOf(ghosts.fd)).toBeLessThan(corpusOf(ghosts.balanced))
    const ls = lessons(career, me, ghosts, 0.7)
    expect(ls.length).toBe(3)
    expect(new Set(ls).size).toBe(3)
  })
})
