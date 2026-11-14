import { APY, NPS, PPF, EPF, apy } from './schemes'

/**
 * The schemes quiz. Every answer is computed from the scheme data file, so a figure changed
 * there changes the quiz with it. Question text is a translation key: lab.q.<id>.
 * `vars` fill the question; `options` are already formatted for display.
 */
export interface Question { id: string; vars?: Record<string, string | number>; options: string[]; answer: number; /** facts the answer comes from */ facts: string[] }

const pct = (x: number) => `${Math.round(x * 100)}%`
const inr = (n: number) => `₹ ${new Intl.NumberFormat('en-IN').format(n)}`

export function buildQuiz(): Question[] {
  const apy25 = apy(25, 2000)
  return [
    { id: 'nps_exit', vars: { lump: pct(NPS.maxLumpShare.value) }, options: [pct(0.6), pct(NPS.maxLumpShare.value), pct(1)], answer: 1, facts: ['NPS.maxLumpShare'] },
    { id: 'nps_annuity', vars: { ann: pct(NPS.minAnnuityShare.value) }, options: [pct(0), pct(NPS.minAnnuityShare.value), pct(0.5)], answer: 1, facts: ['NPS.minAnnuityShare'] },
    { id: 'nps_1b', vars: { amt: inr(NPS.tax80CCD1B.value) }, options: [inr(25000), inr(NPS.tax80CCD1B.value), inr(150000)], answer: 1, facts: ['NPS.tax80CCD1B'] },
    { id: 'nps_auto', vars: { young: pct(NPS.lifecycle.value.LC75[0]), old: pct(NPS.lifecycle.value.LC75[1]) }, options: ['up', 'down', 'same'], answer: 1, facts: ['NPS.lifecycle'] },
    { id: 'ppf_years', vars: { years: PPF.years.value }, options: ['5', String(PPF.years.value), '30'], answer: 1, facts: ['PPF.years'] },
    { id: 'ppf_max', vars: { amt: inr(PPF.maxYearly.value) }, options: [inr(50000), inr(PPF.maxYearly.value), inr(500000)], answer: 1, facts: ['PPF.maxYearly'] },
    { id: 'epf_share', vars: { share: pct(EPF.employeeShare.value) }, options: [pct(0.05), pct(EPF.employeeShare.value), pct(0.24)], answer: 1, facts: ['EPF.employeeShare'] },
    { id: 'apy_guarantee', vars: { join: APY.maxJoinAge.value }, options: ['market', 'fixed', 'none'], answer: 1, facts: ['APY.pensions'] },
    { id: 'apy_early', vars: { amt: inr(apy25.monthly), pension: inr(2000) }, options: ['early', 'late', 'same'], answer: 0, facts: ['APY.base'] },
    { id: 'nps_regulator', options: ['RBI', NPS.regulator.value, 'SEBI'], answer: 1, facts: ['NPS.regulator'] },
  ]
}
