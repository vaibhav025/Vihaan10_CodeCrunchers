// A browser copy of the backend formula (backend/app/utils/nps_calculator.py), used so sliders
// respond instantly. Signed-in screens then confirm the figures with POST /api/simulator/calculate.

export interface Plan {
  age: number
  retireAge: number
  monthly: number
  returnPct: number
  annualIncome: number
  taxRegime?: 'old' | 'new'
  employerContributionMonthly?: number
  inflationPct?: number
}

export interface Projection {
  projected_corpus: number
  corpus_in_today_rupees: number
  corpus_range: Record<string, number>
  monthly_pension: number
  tax_saved_total: number
  years_to_retire: number
  cost_of_delay_1yr: number
  cost_of_delay_3yr: number
  cost_of_delay_5yr: number
}

export function corpusAfter(years: number, monthly: number, returnPct: number) {
  const m = Math.max(years, 0) * 12
  const r = returnPct / 100 / 12
  if (r === 0) return monthly * m
  return monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r)
}

export function project(p: Plan): Projection {
  const years = Math.max(p.retireAge - p.age, 0)
  const corpus = corpusAfter(years, p.monthly, p.returnPct)
  const annual = p.monthly * 12
  const old = (p.taxRegime ?? 'new') === 'old'
  const c1 = old && p.annualIncome > 0 ? Math.min(annual, p.annualIncome * 0.1, 150000) : 0
  const c1b = old ? Math.min(Math.max(annual - c1, 0), 50000) : 0
  const c2 = old || !p.annualIncome ? 0 : Math.min((p.employerContributionMonthly ?? 0) * 12, p.annualIncome * 0.14)
  const rate = p.annualIncome > 1000000 ? 0.3 : p.annualIncome > 500000 ? 0.2 : 0.05
  const delay = (y: number) => corpus - corpusAfter(Math.max(years - y, 0), p.monthly, p.returnPct)
  return {
    projected_corpus: corpus,
    corpus_in_today_rupees: corpus / Math.pow(1 + (p.inflationPct ?? 6) / 100, years),
    corpus_range: Object.fromEntries([8, 10, 12].map(x => [String(x), corpusAfter(years, p.monthly, x)])),
    monthly_pension: (corpus * 0.2 * 0.06) / 12,
    tax_saved_total: (c1 + c1b + c2) * rate * years,
    years_to_retire: years,
    cost_of_delay_1yr: delay(1),
    cost_of_delay_3yr: delay(3),
    cost_of_delay_5yr: delay(5),
  }
}

export function growthSeries(p: Plan) {
  const years = Math.max(p.retireAge - p.age, 0)
  return Array.from({ length: years + 1 }, (_, y) => ({
    age: p.age + y,
    corpus: corpusAfter(y, p.monthly, p.returnPct),
    paid: p.monthly * 12 * y,
  }))
}

export const RISK_RETURN = { conservative: 8, moderate: 10, aggressive: 12 } as const
export type Risk = keyof typeof RISK_RETURN
