import type { User } from './api'
import { getMoney as rawMoney, norm, totals, CLASS, type Money } from './tracker'
const getMoney = () => norm(rawMoney())
import { readiness, weakest } from './readiness'
import { rupees, rupeesShort } from './format'

/**
 * Retrieval for the coach. Each question pulls the most relevant notes from this knowledge base
 * plus the player's own numbers; that context is sent to the AI when the server has one, and is
 * used directly by the built-in adviser when it does not.
 */
export interface Doc { id: string; title: string; text: string }
export const KB: Doc[] = [
  { id: 'nps', title: 'What NPS is', text: 'The National Pension System (NPS) is regulated by PFRDA. Under rules effective 16 December 2025, eligible non-government normal exits may allow up to 80% lump sum and at least 20% annuity, subject to corpus thresholds; tax treatment is governed separately by current tax law.' },
  { id: 'tier', title: 'Tier I and Tier II', text: 'PFRDA lists ₹500 minimum per Tier I contribution and ₹1,000 minimum per year for the All Citizen Model. Tier II is an optional account with more flexible withdrawals. Check the current rules for your NPS model.' },
  { id: 'tax', title: 'NPS tax deductions', text: 'Under the old tax regime, 80CCD(1) may qualify within the 80C limit and 80CCD(1B) may allow an additional ₹50,000 deduction. Under the new regime, personal NPS deductions do not apply; eligible employer contributions under 80CCD(2) may qualify subject to statutory limits.' },
  { id: 'emergency', title: 'Emergency fund', text: 'Keep 3 to 6 months of living expenses in something safe and quick to reach, such as a savings account, sweep FD or liquid fund. Build this before investing for the long term, so a job loss or medical bill does not force you to sell investments or borrow.' },
  { id: 'debt', title: 'Paying off debt', text: 'Clear high-interest debt first: credit cards (30-40% a year) and personal loans (12-18%) cost more than any investment reliably earns. Home loans at 8-9% can run alongside investing. Keep total EMIs under 30-40% of take-home pay.' },
  { id: 'fd', title: 'Fixed deposits and inflation', text: 'An FD at 7% with inflation at 6% grows your purchasing power by only about 1% a year, and less after tax. FDs suit emergency money and goals within 3 years, not a retirement 20 or more years away.' },
  { id: 'equity', title: 'Equity for long goals', text: 'Over 10 or more years, diversified equity (index funds, equity mutual funds, NPS equity) has historically beaten inflation by a wide margin, though it swings year to year. The longer the horizon, the more equity a plan can hold. A common rule of thumb is 100 minus your age in equity.' },
  { id: 'esop', title: 'ESOPs and concentration', text: 'ESOPs tie your wealth to the same company that pays your salary. If the company struggles you can lose both. Treat unvested or unlisted ESOPs as uncertain, and when you can sell, move part into diversified funds. Keep any single stock under 10-15% of your investments.' },
  { id: 'sip', title: 'SIPs and compounding', text: 'A SIP invests a fixed amount every month, which averages out market ups and downs. Compounding rewards time more than amount: 5,000 a month from age 25 beats 10,000 a month from age 35 by retirement at 60.' },
  { id: 'insurance', title: 'Health and term insurance', text: 'Health insurance stops one hospital stay from wiping out savings; a 5-10 lakh family cover is a sensible start. Term insurance replaces your income for dependants: cover around 10-15 times annual income, and it is cheap when bought young. Avoid mixing insurance with investment.' },
  { id: 'epf', title: 'EPF and PPF', text: 'EPF takes 12% of basic pay with a matching employer share and earns about 8.25%, tax-free within limits. PPF earns about 7.1%, tax-free, with a 15-year lock-in and a 1.5 lakh yearly cap. Both are safe debt holdings in a retirement plan.' },
  { id: 'need', title: 'How much is enough to retire', text: 'A common target is 25 times your yearly retirement spending (the 4% rule). Spending in retirement is often about 70-80% of today, and inflation doubles prices roughly every 12 years at 6%, so targets should be set in today\'s rupees.' },
  { id: 'bonus', title: 'Using a bonus or windfall', text: 'Order of use for extra money: first fill the emergency fund, then clear high-interest debt, then use tax-saving room (NPS 80CCD(1B), PPF), make sure health and term cover exist, and invest the rest for long-term goals in diversified equity or NPS. Keeping a small part to enjoy helps you stick to the plan.' },
  { id: 'gold', title: 'Gold and property', text: 'Gold protects against inflation and currency falls but earns no income; 5-10% of a portfolio is typical. Property is illiquid and concentrated; a home you live in is not retirement income unless you plan to downsize or rent it out.' },
  { id: 'scam', title: 'Staying safe from fraud', text: 'PFRDA and CRAs never ask for OTPs, never guarantee returns and never charge a fee to release your pension. Use only official sites and apps, and type the address yourself.' },
]

const STOP = new Set('the a an is are was i my me to of in on for and or do does how what where which should can it with at from be have has this that'.split(' '))
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w))
// a few cross-language and synonym hints so Hindi/Marathi questions find the right notes
const HINTS: [RegExp, string][] = [[/bonus|windfall|extra|बोनस|lump/, 'bonus'], [/tax|80c|कर|टैक्स/, 'tax'], [/tier|टियर/, 'tier'], [/fd|fixed|एफडी/, 'fd'], [/esop|stock option/, 'esop'],
  [/emergency|आपात|job loss/, 'emergency'], [/loan|emi|debt|कर्ज|credit card/, 'debt'], [/insur|बीमा|विमा|term|health/, 'insurance'], [/enough|retire|ready|score|track|निवृत्त|रिटायर/, 'need'],
  [/sip|mutual|invest|निवेश|गुंतवणूक|equity|share/, 'equity'], [/epf|ppf|pf\b/, 'epf'], [/gold|property|house|सोना|घर/, 'gold'], [/scam|fraud|otp|धोखा/, 'scam'], [/nps|pension|पेंशन|पेन्शन/, 'nps']]

/** Scores every note against the question (word overlap, weighted by rarity) and returns the best few. */
export function retrieve(q: string, k = 3): Doc[] {
  const qw = words(q)
  const df = (w: string) => KB.filter(d => words(d.title + ' ' + d.text).includes(w)).length || KB.length
  const score = (d: Doc) => {
    const dw = words(d.title + ' ' + d.text)
    let s = qw.reduce((a, w) => a + (dw.includes(w) ? Math.log(1 + KB.length / df(w)) : 0), 0)
    HINTS.forEach(([re, id]) => { if (re.test(q.toLowerCase()) && d.id === id) s += 3 })
    return s
  }
  return KB.map(d => ({ d, s: score(d) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map(x => x.d)
}

/** The player's numbers as a compact fact sheet (also retrieved context). */
export function factSheet(u: User, m: Money = getMoney()) {
  const years = Math.max(u.retirement_age - u.age, 0), t = totals(m, years), r = readiness(m, years)
  if (!m.assets.length && !m.income) return ''
  return `Age ${u.age}, retiring at ${u.retirement_age}. Take-home ${rupees(m.income)}/mo, expenses ${rupees(m.expenses)}, EMIs ${rupees(m.emi)}, investing ${rupees(t.investing)}/mo, surplus ${rupees(Math.max(t.surplus, 0))}. ` +
    `Holdings: ${t.byType.map(b => `${b.type.toUpperCase()} ${rupeesShort(b.value)}`).join(', ') || 'none'}. Loans ${rupeesShort(m.loans)}. Emergency cover ${(m.expenses ? t.liquid / m.expenses : 0).toFixed(1)} months. ` +
    `Health cover: ${m.health ? 'yes' : 'no'}; term cover: ${m.term ? 'yes' : 'no'}. Readiness score ${r.score}/100; projected ${rupeesShort(t.real)} of ${rupeesShort(r.needed)} needed (today's rupees).`
}

/** Where a windfall should go, in order, from the player's own gaps. Pure rules, no AI. */
export function allocate(amount: number, m: Money, tax: number) {
  const t = totals(m, 0), steps: { key: string; amt: number }[] = []
  let left = amount
  const put = (key: string, want: number) => { const a = Math.min(Math.round(want), left); if (a > 0) { steps.push({ key, amt: a }); left -= a } }
  put('emergency', Math.max(0, (m.expenses || 0) * 3 - t.liquid))
  if (m.income && m.emi / m.income > 0.4) put('debt', left * 0.5)
  if (!m.health) put('health', 15000)
  if (tax > 0) put('nps', Math.max(0, 50000 - m.assets.filter(a => a.type === 'nps').reduce((s, a) => s + a.monthly * 12, 0)))
  put('fun', amount * 0.1)
  put('equity', left)
  return steps
}

const AMOUNT = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|lakh|lac|l|cr|crore|हज़ार|हजार|लाख)?/i
function parseAmount(q: string) {
  const all = [...q.matchAll(new RegExp(AMOUNT, 'gi'))].filter(x => x[1])
  const best = all.map(x => { const n = Number(x[1].replace(/,/g, '')); const u = (x[2] || '').toLowerCase(); return n * (u === 'k' || u.includes('ज') ? 1e3 : u.startsWith('l') || u === 'लाख' ? 1e5 : u.startsWith('cr') ? 1e7 : 1) }).filter(n => n >= 500)
  return best.length ? Math.max(...best) : null
}

const STEP: Record<string, string> = {
  emergency: 'to your emergency fund, until it covers 3 months of expenses',
  debt: 'to prepay your costliest loan, since your EMIs are above 40% of income',
  health: 'toward a health insurance premium, since you have no cover',
  nps: 'into NPS Tier I, to use the extra 80CCD(1B) deduction',
  fun: 'kept to enjoy, so the plan stays easy to stick to',
  equity: 'into a diversified equity index fund or your NPS equity option, for the long term',
}

/** Built-in adviser: answers from retrieved notes and the player's numbers when no AI is connected. */
export function answerOffline(q: string, u: User, docs: Doc[]): { text: string; cite?: string } {
  const m = getMoney(), years = Math.max(u.retirement_age - u.age, 0), t = totals(m, years), r = readiness(m, years)
  const has = m.assets.length > 0 || m.income > 0
  const lower = q.toLowerCase()
  const amt = parseAmount(q)
  if (amt && /bonus|windfall|extra|where|put|invest|बोनस|कहाँ|कुठे|lump|got|have/.test(lower)) {
    if (!has) return { text: `For ${rupees(amt)}: ${KB.find(d => d.id === 'bonus')!.text} Add your details in the Tracker and I can split it to the rupee for you.` }
    const steps = allocate(amt, m, m.tax)
    return { text: `Here is how I would split ${rupees(amt)}, based on your tracker:\n` + steps.map(s => `• ${rupees(s.amt)} ${STEP[s.key]}`).join('\n'), cite: `Readiness ${r.score}/100 · emergency cover ${(m.expenses ? t.liquid / m.expenses : 0).toFixed(1)} months` }
  }
  if (/score|ready|on track|enough|am i |कितना तैयार|राह पर|मार्गावर/.test(lower) && has) {
    const w = weakest(r)
    const fix: Record<string, string> = { funding: 'raise your monthly investing or shift long-term money toward equity', saving: 'move your investing closer to 20% of take-home pay', emergency: 'build your emergency fund to 6 months of expenses', protection: 'add health and term insurance', debt: 'bring your EMIs under 30% of income', spread: 'spread your money across at least three kinds of assets' }
    return { text: `Your Readiness Score is ${r.score} out of 100. At ${u.retirement_age} your holdings are projected at ${rupeesShort(t.real)} in today's rupees, against the ${rupeesShort(r.needed)} your spending needs. The biggest gain available now: ${fix[w.key]}.`, cite: `${rupeesShort(t.real)} of ${rupeesShort(r.needed)} · ${w.key} ${Math.round(w.got)}/${w.max}` }
  }
  if (/risk|mistake|wrong|worry|biggest|जोखिम/.test(lower) && has) {
    const top = [...t.byType].sort((a, b) => b.value - a.value)[0]
    const risky = top && CLASS[top.type].risky && top.value / t.now > 0.4
    return { text: risky ? `Your biggest risk is concentration: ${top.type.toUpperCase()} is ${Math.round((top.value / t.now) * 100)}% of what you own. ${KB.find(d => d.id === 'esop')!.text}` : `${docs[0]?.text ?? KB.find(d => d.id === 'emergency')!.text} In your case, emergency cover is ${(m.expenses ? t.liquid / m.expenses : 0).toFixed(1)} months and EMIs are ${m.income ? Math.round((m.emi / m.income) * 100) : 0}% of income.` }
  }
  if (!docs.length) return { text: 'I can answer questions about NPS, tax saving, emergency funds, debt, insurance, FDs, equity, ESOPs and your own tracker. Try asking where to put a bonus, or whether you are on track.' }
  return { text: docs[0].text + (docs[1] ? ' ' + docs[1].text.split('. ')[0] + '.' : '') }
}
