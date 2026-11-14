import type { Sector } from './companies'

/**
 * News events as data. Text is not stored here: each event's headline, explanation and
 * per-sector reason are translation keys built from its id:
 *   lab.n.<id>.h          headline
 *   lab.n.<id>.x          plain-language explanation
 *   lab.n.<id>.<sector>   why that sector moved
 */
export interface NewsEvent {
  id: string
  /** Total price effect per sector as a log return: 0.06 is roughly +6%. Missing = no effect. */
  impact: Partial<Record<Sector, number>>
  /** Trading days the effect lasts. It is strongest on day one and fades. */
  ticks: number
  /** Scripted events are used by lessons only and never appear in the random feed or the news round. */
  scripted?: boolean
}

export const NEWS: NewsEvent[] = [
  { id: 'rate_hike', ticks: 8, impact: { construction: -0.05, cement: -0.03, steel: -0.03, pay: -0.04, bank: 0.03 } },
  { id: 'rate_cut', ticks: 8, impact: { construction: 0.05, cement: 0.03, steel: 0.03, pay: 0.04, bank: -0.02 } },
  { id: 'infra_push', ticks: 10, impact: { construction: 0.08, cement: 0.07, steel: 0.06, bank: 0.02 } },
  { id: 'import_tax', ticks: 7, impact: { steel: 0.07, construction: -0.03 } },
  { id: 'export_slump', ticks: 8, impact: { it: -0.06, pharma: -0.04, steel: -0.03 } },
  { id: 'loan_defaults', ticks: 9, impact: { bank: -0.09, pay: -0.03, construction: -0.02 } },
  { id: 'pay_rule', ticks: 7, impact: { pay: -0.1, bank: 0.02 } },
  { id: 'good_monsoon', ticks: 8, impact: { fmcg: 0.05, bank: 0.02, cement: 0.02 } },
  { id: 'oil_spike', ticks: 8, impact: { cement: -0.04, construction: -0.03, fmcg: -0.03, steel: -0.02 } },
  { id: 'pharma_approval', ticks: 6, impact: { pharma: 0.09 } },
  { id: 'mfg_budget', ticks: 9, impact: { steel: 0.05, cement: 0.04, construction: 0.04, pharma: 0.02 } },
  { id: 'recession_scare', ticks: 12, impact: { pay: -0.09, it: -0.08, steel: -0.08, bank: -0.07, construction: -0.07, cement: -0.05, fmcg: -0.02, pharma: -0.02 } },
  { id: 'it_exports', ticks: 7, impact: { it: 0.08, pay: 0.02 } },
  // scripted, for the panic test and Retirement Run
  { id: 'crash', ticks: 15, scripted: true, impact: { pay: -0.48, steel: -0.42, construction: -0.42, bank: -0.4, it: -0.38, cement: -0.34, pharma: -0.22, fmcg: -0.18 } },
  { id: 'recovery', ticks: 60, scripted: true, impact: { pay: 0.4, steel: 0.36, construction: 0.36, bank: 0.34, it: 0.33, cement: 0.29, pharma: 0.19, fmcg: 0.15 } },
  { id: 'boom', ticks: 40, scripted: true, impact: { pay: 0.13, it: 0.12, bank: 0.11, construction: 0.11, steel: 0.1, cement: 0.08, pharma: 0.06, fmcg: 0.05 } },
]

export const NEWS_BY_ID: Record<string, NewsEvent> = Object.fromEntries(NEWS.map(n => [n.id, n]))
/** Events that can appear in the random feed and be picked in the news round. */
export const PUBLIC_NEWS = NEWS.filter(n => !n.scripted)

/** Each day's effect is this fraction of the day before. */
const FADE = 0.72

/**
 * The share of an event's total effect that lands on a given day since release (0 = the day
 * it breaks). Shares fall geometrically and add up to 1 over `ticks` days; after that, 0.
 */
export function newsWeight(ticks: number, daysSince: number) {
  if (daysSince < 0 || daysSince >= ticks) return 0
  return ((1 - FADE) * Math.pow(FADE, daysSince)) / (1 - Math.pow(FADE, ticks))
}

/** The effect of one event on one sector on a given day since release. */
export const newsEffect = (e: NewsEvent, sector: Sector, daysSince: number) => (e.impact[sector] ?? 0) * newsWeight(e.ticks, daysSince)

export type Direction = 'up' | 'down' | 'flat'
/** Which way an event pushes a sector, used to score predictions. */
export const directionOf = (e: NewsEvent, sector: Sector): Direction => {
  const v = e.impact[sector] ?? 0
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'
}
