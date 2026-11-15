import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Check, ChevronRight, Compass, Lightbulb, Plus, Route, Shield, Target, TrendingUp, X } from '../components/ui/icons'
import { ErrorNote, Label } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { INCOME_RANGES } from '../lib/game'
import { setMeta } from '../lib/meta'
import { rupeesShort } from '../lib/format'
import { CLASS, type AssetType, type Money } from '../lib/tracker'
import { spring } from '../ui/motion'

type Outlook = 1 | 2 | 3
type Step = 'account' | 'outlook' | 'respond' | 'nps' | 'npsInfo' | 'basics' | 'money'
interface Row { id: string; type: AssetType; name: string; value: string; monthly: string; rate: string }
const ORDER: Step[] = ['account', 'outlook', 'respond', 'nps', 'npsInfo', 'basics', 'money']
const STAGES = [{ name: 'Your account', steps: ['account'] }, { name: 'Your outlook', steps: ['outlook', 'respond'] }, { name: 'Know NPS', steps: ['nps', 'npsInfo'] }, { name: 'Your money', steps: ['basics', 'money'] }]
const COMMON: AssetType[] = ['fd', 'ppf', 'epf', 'nps', 'mf', 'stocks']
const MORE: AssetType[] = ['gold', 'property', 'esop', 'cash', 'other']
const KIND: Record<AssetType, string> = { fd: 'Fixed deposit', ppf: 'PPF', epf: 'EPF / PF', nps: 'NPS', mf: 'Mutual funds', stocks: 'Stocks', gold: 'Gold', property: 'Property', esop: 'ESOPs', cash: 'Savings account', other: 'Something else' }
const PHONE = /^[6-9]\d{9}$/

/** New-user journey: account, how they think about retirement, what they know about NPS, then their money. */
export default function Onboarding() {
  const { lang } = useI18n()
  const { user, signUp } = useSession()
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(''), [phone, setPhone] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false), [consent, setConsent] = useState(false)
  const [outlook, setOutlook] = useState<Outlook | null>(null)
  const [heard, setHeard] = useState<boolean | null>(null)
  const [age, setAge] = useState(25), [retire, setRetire] = useState(60)
  const [income, setIncome] = useState(''), [expenses, setExpenses] = useState('')
  const [cover, setCover] = useState({ health: false, term: false })
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [touched, setTouched] = useState(false)

  if (user && !busy) return <Navigate to="/home" replace />

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), phoneOk = PHONE.test(phone), pwScore = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  const nameOk = name.trim().length >= 2
  const ok: Record<Step, boolean> = { account: nameOk && emailOk && phoneOk && password.length >= 8 && consent, outlook: !!outlook, respond: true, nps: heard !== null, npsInfo: true, basics: retire > age, money: true }
  const go = (dir: 1 | -1) => {
    let i = ORDER.indexOf(step) + dir
    if (ORDER[i] === 'respond' && outlook === 1) i += dir // a plan already: straight to NPS
    setStep(ORDER[i]); setTouched(false); setError(null); scrollTo({ top: 0, behavior: 'smooth' })
  }
  const stage = STAGES.findIndex(s => s.steps.includes(step))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!ok[step]) { setTouched(true); return }
    if (step !== 'money') return go(1)
    setBusy(true); setError(null)
    const inc = Number(income) || 0
    const money: Money = {
      assets: rows.filter(r => Number(r.value) || Number(r.monthly)).map(r => ({ id: r.id, type: r.type, value: Number(r.value) || 0, monthly: Number(r.monthly) || 0, rate: Math.min(Number(r.rate) || CLASS[r.type].rate, 30), ...(r.name.trim() ? { name: r.name.trim() } : {}), at: Date.now() })),
      income: inc, expenses: Number(expenses) || 0, emi: 0, loans: 0, tax: 0, health: cover.health, term: cover.term, unlocked: ['quick'], costs: [], inflation: 6, retireSpend: 80,
    }
    const range = INCOME_RANGES.find(r => { const [a, b] = r.split('-').map(Number); return inc >= a && inc < b }) ?? (inc >= 200000 ? INCOME_RANGES[INCOME_RANGES.length - 1] : INCOME_RANGES[0])
    try {
      try { localStorage.setItem('pq.journey', JSON.stringify({ outlook, heardNps: heard })) } catch { /* storage off */ }
      setMeta({ goal: outlook ?? 2 })
      await signUp({ name: name.trim().slice(0, 60), phone, age, income_range: range, language: lang, retirement_age: retire, email: email.trim(), password, financial_data: money, consent })
      nav('/tracker', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg); setBusy(false)
      if (/email|phone|password|exists|registered/i.test(msg)) setStep('account')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-5 pb-16 sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
      {/* the journey so far */}
      <aside className="band p-6 sm:p-8 lg:sticky lg:top-24">
        <div className="relative z-10">
          <Label>Step {stage + 1} of 4</Label>
          <h1 className="mt-2 text-[clamp(1.9rem,3vw,2.5rem)] leading-[1.08]">Plan the life you retire into.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/80">Four short steps. At the end you get a Retirement Readiness Score built from your own numbers.</p>
          <ol className="mt-7 space-y-1">
            {STAGES.map((s, i) => (
              <li key={s.name} className="flex items-center gap-3 py-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] transition-colors ${i < stage ? 'border-ink bg-ink text-paper' : i === stage ? 'border-ink text-ink' : 'border-ink/30 text-soft'}`}>{i < stage ? <Check size={15} /> : <span className="num">{i + 1}</span>}</span>
                <span className={`text-[15px] ${i === stage ? 'font-medium text-ink' : i < stage ? 'text-ink/85' : 'text-soft'}`}>{s.name}</span>
              </li>
            ))}
          </ol>
          <p className="mt-7 border-t border-ink/15 pt-4 text-[13px] leading-relaxed text-ink/65"><Shield size={13} className="mr-1.5 inline -translate-y-px" />Your numbers are encrypted before they are stored, and never shared.</p>
        </div>
      </aside>

      <form onSubmit={submit} noValidate className="hud min-w-0 p-6 sm:p-9">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {step === 'account' && <>
              <Head eyebrow="Create your account" title="Let's start with the basics." sub="You'll use these to sign in on any device." />
              <div className="mt-7 grid gap-5">
                <Field id="name" label="Your name" error={touched && !nameOk ? 'Enter your name (at least 2 letters).' : undefined}>
                  <input id="name" autoComplete="name" autoFocus className="field" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </Field>
                <Field id="email" label="Email address" error={touched && !emailOk ? 'Enter an email like name@example.com.' : undefined}>
                  <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
                </Field>
                <Field id="phone" label="Mobile number" error={touched && !phoneOk ? 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.' : undefined}>
                  <div className="relative"><span className="num pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft">+91</span>
                    <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" className="field !pl-14" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" /></div>
                </Field>
                <Field id="password" label="Password" error={touched && password.length < 8 ? 'Use at least 8 characters.' : undefined}>
                  <div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" className="field !pr-20" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShow(!show)} className="link absolute right-3 top-1/2 -translate-y-1/2 text-[14px]">{show ? 'Hide' : 'Show'}</button></div>
                  <div className="mt-2 flex items-center gap-2" aria-live="polite">
                    <span className="flex flex-1 gap-1">{[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < pwScore ? (pwScore >= 3 ? 'bg-forest' : 'bg-amber') : 'bg-mist'}`} />)}</span>
                    <span className="label w-16 text-right">{password ? ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][pwScore] : ''}</span>
                  </div>
                </Field>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper/60 p-3.5 text-[14px] leading-relaxed text-soft hover:border-forest/50">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--forest))]" />
                  <span>I agree that SixtyFy may store my account and the financial details I enter, encrypted, to build my retirement plan. <Link to="/privacy" className="underline underline-offset-2">Privacy</Link></span>
                </label>
                {touched && !consent && <p className="-mt-3 text-[14px] text-rust">Tick the box to continue.</p>}
              </div>
            </>}

            {step === 'outlook' && <>
              <Head eyebrow="Your outlook" title="Have you ever thought about life after retirement?" sub="Not just when you retire, but how you will afford the life you retire into." />
              <div className="mt-7 grid gap-3" role="radiogroup" aria-label="Your outlook">
                {([[1, Target, 'I have thought about it and have a plan', "Let's check it against your numbers."], [2, Compass, "A little, but I don't know where to start", "We'll set you on the right track."], [3, Route, 'Not really, retirement seems too far away', "Fair enough. Let us show you why now matters."]] as const).map(([v, Icon, title, sub]) => (
                  <Choice key={v} on={outlook === v} onClick={() => setOutlook(v)} icon={<Icon size={20} />} title={title} sub={sub} />
                ))}
              </div>
            </>}

            {step === 'respond' && outlook === 2 && <>
              <Head eyebrow="Your outlook" title="That's great. Let's get you on track." sub="Most people start exactly here. Here's what the next few minutes look like." />
              <ol className="mt-7 grid gap-3">
                {[['Understand NPS', "A plain-language look at India's national pension scheme."], ['Map what you own', 'FDs, PPF, EPF, mutual funds, stocks: everything counts.'], ['Get your score', 'A Readiness Score out of 100, with the next best move.']].map(([h, p], i) => (
                  <m.li key={h} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.08 }} className="flex gap-4 rounded-xl border border-line bg-paper/60 p-4">
                    <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-on-forest">{i + 1}</span><span><span className="block font-serif text-[1.2rem] text-ink">{h}</span><span className="text-[15px] text-soft">{p}</span></span>
                  </m.li>
                ))}
              </ol>
            </>}

            {step === 'respond' && outlook === 3 && <>
              <Head eyebrow="Why now" title="Retirement feels far. That's exactly why it's cheap to plan for now." sub="Four things worth knowing before you decide." />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  [TrendingUp, 'Time does the heavy lifting', 'At 10% a year, money doubles about every 7 years (72 ÷ 10). From 25 to 60 that is about 5 doublings; from 35, only about 3.'],
                  [Lightbulb, 'Prices keep rising', 'At 6% inflation, prices double about every 12 years. A ₹50,000 monthly lifestyle today costs about ₹2 lakh a month in 24 years.'],
                  [Shield, 'Retirement can be long', 'If you stop working at 60, your savings may need to last 20 years or more, with no salary coming in.'],
                  [Target, 'Starting small is enough', 'NPS accepts contributions from ₹500. A small habit started early can beat a large one started late.'],
                ].map(([Icon, h, p], i) => { const I = Icon as typeof Target; return (
                  <m.div key={h as string} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 + i * 0.07 }} className="rounded-xl border border-line bg-paper/60 p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-haze text-forest"><I size={19} /></span>
                    <p className="mt-3 font-serif text-[1.2rem] leading-snug text-ink">{h as string}</p><p className="mt-1 text-[15px] leading-relaxed text-soft">{p as string}</p>
                  </m.div>) })}
              </div>
            </>}

            {step === 'nps' && <>
              <Head eyebrow="Know NPS" title="Have you heard of NPS, the National Pension System?" sub={outlook === 1 ? "Great that you have a plan. Let's see where NPS fits in it." : 'There is no wrong answer here.'} />
              <div className="mt-7 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Heard of NPS">
                <Choice on={heard === true} onClick={() => setHeard(true)} icon={<Check size={20} />} title="Yes, I know about it" sub="Give me the short version." />
                <Choice on={heard === false} onClick={() => setHeard(false)} icon={<Lightbulb size={20} />} title="No, not really" sub="Explain it properly." />
              </div>
            </>}

            {step === 'npsInfo' && heard && <>
              <Head eyebrow="NPS in brief" title="A quick refresher." />
              <div className="mt-6 rounded-xl border border-line bg-paper/60 p-5 text-[16px] leading-relaxed text-ink">
                NPS is a government-backed retirement scheme regulated by PFRDA. You invest regularly while you work, your money is invested in a mix of equity, corporate bonds and government securities, and at 60 you take part of it as a lump sum and the rest as a monthly pension.
              </div>
              <Source />
            </>}

            {step === 'npsInfo' && heard === false && <>
              <Head eyebrow="NPS explained" title="NPS, in plain language." sub="Everything you need to understand it, and how to actually start." />
              <div className="mt-6 grid gap-3">
                {[
                  ['What it is', 'The National Pension System is a voluntary, long-term retirement scheme backed by the Government of India and regulated by PFRDA (Pension Fund Regulatory and Development Authority).'],
                  ['How it works', 'You contribute while you work. A professional pension fund invests it in equity, corporate bonds and government securities. You can pick the mix yourself (Active choice) or let it shift safer as you age (Auto choice).'],
                  ['Two accounts', 'Tier I is the main retirement account, with limits on withdrawals before 60. Tier II is optional and works more like a flexible savings account.'],
                  ['How to start', 'Open an account online through eNPS, or at a bank or post office, with your PAN, Aadhaar and a bank account. The minimum is ₹500 per contribution and ₹1,000 a year in Tier I.'],
                  ['Tax', 'Under the old tax regime, you can claim up to ₹50,000 a year extra under Section 80CCD(1B), over the ₹1.5 lakh limit of 80C. Under the new regime, your employer’s contribution can still qualify under 80CCD(2).'],
                  ['At retirement', 'At 60, part of your corpus can be withdrawn as a lump sum and the rest buys an annuity that pays you a monthly pension. Check the current limits on the PFRDA site.'],
                ].map(([h, p], i) => (
                  <m.details key={h} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.05 }} open={i < 2} className="group rounded-xl border border-line bg-paper/60 open:bg-card">
                    <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-serif text-[1.15rem] text-ink hover:text-forest">{h}<ChevronRight size={18} className="shrink-0 text-soft transition-transform group-open:rotate-90" /></summary>
                    <p className="px-5 pb-4 text-[15px] leading-relaxed text-soft">{p}</p>
                  </m.details>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-haze p-4 text-[15px] leading-relaxed text-ink"><Label>Practical tip</Label><p className="mt-1">Start with an amount you won’t miss, set it to auto-debit on payday, and raise it a little every time your salary goes up.</p></div>
              <Source />
            </>}

            {step === 'basics' && <>
              <Head eyebrow="Your money" title="A few numbers about you." sub="Your age and target retirement age set how long your money has to grow." />
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <Stepper id="age" label="Your current age" value={age} min={18} max={70} onChange={v => { setAge(v); if (retire <= v) setRetire(Math.min(v + 1, 75)) }} />
                <Stepper id="retire" label="Target retirement age" value={retire} min={Math.max(age + 1, 40)} max={75} onChange={setRetire} />
              </div>
              <p className="mt-3 rounded-lg bg-haze px-4 py-3 text-[15px] text-ink">You have <b className="num">{retire - age}</b> years to build your retirement fund.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Money id="income" label="Monthly take-home income" value={income} set={setIncome} />
                <Money id="expenses" label="Monthly expenses" value={expenses} set={setExpenses} />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">{(['health', 'term'] as const).map(k => (
                <button key={k} type="button" role="switch" aria-checked={cover[k]} onClick={() => setCover({ ...cover, [k]: !cover[k] })} className="row !min-h-[52px] gap-3 !px-4">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${cover[k] ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>{cover[k] && <Check size={13} />}</span>{k === 'health' ? 'I have health insurance' : 'I have term life insurance'}
                </button>))}
              </div>
            </>}

            {step === 'money' && <>
              <Head eyebrow="Your money" title="What do you already own?" sub="Add every investment you have. Enter the balance today, what you add each month, and the return you expect. You can edit all of it later." />
              <div className="mt-6 flex flex-wrap gap-2">
                {[...COMMON, ...MORE].map(ty => (
                  <button key={ty} type="button" onClick={() => setRows([...rows, { id: `${ty}-${Date.now()}`, type: ty, name: '', value: '', monthly: '', rate: String(CLASS[ty].rate) }])}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-[14px] text-ink transition-transform hover:-translate-y-0.5 hover:border-forest focus-visible:border-forest active:scale-[0.97]">
                    <Plus size={14} />{KIND[ty]}{rows.some(r => r.type === ty) && <span className="num ml-0.5 rounded-full bg-forest px-1.5 text-[11px] text-on-forest">{rows.filter(r => r.type === ty).length}</span>}
                  </button>
                ))}
              </div>
              <ul className="mt-5 grid gap-3">
                <AnimatePresence initial={false}>
                  {rows.map(r => (
                    <m.li key={r.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring} className="rounded-xl border border-line bg-paper/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <input aria-label="Name (optional)" className="min-w-0 flex-1 bg-transparent font-serif text-[1.15rem] text-ink outline-none placeholder:text-ink focus-visible:placeholder:text-soft" placeholder={KIND[r.type]} value={r.name} maxLength={30} onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                        <button type="button" aria-label={`Remove ${r.name || KIND[r.type]}`} onClick={() => setRows(rows.filter(x => x.id !== r.id))} className="grid h-9 w-9 place-items-center rounded text-soft hover:bg-mist hover:text-rust"><X size={16} /></button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1fr_0.8fr]">
                        <Money id={`${r.id}-v`} label="Balance today" value={r.value} set={v => setRows(rows.map(x => x.id === r.id ? { ...x, value: v } : x))} small />
                        <Money id={`${r.id}-m`} label="Added each month" value={r.monthly} set={v => setRows(rows.map(x => x.id === r.id ? { ...x, monthly: v } : x))} small />
                        <div className="col-span-2 sm:col-span-1"><label htmlFor={`${r.id}-r`} className="label">Expected return</label>
                          <div className="relative mt-1.5"><input id={`${r.id}-r`} inputMode="decimal" className="field !min-h-[44px] !pr-8" value={r.rate} onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, rate: e.target.value.replace(/[^\d.]/g, '').slice(0, 5) } : x))} />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-soft">%</span></div></div>
                      </div>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
              {rows.length === 0 ? <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-soft">Tap a kind above to add it. Nothing yet? You can skip this and add it later.</p>
                : <div className="mt-4 flex flex-wrap justify-between gap-3 rounded-xl bg-haze px-4 py-3 text-[15px] text-ink"><span>Total today <b className="num">{rupeesShort(rows.reduce((s, r) => s + (Number(r.value) || 0), 0))}</b></span><span>Investing <b className="num">{rupeesShort(rows.reduce((s, r) => s + (Number(r.monthly) || 0), 0))}</b> a month</span></div>}
              <p className="label mt-3">Returns are pre-filled with typical figures. Change them to match your own.</p>
            </>}
          </m.div>
        </AnimatePresence>

        {error && <div className="mt-6"><ErrorNote message={error} /></div>}
        <div className="mt-9 flex items-center justify-between gap-4 border-t border-line pt-6">
          {step !== 'account' ? <button type="button" className="link" onClick={() => go(-1)}>Back</button> : <Link to="/login" className="link">I have an account</Link>}
          <button type="submit" className="btn game-btn min-w-[170px] gap-2" disabled={busy}>{busy ? 'Creating your plan…' : step === 'money' ? (rows.length ? 'Create my plan' : 'Skip and create my plan') : 'Continue'}{!busy && <ChevronRight size={17} />}</button>
        </div>
      </form>
    </div>
  )
}

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return <><Label>{eyebrow}</Label><h2 className="mt-2 text-[clamp(1.7rem,3.2vw,2.4rem)] leading-[1.1] text-ink">{title}</h2>{sub && <p className="mt-2 max-w-[60ch] text-[16px] leading-relaxed text-soft">{sub}</p>}</>
}
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="label">{label}</label><div className="mt-1.5">{children}</div>{error && <p className="mt-1.5 text-[14px] text-rust" role="alert">{error}</p>}</div>
}
function Choice({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={`group flex min-h-[84px] items-center gap-4 rounded-xl border-2 p-4 text-left transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 active:scale-[0.99] ${on ? 'border-forest bg-haze' : 'border-line bg-card hover:border-forest/50'}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors ${on ? 'bg-forest text-on-forest' : 'bg-haze text-forest'}`}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block font-serif text-[1.2rem] leading-snug text-ink">{title}</span><span className="mt-0.5 block text-[14px] text-soft">{sub}</span></span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? 'border-forest bg-forest text-on-forest' : 'border-line'}`}>{on && <Check size={13} />}</span>
    </button>
  )
}
function Stepper({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div><label htmlFor={id} className="label">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-12 w-12 place-items-center rounded-md border border-line bg-card text-xl text-ink hover:border-forest disabled:opacity-40">−</button>
        <input id={id} inputMode="numeric" className="field num !min-h-[48px] flex-1 text-center text-[1.4rem]" value={value} onChange={e => { const n = Number(e.target.value.replace(/\D/g, '')); if (n) onChange(Math.min(Math.max(n, 1), max)) }} onBlur={() => onChange(Math.min(Math.max(value, min), max))} />
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-md border border-line bg-card text-xl text-ink hover:border-forest disabled:opacity-40">+</button>
      </div>
    </div>
  )
}
function Money({ id, label, value, set, small }: { id: string; label: string; value: string; set: (v: string) => void; small?: boolean }) {
  return (
    <div><label htmlFor={id} className="label">{label}</label>
      <div className="relative mt-1.5"><span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft">₹</span>
        <input id={id} inputMode="numeric" className={`field !pl-8 ${small ? '!min-h-[44px]' : ''}`} value={value ? Number(value).toLocaleString('en-IN') : ''} placeholder="0" onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 12))} /></div>
    </div>
  )
}
function Source() {
  return <p className="label mt-4">Source: <a href="https://www.pfrda.org.in" target="_blank" rel="noreferrer" className="underline underline-offset-2">PFRDA</a> · Illustrative, not financial advice.</p>
}
