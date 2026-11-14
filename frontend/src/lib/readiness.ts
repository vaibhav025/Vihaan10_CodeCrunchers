import { CLASS, futureValue, norm, toToday, totals, type Money } from './tracker'
import { rupeesShort } from './format'

/**
 * Retirement Readiness Score, 0-100: how ready this person is to retire at their chosen age.
 * Funding is half the score; the rest rewards the habits and safety nets that keep a plan alive.
 */
/** `vars` are the real numbers behind the points, shown to the player. */
export interface Part { key: 'funding' | 'saving' | 'emergency' | 'protection' | 'debt' | 'spread'; got: number; max: number; vars: Record<string, string | number> }
export interface Readiness { score: number; parts: Part[]; needed: number; ratio: number; grade: 'zero' | 'critical' | 'struggling' | 'stable' | 'thriving' }

const clamp = (x: number) => Math.min(Math.max(x, 0), 1)

export function readiness(m0: Money, years: number): Readiness {
  const m = norm(m0)
  const t = totals(m, years)
  // needed in today's rupees: 25 times a year of retirement spending (the 4% rule), at 80% of today's costs
  const needed = (m.expenses || m.income * 0.6) * (m.retireSpend / 100) * 12 * 25
  // ESOPs are uncertain until sold, so only half their projected value counts toward funding
  const esop = m.assets.filter(a => a.type === 'esop').reduce((s, a) => s + toToday(futureValue(a, years), years, m.inflation), 0)
  const ratio = needed ? (t.real - esop * 0.5) / needed : 0
  const top = t.now ? Math.max(...t.byType.map(b => b.value), 0) / t.now : 1
  const riskyTop = t.now ? Math.max(...t.byType.filter(b => CLASS[b.type].risky).map(b => b.value), 0) / t.now : 0
  const parts: Part[] = [
    { key: 'funding', max: 50, got: clamp(ratio) * 50, vars: { have: rupeesShort(t.real - esop * 0.5), need: rupeesShort(needed), p: Math.round(ratio * 100) } },
    { key: 'saving', max: 15, got: m.income ? clamp(t.investing / m.income / 0.2) * 15 : 0, vars: { p: m.income ? Math.round((t.investing / m.income) * 100) : 0 } },
    { key: 'emergency', max: 10, got: m.expenses ? clamp(t.liquid / m.expenses / 6) * 10 : 0, vars: { n: (m.expenses ? t.liquid / m.expenses : 0).toFixed(1) } },
    { key: 'protection', max: 10, got: (m.health ? 5 : 0) + (m.term ? 5 : 0), vars: { n: +m.health + +m.term } },
    { key: 'debt', max: 10, got: !m.income ? 0 : (1 - clamp((m.emi / m.income - 0.3) / 0.3)) * 10, vars: { p: m.income ? Math.round((m.emi / m.income) * 100) : 0 } },
    { key: 'spread', max: 5, got: !t.now ? 0 : t.byType.length >= 3 && top <= 0.6 && riskyTop <= 0.4 ? 5 : t.byType.length >= 2 ? 2.5 : 0, vars: { n: t.byType.length, p: Math.round(top * 100) } },
  ]
  const score = Math.round(parts.reduce((s, p) => s + p.got, 0))
  return { score, parts, needed, ratio, grade: score >= 80 ? 'thriving' : score >= 60 ? 'stable' : score >= 40 ? 'struggling' : score >= 20 ? 'critical' : 'zero' }
}

/** The part with the most points still on the table: the next best thing to work on. */
export const weakest = (r: Readiness) => [...r.parts].sort((a, b) => (b.max - b.got) - (a.max - a.got))[0]
