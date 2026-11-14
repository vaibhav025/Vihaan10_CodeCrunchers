/**
 * Government scheme rules used by the Lab: one place, each with where it came from and when
 * it was last checked.
 *
 * `verify: true` (TODO verify) means the figure did not come from the project's own knowledge
 * base and has not been checked against the official source. The UI shows a "check before
 * relying on this" mark next to every such figure. Do not remove the flag without checking.
 */
export interface Fact<T = number> { value: T; source: string; lastChecked: string; verify: boolean }

const KB_NPS = 'backend/app/ml/nps_knowledge_base.json'
const KB_FIN = 'backend/app/ml/finance_knowledge_base.json'
const CHECKED = '2026-11'
const kb = <T,>(value: T, where: string): Fact<T> => ({ value, source: where, lastChecked: CHECKED, verify: false })
/** TODO verify: not in the knowledge base. */
const unverified = <T,>(value: T, source: string): Fact<T> => ({ value, source, lastChecked: CHECKED, verify: true })

export const NPS = {
  regulator: kb('PFRDA', `${KB_NPS} (nps_overview.regulator)`),
  minContribution: kb(500, `${KB_NPS} (nps_overview.min_contribution_tier1)`),
  minYearly: kb(1000, `${KB_NPS} (nps_overview.min_annual_contribution_tier1)`),
  maturityAge: kb(60, `${KB_NPS} (nps_overview.maturity_age)`),
  /** Eligible non-government normal exits, effective 16 Dec 2025, subject to corpus thresholds. */
  maxLumpShare: kb(0.8, `${KB_NPS} (tier_accounts.tier_1.maturity)`),
  minAnnuityShare: kb(0.2, `${KB_NPS} (tier_accounts.tier_1.maturity)`),
  partialWithdrawShare: kb(0.25, `${KB_NPS} (faqs: withdraw before 60)`),
  partialWithdrawAfterYears: kb(3, `${KB_NPS} (faqs: withdraw before 60)`),
  /** Highest equity share under Auto Choice (LC75). */
  autoEquityCap: kb(0.75, `${KB_NPS} (asset_classes.E)`),
  /** TODO verify: the equity cap for Active Choice is not in the knowledge base. */
  activeEquityCap: unverified(0.75, 'Assumed equal to the Auto Choice cap; check current PFRDA Active Choice rules'),
  /** Auto Choice profiles: equity share at 25 and at 55. */
  lifecycle: kb({ LC75: [0.75, 0.15], LC50: [0.5, 0.1], LC25: [0.25, 0.05] } as Record<'LC75' | 'LC50' | 'LC25', [number, number]>, `${KB_NPS} (auto_choice_profiles)`),
  /** TODO verify: the age the taper starts. The knowledge base gives only the shares at 25 and 55. */
  taperStartAge: unverified(35, 'Simulation assumption about the Auto Choice glide path; check the PFRDA schedule'),
  tax80CCD1B: kb(50000, `${KB_NPS} (tax_benefits.section_80ccd_1b)`),
  tax80C: kb(150000, `${KB_NPS} (tax_benefits.section_80ccd_1)`),
  /** Employer contribution deductible under 80CCD(2), as a share of salary. */
  tax80CCD2Govt: kb(0.14, `${KB_NPS} (tax_benefits.section_80ccd_2)`),
  /** TODO verify: the limit for private employers may differ by tax regime. */
  tax80CCD2Other: unverified(0.1, `${KB_NPS} (tax_benefits.section_80ccd_2) gives 10% for non-government; may differ under the new regime`),
  /** TODO verify: annuity rates vary by provider and over time. */
  annuityRate: unverified(0.06, 'Simulation assumption, not a quoted annuity rate'),
} as const

/**
 * Atal Pension Yojana. TODO verify: none of these figures are in the knowledge base. The
 * contribution table is the commonly published chart for a ₹1,000 pension; other pension
 * levels are treated as multiples of it, which matches the published chart to within a rupee.
 */
export const APY = {
  minJoinAge: unverified(18, 'PFRDA APY scheme details; not in the knowledge base'),
  maxJoinAge: unverified(40, 'PFRDA APY scheme details; not in the knowledge base'),
  pensionAge: unverified(60, 'PFRDA APY scheme details; not in the knowledge base'),
  pensions: unverified([1000, 2000, 3000, 4000, 5000], 'PFRDA APY scheme details; not in the knowledge base'),
  /** Monthly contribution for a ₹1,000 pension, by joining age 18 to 40. */
  base: unverified([42, 46, 50, 54, 59, 64, 70, 76, 82, 90, 97, 106, 116, 126, 138, 151, 165, 181, 198, 218, 240, 264, 291], 'Published APY contribution chart for a ₹1,000 pension; check against PFRDA'),
  /** Amount returned to the nominee per ₹1,000 of monthly pension. */
  corpusPer1000: unverified(170000, 'Published APY chart; check against PFRDA'),
} as const

export const PPF = {
  minYearly: kb(500, `${KB_FIN} (id: ppf)`),
  maxYearly: kb(150000, `${KB_FIN} (id: ppf)`),
  years: kb(15, `${KB_FIN} (id: ppf)`),
  taxFree: kb(true, `${KB_FIN} (id: ppf)`),
  /** TODO verify: the government sets this every quarter. */
  rate: unverified(0.071, 'Tracker default (src/lib/tracker.ts); official rate is set quarterly'),
  /** TODO verify. */
  extendBlockYears: unverified(5, 'Not in the knowledge base; check current PPF rules'),
} as const

export const EPF = {
  employeeShare: kb(0.12, `${KB_FIN} (id: epf)`),
  employerShare: kb(0.12, `${KB_FIN} (id: epf), "the employer matches it"`),
  /** TODO verify: the part of the employer's 12% that goes to the pension scheme (EPS), and its wage ceiling. */
  epsShare: unverified(0.0833, 'Not in the knowledge base; check EPFO rules'),
  epsWageCap: unverified(15000, 'Not in the knowledge base; check EPFO rules'),
  /** TODO verify: declared by EPFO each year. */
  rate: unverified(0.0825, 'Tracker default (src/lib/tracker.ts); official rate is declared yearly'),
} as const

/** Every fact, for the "sources" list and for tests. */
export const ALL_FACTS: Record<string, Fact<unknown>> = Object.fromEntries(
  Object.entries({ NPS, APY, PPF, EPF }).flatMap(([group, facts]) => Object.entries(facts).map(([k, f]) => [`${group}.${k}`, f as Fact<unknown>])),
)

// ---------- calculators (pure) ----------

/** Equity share under an Auto Choice profile at a given age. Flat before the taper, then a straight line to the 55 figure. */
export function lifecycleEquity(profile: keyof typeof NPS.lifecycle.value, age: number) {
  const [young, old] = NPS.lifecycle.value[profile]
  const start = NPS.taperStartAge.value
  if (age <= start) return young
  if (age >= 55) return old
  return young + ((old - young) * (age - start)) / (55 - start)
}

/** How a corpus can be taken at 60 under the normal exit rule. */
export function npsExit(corpus: number, lumpShare = NPS.maxLumpShare.value) {
  const lump = corpus * Math.min(Math.max(lumpShare, 0), NPS.maxLumpShare.value)
  const annuity = corpus - lump
  return { lump, annuity, pension: (annuity * NPS.annuityRate.value) / 12 }
}

/** Old-regime tax saved by the extra 80CCD(1B) deduction, at a given slab rate. Cess is not included. */
export const npsTaxSaved = (yearly: number, slab: number) => Math.min(Math.max(yearly, 0), NPS.tax80CCD1B.value) * slab

/** APY: monthly contribution, years paying and the total paid, for a joining age and pension. */
export function apy(joinAge: number, pension: number) {
  const age = Math.min(Math.max(Math.round(joinAge), APY.minJoinAge.value), APY.maxJoinAge.value)
  const monthly = Math.round(APY.base.value[age - APY.minJoinAge.value] * (pension / 1000))
  const years = APY.pensionAge.value - age
  return { age, monthly, years, paid: monthly * 12 * years, nominee: APY.corpusPer1000.value * (pension / 1000) }
}

/** PPF value after `years` of a deposit at the start of each year, compounded yearly. */
export function ppf(yearly: number, years: number = PPF.years.value, rate: number = PPF.rate.value) {
  const d = Math.min(Math.max(yearly, PPF.minYearly.value), PPF.maxYearly.value)
  const value = rate ? d * ((Math.pow(1 + rate, years) - 1) / rate) * (1 + rate) : d * years
  return { deposit: d, paid: d * years, value, interest: value - d * years }
}

/** EPF: where 24% of basic pay goes each month, and the EPF balance after `years` (pay growing yearly). */
export function epf(basic: number, years: number, payGrowth = 0.06) {
  const eps = Math.min(basic, EPF.epsWageCap.value) * EPF.epsShare.value
  const month = { employee: basic * EPF.employeeShare.value, employerEpf: basic * EPF.employerShare.value - eps, eps }
  let balance = 0, pay = basic
  for (let y = 0; y < years; y++) {
    const e = Math.min(pay, EPF.epsWageCap.value) * EPF.epsShare.value
    const yearIn = (pay * EPF.employeeShare.value + pay * EPF.employerShare.value - e) * 12
    balance = balance * (1 + EPF.rate.value) + yearIn * (1 + EPF.rate.value / 2)
    pay *= 1 + payGrowth
  }
  return { month, balance }
}
