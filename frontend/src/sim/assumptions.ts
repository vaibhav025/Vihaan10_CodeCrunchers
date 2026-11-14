/**
 * Every rate and limit the Retirement Run uses, in one place.
 *
 * These are teaching assumptions for a simulation, not official figures. Anything marked
 * `verify: true` has not been checked against the official source and must be confirmed
 * (TODO verify) before it is presented as a real scheme rule.
 */
export interface Assumption { value: number; source: string; lastChecked: string; verify: boolean }

export const ASSUMPTIONS = {
  /** TODO verify: PPF rate is set by the government every quarter. */
  ppfRate: { value: 0.071, source: 'Same default as src/lib/tracker.ts (CLASS.ppf); official rate is notified quarterly by the Ministry of Finance', lastChecked: '2026-11', verify: true },
  ppfYearlyLimit: { value: 150000, source: 'backend/app/ml/finance_knowledge_base.json (id: ppf)', lastChecked: '2026-11', verify: false },
  /** TODO verify: EPF rate is declared by EPFO each year. */
  epfRate: { value: 0.0825, source: 'Same default as src/lib/tracker.ts (CLASS.epf); official rate is declared yearly by EPFO', lastChecked: '2026-11', verify: true },
  /** TODO verify: APY pays a fixed pension chosen at joining, not a rate. This rate only stands in for "guaranteed" in the simulation. */
  apyRate: { value: 0.075, source: 'Simulation assumption, not an official figure', lastChecked: '2026-11', verify: true },
  /** TODO verify: real APY contributions depend on joining age and the pension chosen. */
  apyYearlyLimit: { value: 15000, source: 'Simulation assumption, not an official figure', lastChecked: '2026-11', verify: true },
  fdRate: { value: 0.065, source: 'Simulation assumption', lastChecked: '2026-11', verify: false },
  debtRate: { value: 0.07, source: 'Simulation assumption for the non-equity part of NPS', lastChecked: '2026-11', verify: false },
  inflation: { value: 0.06, source: 'Same default as the Tracker (Money.inflation)', lastChecked: '2026-11', verify: false },
  inflationSpike: { value: 0.1, source: 'Simulation assumption', lastChecked: '2026-11', verify: false },
  salaryGrowth: { value: 0.065, source: 'Simulation assumption', lastChecked: '2026-11', verify: false },
  /** Share of the corpus turned into a monthly pension at 60. The real NPS minimum differs: TODO verify in Phase 2. */
  annuityShare: { value: 0.4, source: 'Simulation assumption', lastChecked: '2026-11', verify: true },
  /** TODO verify: annuity rates vary by provider and over time. */
  annuityRate: { value: 0.06, source: 'Simulation assumption', lastChecked: '2026-11', verify: true },
  /** Yearly share of the lump sum that can be spent without running out too soon. */
  drawdown: { value: 0.04, source: 'Simulation assumption', lastChecked: '2026-11', verify: false },
  /** Retirement spending as a share of final take-home pay. */
  needShare: { value: 0.5, source: 'Simulation assumption', lastChecked: '2026-11', verify: false },
  /** The most equity NPS allows in this simulation. TODO verify against the current PFRDA Active Choice cap. */
  npsEquityCap: { value: 0.75, source: 'Simulation assumption', lastChecked: '2026-11', verify: true },
} satisfies Record<string, Assumption>

export const A = Object.fromEntries(Object.entries(ASSUMPTIONS).map(([k, v]) => [k, v.value])) as Record<keyof typeof ASSUMPTIONS, number>
