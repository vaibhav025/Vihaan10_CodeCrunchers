import { useMemo, useState } from 'react'
import { Newspaper } from '../ui/icons'
import { Label } from '../ui/kit'
import { Lesson, LineChart, Move, Stat } from './kit'
import { useI18n } from '../../lib/i18n'
import { api } from '../../lib/api'
import { rupees } from '../../lib/format'
import { COMPANIES, SECTORS, type Sector } from '../../sim/companies'
import { createMarket, pct, release, run, type Market } from '../../sim/market'
import { NEWS_BY_ID, PUBLIC_NEWS, directionOf, type Direction, type NewsEvent } from '../../sim/news'
import { fork, stream } from '../../sim/rng'

const DIRS: Direction[] = ['up', 'flat', 'down']
const sectorCompany = (s: Sector) => COMPANIES.findIndex(c => c.sector === s)
/** Value of a set of holdings at the given prices. */
export const worth = (shares: number[], prices: number[]) => shares.reduce((sum, n, i) => sum + n * prices[i], 0)

/** Today's move for one company, split into trend, noise and news. */
export function WhyPanel({ m, index }: { m: Market; index: number }) {
  const { t } = useI18n()
  const c = COMPANIES[index]
  const p = m.parts[index]
  const rows = [['trend', p.trend], ['noise', p.noise], ['news', p.news]] as const
  const scale = Math.max(...rows.map(([, v]) => Math.abs(v)), 1e-9)
  const active = m.active.filter(a => NEWS_BY_ID[a.id].impact[c.sector])
  const [answer, setAnswer] = useState<{ id: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Only the public headline goes to the coach: no prices, holdings or tracker figures.
  async function explain(e: NewsEvent) {
    setBusy(true)
    const sectors = SECTORS.filter(s => e.impact[s]).map(s => `${t(`lab.sec.${s}`)} ${t(`lab.${directionOf(e, s)}`)}`).join(', ')
    try {
      const r = await api.chat(t('lab.s.askMove', { headline: t(`lab.n.${e.id}.h`), sectors }), [])
      setAnswer({ id: e.id, text: r.reply })
    } catch {
      setAnswer({ id: e.id, text: t(`lab.n.${e.id}.x`) })
    } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="why" className="hud p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="why" className="text-[1.45rem] text-ink">{t('lab.s.why')}</h2>
        <span className="text-[15px] text-soft">{c.name} · <Move pct={pct(p.total)} digits={2} className="font-medium" /></span>
      </div>
      <dl className="mt-4 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_4.5rem] items-center gap-3">
            <dt>
              <span className="block text-[15px] font-medium text-ink">{t(`lab.s.${k}`)}</span>
              <span className="block text-[12px] leading-snug text-soft">{t(`lab.s.${k}D`)}</span>
            </dt>
            {/* a bar that grows right for a rise and left for a fall, from the centre line */}
            <dd aria-hidden className="relative h-5 rounded-sm bg-ink/[0.06]">
              <span className="absolute inset-y-0 left-1/2 w-px bg-soft/50" />
              <span className={`absolute inset-y-0.5 rounded-sm ${v >= 0 ? 'left-1/2 bg-up shadow-[0_0_12px_rgb(var(--up)/0.5)]' : 'right-1/2 bg-down shadow-[0_0_12px_rgb(var(--down)/0.5)]'}`} style={{ width: `${(Math.abs(v) / scale) * 50}%` }} />
            </dd>
            <dd className="text-right text-[14px]"><Move pct={pct(v)} digits={2} /></dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[15px] leading-relaxed text-ink" aria-live="polite">
        {active.length ? t('lab.s.newsDriven', { headline: t(`lab.n.${active[active.length - 1].id}.h`) }) : t('lab.s.justNoise')}
      </p>
      {active.map(a => {
        const e = NEWS_BY_ID[a.id]
        return (
          <div key={a.id + a.day} className="mt-3 rounded-md border border-line bg-paper p-3.5">
            <p className="flex items-start gap-2 text-[15px] text-ink"><Newspaper size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-forest" />{t(`lab.n.${e.id}.h`)}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-soft">{t(`lab.n.${e.id}.${c.sector}`)}</p>
            {!e.scripted && (answer?.id === e.id
              ? <p className="mt-2 whitespace-pre-line border-t border-line pt-2 text-[14px] leading-relaxed text-ink">{answer.text}</p>
              : <button className="btn-quiet mt-2.5" disabled={busy} onClick={() => explain(e)}>{busy ? t('lab.s.explaining') : t('lab.s.explain')}</button>)}
          </div>
        )
      })}
    </section>
  )
}

/** "You make the news": pick a headline, predict each sector, release it, see the score. */
export function NewsRound({ m, seed, onRelease, onScore }: {
  m: Market; seed: number
  /** releases the event on the real board and returns prices before and five days after */
  onRelease: (id: string) => { before: number[]; after: number[] }
  onScore: (right: number, total: number) => void
}) {
  const { t } = useI18n()
  const [stage, setStage] = useState<'idle' | 'pick' | 'predict' | 'result'>('idle')
  const [event, setEvent] = useState<NewsEvent | null>(null)
  const [calls, setCalls] = useState<Record<Sector, Direction>>(() => Object.fromEntries(SECTORS.map(s => [s, 'flat'])) as Record<Sector, Direction>)
  const [moved, setMoved] = useState<{ before: number[]; after: number[] } | null>(null)
  const [round, setRound] = useState(0)
  // three headlines to choose from, fixed by the market seed and the round number
  const options = useMemo(() => {
    const r = stream(fork(seed, 100 + round))
    const pool = [...PUBLIC_NEWS]
    return [0, 1, 2].map(() => pool.splice(r.int(pool.length), 1)[0])
  }, [seed, round])
  const right = event ? SECTORS.filter(s => calls[s] === directionOf(event, s)).length : 0

  const go = () => {
    if (!event) return
    setMoved(onRelease(event.id))
    onScore(SECTORS.filter(s => calls[s] === directionOf(event, s)).length, SECTORS.length)
    setStage('result')
  }
  const reset = () => { setRound(r => r + 1); setEvent(null); setMoved(null); setCalls(Object.fromEntries(SECTORS.map(s => [s, 'flat'])) as Record<Sector, Direction>); setStage('pick') }

  return (
    <section aria-labelledby="nr" className="hud p-5 sm:p-6">
      <Label>{t('lab.nr.k')}</Label>
      <h2 id="nr" className="mt-1.5 text-[1.6rem] leading-tight text-ink">{t('lab.nr.title')}</h2>

      {stage === 'idle' && (
        <>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-soft">{t('lab.nr.sub')}</p>
          <button className="btn mt-4" onClick={() => setStage('pick')}>{t('lab.nr.start')}</button>
        </>
      )}

      {stage === 'pick' && (
        <div className="mt-3">
          <p className="text-[15px] text-ink">{t('lab.nr.pick')}</p>
          <div role="radiogroup" aria-label={t('lab.nr.pick')} className="mt-3 space-y-2">
            {options.map(e => (
              <button key={e.id} role="radio" aria-checked={event?.id === e.id} onClick={() => setEvent(e)} className="row py-3">
                <Newspaper size={18} strokeWidth={1.5} aria-hidden className="shrink-0 text-forest" />
                <span className="flex-1 text-[16px] text-ink">{t(`lab.n.${e.id}.h`)}</span>
              </button>
            ))}
          </div>
          <button className="btn mt-4" disabled={!event} onClick={() => setStage('predict')}>{t('common.continue')}</button>
        </div>
      )}

      {stage === 'predict' && event && (
        <div className="mt-3">
          <p className="rounded-md border border-line bg-paper p-3.5 text-[16px] text-ink">{t(`lab.n.${event.id}.h`)}</p>
          <p className="mt-4 text-[15px] text-ink">{t('lab.nr.predict')}</p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {SECTORS.map(s => (
              <li key={s} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span id={`nr-${s}`} className="text-[15px] text-ink">{t(`lab.sec.${s}`)} <span className="text-soft">· {COMPANIES[sectorCompany(s)].name}</span></span>
                <div role="radiogroup" aria-labelledby={`nr-${s}`} className="flex gap-1.5">
                  {DIRS.map(d => (
                    <button key={d} role="radio" aria-checked={calls[s] === d} onClick={() => setCalls(c => ({ ...c, [s]: d }))}
                      className={`min-h-[44px] min-w-[5.2rem] rounded-md border px-3 text-[14px] ${calls[s] === d ? 'border-forest bg-haze font-medium text-ink' : 'border-line bg-card text-soft hover:border-forest'}`}>
                      {d === 'up' ? '▲ ' : d === 'down' ? '▼ ' : ''}{t(`lab.${d}`)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button className="btn" onClick={go}>{t('lab.nr.release')}</button>
            <button className="link" onClick={() => setStage('pick')}>{t('lab.nr.change')}</button>
          </div>
        </div>
      )}

      {stage === 'result' && event && moved && (
        <div className="mt-3" role="status">
          <p className="font-serif text-[2rem] leading-none text-ink">{t('lab.nr.score', { n: right, total: SECTORS.length })}</p>
          <p className="mt-2 rounded-md border border-line bg-paper p-3.5 text-[15px] leading-relaxed text-ink">
            <span className="font-medium">{t(`lab.n.${event.id}.h`)}</span> {t(`lab.n.${event.id}.x`)}
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {SECTORS.map(s => {
              const actual = directionOf(event, s), ok = calls[s] === actual, i = sectorCompany(s)
              return (
                <li key={s} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[15px] font-medium text-ink">{t(`lab.sec.${s}`)}</span>
                    <span className="text-[14px] text-soft">
                      {t('lab.nr.yours')}: {t(`lab.${calls[s]}`)} · {t('lab.nr.actual')}: <span className="text-ink">{t(`lab.${actual}`)}</span> ·{' '}
                      <span className={ok ? 'font-medium text-up' : 'font-medium text-down'}>{ok ? `✓ ${t('lab.nr.right')}` : `✕ ${t('lab.nr.wrong')}`}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-soft">
                    {actual === 'flat' ? t('lab.nr.noEffect') : t(`lab.n.${event.id}.${s}`)}{' '}
                    <span className="whitespace-nowrap">{t('lab.nr.moved')}: <Move pct={(moved.after[i] / moved.before[i] - 1) * 100} /></span>
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[14px] text-soft">{t('lab.nr.noiseNote')}</p>
          <button className="btn mt-4" onClick={reset}>{t('lab.nr.again')}</button>
        </div>
      )}
    </section>
  )
}

/** Shown when one company holds most of the money: what a single bad headline would do. */
export function ConcentrationLesson({ index, share, shares, cash, prices }: { index: number; share: number; shares: number[]; cash: number; prices: number[] }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const c = COMPANIES[index]
  // the public headline that hurts this company's sector most
  const worst = PUBLIC_NEWS.reduce((a, b) => ((b.impact[c.sector] ?? 0) < (a.impact[c.sector] ?? 0) ? b : a))
  const hit = (holdings: number[]) => holdings.reduce((sum, n, i) => sum + n * prices[i] * (Math.exp(worst.impact[COMPANIES[i].sector] ?? 0) - 1), 0)
  const total = worth(shares, prices) + cash
  const even = COMPANIES.map((_, i) => total / COMPANIES.length / prices[i])
  return (
    <Lesson tone="warn" kicker={t('lab.c.k')} title={t('lab.c.t', { pct: Math.round(share * 100), name: c.name })}>
      <p>{t('lab.c.body')}</p>
      {!shown ? <button className="btn-quiet" onClick={() => setShown(true)}>{t('lab.c.run')}</button> : (
        <div role="status" className="space-y-3">
          <p className="rounded-md border border-line bg-paper p-3.5 text-ink">{t(`lab.n.${worst.id}.h`)}</p>
          <dl className="grid grid-cols-2 gap-4">
            <Stat label={t('lab.c.yours')} value={rupees(hit(shares))} sub={t('lab.c.yoursSub', { name: c.name })} />
            <Stat label={t('lab.c.even')} value={rupees(hit(even))} sub={t('lab.c.evenSub')} />
          </dl>
          <p className="text-ink">{t('lab.c.take')}</p>
        </div>
      )}
    </Lesson>
  )
}

/**
 * The panic test: a scripted crash on a copy of the market, then "sell or hold?", then the
 * outcome a few months later. The real board is not touched.
 */
export function PanicTest({ m, shares, onDone }: { m: Market; shares: number[]; onDone: (held: boolean) => void }) {
  const { t } = useI18n()
  const [test, setTest] = useState<{ days: Market[]; holdings: number[]; sample: boolean } | null>(null)
  const [choice, setChoice] = useState<'sell' | 'hold' | null>(null)
  const CRASH_DAYS = 15, AFTER = 90

  const start = () => {
    const invested = worth(shares, m.prices) > 0
    const holdings = invested ? shares : COMPANIES.map((_, i) => 100000 / COMPANIES.length / m.prices[i])
    const crash = run(release(m, 'crash'), CRASH_DAYS)
    const after = run(release(crash[crash.length - 1], 'recovery'), AFTER).slice(1)
    setTest({ days: [...crash, ...after], holdings, sample: !invested }); setChoice(null)
  }
  const decide = (c: 'sell' | 'hold') => { setChoice(c); onDone(c === 'hold') }

  if (!test) {
    return (
      <Lesson kicker={t('lab.p.k')} title={t('lab.p.t')}>
        <p>{t('lab.p.body')}</p>
        <button className="btn-quiet" onClick={start}>{t('lab.p.start')}</button>
      </Lesson>
    )
  }
  const values = test.days.map(d => worth(test.holdings, d.prices))
  const before = values[0], bottom = values[CRASH_DAYS], end = values[values.length - 1]
  return (
    <Lesson kicker={t('lab.p.k')} title={t('lab.p.t')}>
      {test.sample && <p>{t('lab.p.sample')}</p>}
      <p className="text-ink" role="status">{t('lab.p.crashed', { before: rupees(before), after: rupees(bottom), pct: Math.round((1 - bottom / before) * 100) })}</p>
      <LineChart label={t('lab.p.chart')} format={rupees} height={150}
        series={choice
          ? [{ name: t('lab.p.held'), values }, { name: t('lab.p.sold'), values: values.map((v, i) => (i <= CRASH_DAYS ? v : bottom)), tone: 'rust', dashed: true }]
          : [{ name: t('lab.p.held'), values: values.slice(0, CRASH_DAYS + 1) }]}
        marks={choice ? [{ at: CRASH_DAYS, text: t('lab.p.mark') }] : undefined} />
      {!choice ? (
        <div>
          <p className="font-serif text-[1.3rem] text-ink">{t('lab.p.ask')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-quiet" onClick={() => decide('sell')}>{t('lab.p.sell')}</button>
            <button className="btn-quiet" onClick={() => decide('hold')}>{t('lab.p.hold')}</button>
          </div>
        </div>
      ) : (
        <div role="status" className="space-y-3">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label={t('lab.p.sold')} value={rupees(bottom)} sub={choice === 'sell' ? t('lab.p.you') : undefined} />
            <Stat label={t('lab.p.held')} value={rupees(end)} sub={choice === 'hold' ? t('lab.p.you') : undefined} />
          </dl>
          <p className="text-ink">{t(choice === 'hold' ? 'lab.p.takeHold' : 'lab.p.takeSell', { diff: rupees(Math.abs(end - bottom)) })}</p>
          <p>{t('lab.p.note')}</p>
          <button className="link" onClick={() => { setTest(null); setChoice(null) }}>{t('lab.p.again')}</button>
        </div>
      )}
    </Lesson>
  )
}

/** A steady company and a wild one over the same six months, with no news. */
export function VolatilityLesson({ seed, onDone }: { seed: number; onDone: () => void }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const steady = COMPANIES.findIndex(c => c.id === 'ggf'), wild = COMPANIES.findIndex(c => c.id === 'tpp')
  const data = useMemo(() => {
    const days = run(createMarket(fork(seed, 7)), 126)
    const line = (i: number) => days.map(d => (d.prices[i] / days[0].prices[i]) * 100)
    // the largest fall from any earlier high
    const fall = (v: number[]) => { let peak = v[0], worst = 0; v.forEach(x => { peak = Math.max(peak, x); worst = Math.min(worst, x / peak - 1) }); return worst * 100 }
    const a = line(steady), b = line(wild)
    return { a, b, fallA: fall(a), fallB: fall(b) }
  }, [seed, steady, wild])
  return (
    <Lesson kicker={t('lab.v.k')} title={t('lab.v.t')}>
      <p>{t('lab.v.body', { steady: COMPANIES[steady].name, wild: COMPANIES[wild].name })}</p>
      {!shown ? <button className="btn-quiet" onClick={() => { setShown(true); onDone() }}>{t('lab.v.run')}</button> : (
        <div className="space-y-3">
          <LineChart label={t('lab.v.chart')} height={150} format={n => `₹ ${Math.round(n)}`}
            series={[{ name: COMPANIES[steady].name, values: data.a }, { name: COMPANIES[wild].name, values: data.b, tone: 'amber', dashed: true }]} />
          <dl className="grid grid-cols-2 gap-4">
            <Stat label={`${COMPANIES[steady].name}`} value={<Move pct={data.fallA} />} sub={t('lab.v.fall')} />
            <Stat label={`${COMPANIES[wild].name}`} value={<Move pct={data.fallB} />} sub={t('lab.v.fall')} />
          </dl>
          <p className="text-ink">{t('lab.v.take')}</p>
        </div>
      )}
    </Lesson>
  )
}
