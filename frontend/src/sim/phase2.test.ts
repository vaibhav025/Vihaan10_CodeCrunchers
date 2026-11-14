import { describe, expect, it } from 'vitest'
import { basketVsBets, etfCloses, feeDrag, intraday, sipVsLump } from './funds'
import { buildQuiz } from './quiz'
import { ALL_FACTS, APY, EPF, NPS, PPF, apy, epf, lifecycleEquity, npsExit, npsTaxSaved, ppf } from './schemes'

describe('fund experiments', () => {
  it('shows fee drag: the fee costs rupees, and is the same seed every time', () => {
    const a = feeDrag(7, 30, 5000), b = feeDrag(7, 30, 5000)
    expect(a.active).toEqual(b.active)
    const last = (s: number[]) => s[s.length - 1]
    expect(a.feeCost).toBeGreaterThan(0)
    expect(last(a.noFee)).toBeGreaterThan(last(a.active))
    expect(a.feeCost).toBeCloseTo(last(a.noFee) - last(a.active), 6)
    expect(a.paid).toBe(5000 * 12 * 30)
    // a 1.5% fee over 30 years of SIPs takes a large bite
    expect(a.feeCost / last(a.noFee)).toBeGreaterThan(0.15)
    // a higher fee always costs more on the same market
    expect(feeDrag(7, 30, 5000, 0.02).feeCost).toBeGreaterThan(a.feeCost)
  })

  it('makes the SIP finish ahead of the lump sum on every market, as the lesson says', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = sipVsLump(seed)
      expect(r.avgCost, `seed ${seed}`).toBeLessThan(100)
      expect(r.sip[r.sip.length - 1], `seed ${seed}`).toBeGreaterThan(r.lump[r.lump.length - 1])
    }
    expect(sipVsLump(2026).avgCost).toBeLessThan(100)
  })

  it('compares a SIP with a lump sum through a crash', () => {
    const r = sipVsLump(3)
    expect(r.buys.length).toBe(12)
    expect(r.buys.reduce((s, b) => s + b.units * b.nav, 0)).toBeCloseTo(r.total, 6)
    // the lump sum bought everything at the starting NAV of 100; the SIP bought through the fall
    expect(r.avgCost).toBeLessThan(100)
    expect(r.lowest).toBeLessThan(85)
    expect(r.sip.length).toBe(r.lump.length)
    expect(r.sip[r.sip.length - 1]).toBeGreaterThan(r.lump[r.lump.length - 1])
  })

  it('draws an intraday path that starts at the last close and ends at today’s close', () => {
    const p = intraday(100, 101.5, 9)
    expect(p[0]).toBeCloseTo(100, 9)
    expect(p[p.length - 1]).toBeCloseTo(101.5, 9)
    expect(new Set(p.map(x => x.toFixed(4))).size).toBeGreaterThan(20)
    expect(intraday(100, 101.5, 9)).toEqual(p)
    expect(etfCloses(5).length).toBe(7)
  })

  it('shows baskets beat bets: single companies lose more often and spread wider', () => {
    const r = basketVsBets(40, 10)
    expect(r.single.length).toBe(40 * 8)
    expect(r.basket.length).toBe(40)
    expect(r.singleLoss).toBeGreaterThan(r.basketLoss)
    expect(r.singleRange[1] / r.singleRange[0]).toBeGreaterThan(r.basketRange[1] / r.basketRange[0])
  })
})

describe('scheme data', () => {
  it('gives every fact a source and a last-checked date', () => {
    for (const [k, f] of Object.entries(ALL_FACTS)) {
      expect(f.source.length, k).toBeGreaterThan(5)
      expect(f.lastChecked, k).toMatch(/^\d{4}-\d{2}$/)
      expect(typeof f.verify, k).toBe('boolean')
    }
  })

  it('only treats knowledge-base facts as verified', () => {
    for (const [k, f] of Object.entries(ALL_FACTS)) {
      if (!f.verify) expect(f.source, k).toMatch(/knowledge_base\.json/)
    }
    // APY is not in the knowledge base at all, so every APY figure must be flagged
    for (const f of Object.values(APY)) expect(f.verify).toBe(true)
    expect(PPF.rate.verify && EPF.rate.verify && NPS.annuityRate.verify).toBe(true)
  })
})

describe('scheme calculators', () => {
  it('NPS exit keeps at least the minimum for a pension', () => {
    const e = npsExit(1000000)
    expect(e.lump).toBe(800000)
    expect(e.annuity).toBe(200000)
    expect(e.pension).toBeCloseTo((200000 * NPS.annuityRate.value) / 12, 9)
    expect(npsExit(1000000, 1).lump).toBe(800000)   // cannot take more than the cap
    expect(npsExit(1000000, 0.5).annuity).toBe(500000)
    expect(NPS.maxLumpShare.value + NPS.minAnnuityShare.value).toBeCloseTo(1, 9)
  })

  it('Auto Choice lowers equity with age', () => {
    expect(lifecycleEquity('LC75', 25)).toBe(0.75)
    expect(lifecycleEquity('LC75', 55)).toBe(0.15)
    expect(lifecycleEquity('LC75', 60)).toBe(0.15)
    expect(lifecycleEquity('LC50', 45)).toBeLessThan(0.5)
    expect(lifecycleEquity('LC50', 45)).toBeGreaterThan(0.1)
    let prev = 1
    for (let age = 20; age <= 60; age++) { const e = lifecycleEquity('LC25', age); expect(e).toBeLessThanOrEqual(prev); prev = e }
  })

  it('NPS tax saving is capped at the 80CCD(1B) limit', () => {
    expect(npsTaxSaved(30000, 0.2)).toBe(6000)
    expect(npsTaxSaved(90000, 0.3)).toBe(15000)
    expect(npsTaxSaved(-5, 0.3)).toBe(0)
  })

  it('APY costs more the later you join, for the same pension', () => {
    expect(apy(18, 1000).monthly).toBe(42)
    expect(apy(40, 1000).monthly).toBe(291)
    expect(apy(18, 5000).monthly).toBe(210)
    for (let age = 19; age <= 40; age++) expect(apy(age, 3000).monthly).toBeGreaterThan(apy(age - 1, 3000).monthly)
    expect(apy(50, 1000).age).toBe(40)             // clamped to the joining window
    expect(apy(30, 2000).years).toBe(30)
    expect(apy(30, 2000).paid).toBe(apy(30, 2000).monthly * 12 * 30)
    expect(APY.base.value.length).toBe(APY.maxJoinAge.value - APY.minJoinAge.value + 1)
  })

  it('PPF respects its yearly limits and compounds', () => {
    expect(ppf(999999).deposit).toBe(150000)
    expect(ppf(10).deposit).toBe(500)
    const p = ppf(100000)
    expect(p.paid).toBe(1500000)
    expect(p.value).toBeGreaterThan(p.paid)
    expect(p.interest).toBeCloseTo(p.value - p.paid, 6)
    expect(ppf(100000, 15, 0).value).toBe(1500000)
  })

  it('EPF splits 24% of basic pay and grows', () => {
    const e = epf(30000, 20)
    expect(e.month.employee).toBe(3600)
    expect(e.month.employee + e.month.employerEpf + e.month.eps).toBeCloseTo(30000 * 0.24, 6)
    expect(e.month.eps).toBeCloseTo(15000 * EPF.epsShare.value, 6)
    expect(e.balance).toBeGreaterThan((e.month.employee + e.month.employerEpf) * 12 * 20)
    expect(epf(30000, 0).balance).toBe(0)
  })
})

describe('schemes quiz', () => {
  it('has ten questions whose answers come from the data file', () => {
    const q = buildQuiz()
    expect(q.length).toBe(10)
    expect(new Set(q.map(x => x.id)).size).toBe(10)
    for (const x of q) {
      expect(x.options.length).toBe(3)
      expect(x.answer).toBeGreaterThanOrEqual(0)
      expect(x.answer).toBeLessThan(3)
      expect(new Set(x.options).size).toBe(3)
      for (const f of x.facts) expect(ALL_FACTS[f], f).toBeDefined()
    }
    expect(q.find(x => x.id === 'nps_exit')!.options[1]).toBe('80%')
    expect(q.find(x => x.id === 'ppf_years')!.options[1]).toBe(String(PPF.years.value))
  })
})
