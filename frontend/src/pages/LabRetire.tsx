import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FastForward, RotateCcw } from '../components/ui/icons'
import { Label, Range, StateChip } from '../components/ui/kit'
import { Terms } from '../components/ui/Term'
import { HowTo, LabHead, LabNote, LineChart, Move, Stat, useLabSave } from '../components/lab/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useMoney } from '../lib/tracker'
import { rupees, rupeesShort } from '../lib/format'
import { A } from '../sim/assumptions'
import {
  DEFAULT_PLAN, GHOSTS, PLAYER_BUCKETS, buildCareer, corpusOf, equityShare, lessons, playYear, result, runGhost,
  startSim, suggestedMonthly, type Bucket, type GhostId, type Plan, type Sim, type YearReport,
} from '../sim/career'

/** A typical take-home pay for a young earner, used unless the player chooses their own numbers. */
const DEFAULT_SALARY = 35000
const SAVE_RATES = [0.1, 0.15, 0.2, 0.25]

export default function LabRetire() {
  const { t } = useI18n()
  const { user } = useSession()
  const money = useMoney()
  const nav = useNavigate()
  const save = useLabSave()
  const startAge = Math.min(Math.max(user?.age ?? 25, 18), 55)
  const retireAge = 60

  // "Play with my numbers" reads the tracker that is already in this browser; nothing is sent
  const [mine, setMine] = useState(false)
  const canUseMine = money.income > 0
  const firstSalary = mine && canUseMine ? money.income : DEFAULT_SALARY
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 90000) + 1000)
  const career = useMemo(() => buildCareer(seed, startAge, retireAge), [seed, startAge])

  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const [sim, setSim] = useState<Sim | null>(null)
  const [log, setLog] = useState<YearReport[]>([])
  const [askedRisk, setAskedRisk] = useState(false)
  const [riskPrompt, setRiskPrompt] = useState(false)
  const [lateEquity, setLateEquity] = useState<number[]>([])
  const [saved, setSaved] = useState(false)

  const begin = () => { setSim(startSim(firstSalary)); setLog([]); setAskedRisk(false); setRiskPrompt(false); setLateEquity([]); setSaved(false) }
  const restart = () => { setSeed(Math.floor(Math.random() * 90000) + 1000); setSim(null); setLog([]); setPlan(DEFAULT_PLAN) }

  const playOne = (s: Sim, p: Plan) => {
    const { sim: next, report } = playYear(career, s, p)
    const late = s.year >= career.years - 10
    return { next, report, eq: late ? equityShare(next, p) : null }
  }
  const nextYear = (years = 1) => {
    if (!sim) return
    let s = sim
    const reports: YearReport[] = []
    const eqs: number[] = []
    for (let i = 0; i < years && s.year < career.years; i++) {
      // stop fast-forward at the one-time prompt about risk and age
      if (!askedRisk && s.year === career.years - 10) { setAskedRisk(true); setRiskPrompt(true); if (i > 0) break }
      const r = playOne(s, plan)
      s = r.next; reports.push(r.report); if (r.eq !== null) eqs.push(r.eq)
    }
    setSim(s); setLog(l => [...l, ...reports]); setLateEquity(e => [...e, ...eqs])
  }

  const done = sim && sim.year >= career.years
  const res = useMemo(() => (done && sim ? result(sim) : null), [done, sim])
  const ghosts = useMemo(() => (done ? Object.fromEntries(GHOSTS.map(g => [g, runGhost(career, firstSalary, g, plan.saveRate)])) as Record<GhostId, Sim> : null), [done, career, firstSalary, plan.saveRate])
  const avgLateEq = lateEquity.length ? lateEquity.reduce((a, b) => a + b, 0) / lateEquity.length : 0
  const learned = useMemo(() => (done && sim && ghosts ? lessons(career, sim, ghosts, avgLateEq) : []), [done, sim, ghosts, career, avgLateEq])

  // save once when the run finishes: score, outcome word and lesson ids only
  if (done && res && !saved) { setSaved(true); void save('retire', res.score, res.state, learned) }

  const setWeight = (b: Bucket, v: number) => setPlan(p => ({ ...p, weights: { ...p.weights, [b]: v } }))
  const weightSum = PLAYER_BUCKETS.reduce((s, b) => s + (plan.weights[b] ?? 0), 0)
  const last = log[log.length - 1]
  const age = startAge + (sim?.year ?? 0)

  return (
    <div className="lab mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('lab.r.title')} sub={t('lab.r.sub')} />
      <LabNote />
      <HowTo id="retire" />
      <Terms keys={['nps', 'apy', 'ppf', 'epf', 'mf', 'etf', 'equity', 'bonds']} />

      {!sim && (
        <section data-guide="rr-setup" className="hud p-5 sm:p-7">
          <Label>{t('lab.r.setup')}</Label>
          <h2 className="mt-1.5 text-[1.7rem] leading-tight text-ink">{t('lab.r.setupT', { age: startAge, years: career.years })}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-soft">{t('lab.r.setupD')}</p>
          <dl data-guide="rr-facts" className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label={t('lab.r.startAge')} value={startAge} sub={t('lab.r.fromProfile')} />
            <Stat label={t('lab.r.salary')} value={rupees(firstSalary)} sub={t('lab.r.salaryD', { pct: Math.round(A.salaryGrowth * 100) })} />
            <Stat label={t('lab.r.saving')} value={`${Math.round(plan.saveRate * 100)}%`} sub={rupees(firstSalary * plan.saveRate) + t('common.perMonth')} />
          </dl>
          <label data-guide="rr-mine" className={`mt-5 flex min-h-[44px] items-start gap-3 ${canUseMine ? 'cursor-pointer' : 'opacity-60'}`}>
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--forest))]" checked={mine && canUseMine} disabled={!canUseMine} onChange={e => setMine(e.target.checked)} />
            <span>
              <span className="block text-[15px] text-ink">{t('lab.r.mine')}</span>
              <span className="block text-[13px] text-soft">{canUseMine ? t('lab.r.mineD') : t('lab.r.mineNone')}</span>
            </span>
          </label>
          <div className="mt-5" data-guide="rr-rate">
            <span className="label">{t('lab.r.rate')}</span>
            <div role="radiogroup" aria-label={t('lab.r.rate')} className="mt-2 flex flex-wrap gap-2">
              {SAVE_RATES.map(r => (
                <button key={r} role="radio" aria-checked={plan.saveRate === r} onClick={() => setPlan(p => ({ ...p, saveRate: r }))}
                  className={`min-h-[44px] min-w-[4.5rem] rounded-md border px-3 text-[15px] ${plan.saveRate === r ? 'border-forest bg-haze font-medium text-ink' : 'border-line bg-card text-soft hover:border-forest'}`}>{Math.round(r * 100)}%</button>
              ))}
            </div>
          </div>
          <button data-guide="rr-begin" className="btn mt-6" onClick={begin}>{t('lab.r.begin')}</button>
        </section>
      )}

      {sim && !done && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section aria-labelledby="year" data-guide="rr-year" className="hud p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="year" className="text-[1.6rem] text-ink">{t('lab.r.age', { age })}</h2>
              <span className="label">{t('lab.r.yearOf', { n: sim.year + 1, total: career.years })}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-mist" role="progressbar" aria-valuenow={sim.year} aria-valuemin={0} aria-valuemax={career.years} aria-label={t('lab.r.progress')}>
              <div className="h-full origin-left bg-forest transition-transform duration-500" style={{ transform: `scaleX(${sim.year / career.years})` }} />
            </div>
            <dl data-guide="rr-savings" className="mt-5 grid grid-cols-2 gap-4">
              <Stat label={t('lab.r.corpus')} value={rupeesShort(corpusOf(sim))} sub={t('lab.r.todayMoney', { v: rupeesShort(corpusOf(sim) / sim.priceLevel) })} />
              <Stat label={t('lab.r.salaryNow')} value={rupees(sim.salary)} sub={t('lab.r.savesYear', { v: rupees(sim.salary * 12 * plan.saveRate) })} />
            </dl>
            {sim.history.length > 1 && (
              <div className="mt-4" data-guide="rr-chart">
                <LineChart label={t('lab.r.chart')} series={[{ name: t('lab.r.corpus'), values: [0, ...sim.history] }]} format={rupeesShort} height={140}
                  marks={log.map((r, i) => (r.events.includes('crash') ? { at: i + 1, text: t('lab.r.crashMark') } : null)).filter((x): x is { at: number; text: string } => !!x).slice(-1)} />
              </div>
            )}

            {last && (
              <div data-guide="rr-last" className="mt-5 border-t border-line pt-4" role="status" aria-live="polite">
                <Label>{t('lab.r.lastYear', { age: last.age })}</Label>
                <p className="mt-1.5 text-[15px] text-ink">
                  {t('lab.r.market')} <Move pct={last.marketReturn * 100} />{' · '}
                  {t('lab.r.marketPart')} <span className={last.marketGain < 0 ? 'text-down' : 'text-up'}>{last.marketGain < 0 ? '−' : '+'}{rupees(Math.abs(last.marketGain))}</span>{' · '}
                  {t('lab.r.safePart')} <span className="text-up">+{rupees(last.safeGain)}</span>
                </p>
                {last.events.map(e => (
                  <p key={e} className={`mt-2 rounded-md border p-3 text-[15px] leading-relaxed ${e === 'crash' || e === 'job_loss' || e === 'medical' ? 'border-down/50 bg-down/[0.06] text-ink' : 'border-line bg-paper text-ink'}`}>
                    <span className="font-medium">{t(`lab.ev.${e}`)}</span> {t(`lab.ev.${e}.d`, { cost: rupees(last.cost) })}
                    {e === 'crash' && last.safeGain > 0 && <span className="block text-soft">{t('lab.r.safetyLayer', { v: rupees(last.safeGain) })}</span>}
                  </p>
                ))}
                {last.news.length > 0 && <p className="mt-2 text-[13px] text-soft">{t('lab.r.news')}: {last.news.slice(0, 3).map(id => t(`lab.n.${id}.h`)).join(' · ')}</p>}
              </div>
            )}

            {riskPrompt && (
              <div data-guide="rr-risk" role="alertdialog" aria-labelledby="rp" className="mt-5 rounded-md border border-down/60 bg-down/[0.06] p-4">
                <p id="rp" className="font-serif text-[1.25rem] text-ink">{t('lab.r.riskT', { age })}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-soft">{t('lab.r.riskD', { pct: Math.round(equityShare(sim, plan) * 100) })}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-quiet" onClick={() => { setPlan(p => ({ ...p, npsEquity: Math.min(p.npsEquity, 0.25), weights: { ...p.weights, stocks: 0, mf: Math.min(p.weights.mf ?? 0, 1), etf: Math.min(p.weights.etf ?? 0, 1), ppf: (p.weights.ppf ?? 0) + 2 } })); setRiskPrompt(false) }}>{t('lab.r.riskYes')}</button>
                  <button className="btn-quiet" onClick={() => setRiskPrompt(false)}>{t('lab.r.riskNo')}</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button data-guide="rr-next" className="btn" onClick={() => nextYear(1)} disabled={riskPrompt}>{t('lab.r.next')}</button>
              <button data-guide="rr-five" className="btn-quiet" onClick={() => nextYear(5)} disabled={riskPrompt}><FastForward size={16} strokeWidth={1.5} aria-hidden />{t('lab.r.five')}</button>
              <button data-guide="rr-end" className="btn-quiet" onClick={() => nextYear(career.years)} disabled={riskPrompt}>{t('lab.r.toEnd')}</button>
              {riskPrompt && <p className="basis-full text-[13px] text-soft">{t('lab.r.answerFirst')}</p>}
            </div>
          </section>

          <section aria-labelledby="split" data-guide="rr-split" className="hud p-5 sm:p-6">
            <h2 id="split" className="text-[1.45rem] text-ink">{t('lab.r.split')}</h2>
            <p className="mt-1 text-[14px] text-soft">{t('lab.r.splitD', { v: rupees(sim.salary * 12 * plan.saveRate) })}</p>
            <ul className="mt-3 space-y-1">
              {PLAYER_BUCKETS.map(b => {
                const w = plan.weights[b] ?? 0
                const share = weightSum ? w / weightSum : 0
                return (
                  <li key={b} data-guide={`rr-b-${b}`}>
                    <Range label={`${t(`lab.b.${b}`)} · ${Math.round(share * 100)}%`} value={w} min={0} max={5} onChange={v => setWeight(b, v)}
                      format={() => rupeesShort(sim.balances[b])} />
                    <p className="-mt-1 mb-1 text-[12px] text-soft">{t(`lab.b.${b}.d`)}</p>
                  </li>
                )
              })}
            </ul>
            <div data-guide="rr-npseq" className="mt-2 border-t border-line pt-3">
              <Range label={t('lab.r.npsEq')} value={Math.round(plan.npsEquity * 100)} min={0} max={Math.round(A.npsEquityCap * 100)} step={5}
                onChange={v => setPlan(p => ({ ...p, npsEquity: v / 100 }))} format={v => `${v}%`} />
              <p className="text-[12px] text-soft">{t('lab.r.npsEqD', { cap: Math.round(A.npsEquityCap * 100) })}</p>
            </div>
            <p className="mt-3 text-[13px] text-soft">{t('lab.r.balanceNote')}</p>
          </section>
        </div>
      )}

      {done && sim && res && ghosts && (
        <ResultView sim={sim} res={res} ghosts={ghosts} learned={learned} startAge={startAge}
          monthly={suggestedMonthly(firstSalary, plan, res)}
          onApply={m => nav('/tracker', { state: { plan: m } })}
          onAsk={() => nav('/coach', { state: { ask: t('lab.r.askCoach', { state: t(`state.${res.state}`), pct: Math.round(res.ratio * 100), lessons: learned.map(l => t(`lab.l.${l}`)).join('; ') }) } })}
          onAgain={restart} />
      )}
    </div>
  )
}

function ResultView({ sim, res, ghosts, learned, startAge, monthly, onApply, onAsk, onAgain }: {
  sim: Sim; res: ReturnType<typeof result>; ghosts: Record<GhostId, Sim>; learned: string[]; startAge: number
  monthly: number; onApply: (m: number) => void; onAsk: () => void; onAgain: () => void
}) {
  const { t } = useI18n()
  const rows = [{ id: 'you', corpus: res.corpus, r: res }, ...GHOSTS.map(g => ({ id: g, corpus: corpusOf(ghosts[g]), r: result(ghosts[g]) }))].sort((a, b) => b.corpus - a.corpus)
  const max = rows[0].corpus || 1
  return (
    <div className="space-y-6">
      <section data-guide="rr-result" className="band p-6 sm:p-9" role="status">
        <div className="relative z-10">
          <Label>{t('lab.r.atSixty')}</Label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-[clamp(2rem,5vw,3.2rem)] leading-[1.05]">{t(`lab.r.out.${res.state}`)}</h2>
            <StateChip state={res.state} />
          </div>
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-[#F7F5E8]/80">{t('lab.r.outD', { pct: Math.round(res.ratio * 100), years: sim.year, age: startAge })}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              [t('lab.r.corpus'), rupeesShort(res.corpus), t('lab.r.todayMoney', { v: rupeesShort(res.corpusToday) })],
              [t('lab.r.income'), rupees(res.income) + t('common.perMonth'), t('lab.r.todayMoney', { v: rupees(res.incomeToday) })],
              [t('lab.r.need'), rupees(res.need) + t('common.perMonth'), t('lab.r.todayMoney', { v: rupees(res.needToday) })],
              [t('lab.r.lump'), rupeesShort(res.lump), t('lab.r.pension', { v: rupees(res.pension) })],
            ].map(([k, v, s]) => (
              <div key={k} className="tile px-4 py-3">
                <dt className="label">{k}</dt>
                <dd className="num mt-1 text-[1.5rem] leading-none">{v}</dd>
                <dd className="mt-1.5 text-[13px] text-[#F7F5E8]/70">{s}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-[#F7F5E8]/70">{t('lab.r.howIncome', { share: Math.round(A.annuityShare * 100), draw: Math.round(A.drawdown * 100) })}</p>
        </div>
      </section>

      <section aria-labelledby="ghosts" data-guide="rr-ghosts" className="hud p-5 sm:p-6">
        <h2 id="ghosts" className="text-[1.6rem] text-ink">{t('lab.r.ghosts')}</h2>
        <p className="mt-1 text-[15px] text-soft">{t('lab.r.ghostsD')}</p>
        <ol className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <li key={row.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className={`text-[15px] ${row.id === 'you' ? 'font-semibold text-ink' : 'text-ink'}`}>{i + 1}. {t(`lab.g.${row.id}`)}</span>
                <span className="text-[14px] text-soft"><span className="num text-[16px] text-ink">{rupeesShort(row.corpus)}</span> · {t(`state.${row.r.state}`)}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-mist" aria-hidden>
                <div className={`h-full origin-left ${row.id === 'you' ? 'bg-up' : 'bg-sage'}`} style={{ transform: `scaleX(${row.corpus / max})` }} />
              </div>
              {row.id !== 'you' && <p className="mt-0.5 text-[12px] text-soft">{t(`lab.g.${row.id}.d`)}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="learned" data-guide="rr-learned">
        <h2 id="learned" className="text-[1.6rem] text-ink">{t('lab.r.learned')}</h2>
        <ol className="mt-3 grid gap-4 lg:grid-cols-3">
          {learned.map((l, i) => (
            <li key={l} className="hud p-5">
              <span className="num text-[1.6rem] leading-none text-line">{i + 1}</span>
              <h3 className="mt-2 text-[1.2rem] leading-snug text-ink">{t(`lab.l.${l}`)}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-soft">{t(`lab.l.${l}.d`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="apply" data-guide="rr-apply" className="hud p-5 sm:p-7">
        <h2 id="apply" className="text-[1.6rem] text-ink">{t('lab.r.applyT')}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-soft">{t('lab.r.applyD', { amt: rupees(monthly) })}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button className="btn" onClick={() => onApply(monthly)}>{t('lab.r.apply')}</button>
          <button className="btn-quiet" onClick={onAsk}>{t('lab.r.ask')}</button>
          <button className="link" onClick={onAgain}><RotateCcw size={14} strokeWidth={1.5} aria-hidden />{t('lab.r.again')}</button>
          <Link to="/lab" className="link">{t('lab.back')}</Link>
        </div>
      </section>
    </div>
  )
}
