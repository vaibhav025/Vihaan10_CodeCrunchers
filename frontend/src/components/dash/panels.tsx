import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, Landmark, Lightbulb, PieChart, Route, TrendingUp } from '../ui/icons'
import { Label } from '../ui/kit'
import Term from '../ui/Term'
import FutureLine from './FutureLine'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'
import { useMeta } from '../../lib/useMeta'
import ScoreRing from '../../ui/ScoreRing'
import { futureValue, toToday, useMoney } from '../../lib/tracker'
import { readiness } from '../../lib/readiness'
import { rupees, rupeesShort } from '../../lib/format'
import { api, type Contribution, type LabRow } from '../../lib/api'

const ease = [0.22, 1, 0.36, 1] as const
/** Cards rise in one after another. */
export const rise = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.06 * i, ease } })

/** Lab scores for the dashboard; null while loading. */
export function useLabRows() {
  const [rows, setRows] = useState<LabRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { api.labProgress().then(r => setRows(r.progress)).catch(() => { setRows([]); setFailed(true) }) }, [])
  return { rows, failed }
}

const STEPS = ['tracker', 'retire', 'coach'] as const
const GO = { tracker: '/tracker', retire: '/lab/retire', coach: '/coach', lab: '/lab' }

/** Greeting and the one thing to do next: Tracker, then Retirement Run, then the Coach. */
export function NextStep({ rows }: { rows: LabRow[] | null }) {
  const { t } = useI18n()
  const { user } = useSession()
  const money = useMoney(), meta = useMeta()
  const done = {
    tracker: money.income > 0 || money.assets.length > 0,
    retire: (rows?.find(r => r.module === 'retire')?.runs_completed ?? 0) > 0,
    coach: meta.coachDay !== '',
  }
  const step = !done.tracker ? 'tracker' : rows === null ? null : !done.retire ? 'retire' : !done.coach ? 'coach' : 'lab'
  const h = new Date().getHours()
  const hello = t(h < 12 ? 'dash.morning' : h < 17 ? 'dash.afternoon' : 'dash.evening', { name: (user?.name ?? '').trim().split(' ')[0] })
  return (
    <m.section {...rise(0)} aria-labelledby="dash-h" className="band p-6 sm:p-9">
      <div data-guide="next-step" className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 id="dash-h" className="text-[clamp(1.9rem,4.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">{hello}</h1>
          <p className="label mt-5">{t('dash.next')}{step && step !== 'lab' ? ` · ${t('dash.stepOf', { n: STEPS.indexOf(step) + 1 })}` : ''}</p>
          <div className="min-h-[5.5rem]">
            {step && <>
              <p className="mt-1.5 text-[clamp(1.25rem,2.6vw,1.7rem)] font-medium leading-snug text-ink">{t(`dash.s.${step}.t`)}</p>
              <p className="mt-1.5 max-w-xl text-[16px] leading-relaxed text-soft">{t(`dash.s.${step}.d`)}</p>
            </>}
          </div>
          <ol className="mt-4 flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`inline-flex min-h-[32px] items-center gap-2 rounded-full border px-3 text-[13px] ${done[s] ? 'border-up/50 text-ink' : s === step ? 'border-ink/60 text-ink' : 'border-ink/15 text-soft'}`}>
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${done[s] ? 'bg-up text-black' : 'border border-current'}`}>{done[s] ? <Check size={11} strokeWidth={3} aria-hidden /> : i + 1}</span>
                {t(`dash.p.${s}`)}
              </li>
            ))}
          </ol>
        </div>
        {step && <Link to={GO[step]} className="btn w-full gap-2 lg:w-auto">{t(`dash.s.${step}.cta`)}<ArrowUpRight size={17} aria-hidden /></Link>}
      </div>
      <div data-guide="future-line"><FutureLine /></div>
    </m.section>
  )
}

/** The Readiness Score, with what is still missing and how many points each fix is worth. */
export function ScoreCard({ i }: { i: number }) {
  const { t } = useI18n()
  const { user } = useSession()
  const money = useMoney()
  const years = Math.max((user?.retirement_age ?? 60) - (user?.age ?? 25), 0)
  const started = money.assets.length > 0 || money.income > 0
  const r = readiness(money, years)
  const gaps = [...r.parts].map(p => ({ key: p.key, n: Math.round(p.max - p.got) })).filter(p => p.n > 0).sort((a, b) => b.n - a.n).slice(0, 3)
  const needs = [['pay', money.income > 0], ['own', money.assets.length > 0], ['cover', money.health || money.term]] as const
  return (
    <m.section {...rise(i)} aria-labelledby="dash-score" className="hud flex flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={started ? r.score : 0} size={84} label={t('tr.score')} />
        <div className="min-w-0">
          <h2 id="dash-score" className="label">{t('tr.score')}</h2>
          <p className="mt-1 text-[14px] leading-snug text-soft">{t('dash.scoreD')}</p>
        </div>
      </div>
      <p className="label mt-5">{t(started ? 'dash.missing' : 'dash.toStart')}</p>
      <ul className="mt-2 flex-1 space-y-1.5 text-[15px]">
        {started
          ? gaps.length ? gaps.map(g => (
            <li key={g.key} className="flex items-baseline justify-between gap-3"><span className="text-ink">{t(`dash.part.${g.key}`)}</span><span className="num shrink-0 text-up">{t('dash.pts', { n: g.n })}</span></li>
          )) : <li className="text-ink">{t('dash.allGood')}</li>
          : needs.map(([k, ok]) => (
            <li key={k} className="flex items-center gap-2.5">
              <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${ok ? 'border-up bg-up text-black' : 'border-soft/60'}`}>{ok && <Check size={12} strokeWidth={3} aria-hidden />}</span>
              <span className={ok ? 'text-soft line-through' : 'text-ink'}>{t(`dash.need.${k}`)}</span>
            </li>
          ))}
      </ul>
      <Link to="/tracker" className="link mt-4 !min-h-[44px] self-start">{t('dash.fix')} →</Link>
    </m.section>
  )
}

/** Money at retirement, drawn year by year from the Tracker's holdings. */
export function CorpusCard({ i }: { i: number }) {
  const { t } = useI18n()
  const { user } = useSession()
  const money = useMoney()
  const age = user?.age ?? 25, retire = user?.retirement_age ?? 60
  const years = Math.max(retire - age, 1)
  const gid = useId()
  const pts = useMemo(() => Array.from({ length: years + 1 }, (_, y) => money.assets.reduce((s, a) => s + futureValue(a, y), 0)), [money.assets, years])
  const end = pts[pts.length - 1], has = end > 0
  const W = 300, H = 96, max = Math.max(end, 1)
  const xy = pts.map((v, k) => [(k / years) * W, H - 6 - (v / max) * (H - 14)] as const)
  const line = has ? xy.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') : `M0 ${H - 8} C 90 ${H - 12}, 190 ${H - 40}, ${W} 14`
  return (
    <m.section {...rise(i)} aria-labelledby="dash-corpus" className="hud flex flex-col p-5 sm:p-6">
      <h2 id="dash-corpus" className="label">{t('dash.corpus', { age: retire })} · <Term k="corpus" /></h2>
      <p className={`num mt-2 text-[2.1rem] leading-none ${has ? 'text-ink' : 'text-soft'}`}>{has ? rupeesShort(end) : '₹ —'}</p>
      <p className="mt-1.5 min-h-[2.6em] text-[14px] leading-snug text-soft">{has ? t('dash.corpusReal', { v: rupeesShort(toToday(end, years, money.inflation)) }) : t('dash.corpusEmpty')}</p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-auto h-24 w-full" role="img" aria-label={t('dash.corpusChart', { age: retire })}>
        <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgb(var(--up))" stopOpacity=".35" /><stop offset="1" stopColor="rgb(var(--up))" stopOpacity="0" /></linearGradient></defs>
        {has && <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${gid})`} />}
        <m.path d={line} fill="none" stroke={has ? 'rgb(var(--up))' : 'rgb(var(--ink) / .3)'} strokeWidth="2" strokeDasharray={has ? undefined : '4 6'} strokeLinecap="round"
          initial={{ pathLength: has ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.3, ease }} />
      </svg>
      <p className="label mt-1 flex justify-between"><span>{t('dash.now')}</span><span>{t('dash.atAge', { age: retire })}</span></p>
    </m.section>
  )
}

const DAYS = 84
const dayKey = (d: Date) => d.toLocaleDateString('en-CA')

/** This month's logged contributions and a 12-week grid of the days money went in. */
export function MonthCard({ i }: { i: number }) {
  const { t } = useI18n()
  const [list, setList] = useState<Contribution[] | null>(null)
  useEffect(() => { api.history().then(r => setList(r.contributions)).catch(() => setList([])) }, [])
  const { cells, month, count } = useMemo(() => {
    const by = new Map<string, number>()
    const now = new Date(); let month = 0
    for (const c of list ?? []) {
      if (!c.contributed_at) continue
      const d = new Date(c.contributed_at)
      by.set(dayKey(d), (by.get(dayKey(d)) ?? 0) + c.amount)
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) month += c.amount
    }
    // columns are weeks ending this week; rows are Monday to Sunday
    const end = new Date(now); end.setDate(end.getDate() + ((7 - (end.getDay() || 7)) % 7))
    const cells = Array.from({ length: DAYS }, (_, k) => { const d = new Date(end); d.setDate(end.getDate() - (DAYS - 1 - k)); return { v: by.get(dayKey(d)) ?? 0, future: d > now } })
    const max = Math.max(...cells.map(c => c.v), 1)
    return { cells: cells.map(c => ({ ...c, lv: c.v ? (c.v >= max * 0.66 ? 3 : c.v >= max * 0.33 ? 2 : 1) : 0 })), month, count: cells.filter(c => c.v).length }
  }, [list])
  const tone = ['bg-ink/[0.07]', 'bg-up/35', 'bg-up/65', 'bg-up']
  return (
    <m.section {...rise(i)} data-guide="month" aria-labelledby="dash-month" className="hud p-5">
      <div className="flex items-baseline justify-between gap-3"><h2 id="dash-month" className="label">{t('dash.month')}</h2><Label>{t('dash.weeks')}</Label></div>
      <p className="mt-2 flex items-baseline gap-2"><span className="num text-[1.7rem] leading-none text-ink">{list === null ? '…' : rupees(month)}</span><span className="label">{t('dash.logged')}</span></p>
      <div role="img" aria-label={t('dash.heat', { n: count })} className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px]">
        {cells.map((c, k) => <span key={k} className={`aspect-square rounded-[3px] ${c.future ? 'opacity-0' : tone[c.lv]}`} />)}
      </div>
      {list !== null && !count && <p className="mt-3 text-[13px] text-soft">{t('dash.noLog')}</p>}
      <Link to="/profile" className="link mt-3 !min-h-[44px]">{t('dash.log')} →</Link>
    </m.section>
  )
}

const MODS = [['retire', Route], ['stocks', TrendingUp], ['funds', PieChart], ['schemes', Landmark]] as const

/** Best score in each simulator, with a way straight back in. */
export function LabRowCard({ rows, failed, i }: { rows: LabRow[] | null; failed: boolean; i: number }) {
  const { t } = useI18n()
  return (
    <m.section {...rise(i)} aria-labelledby="dash-lab">
      <div className="flex items-baseline justify-between gap-3 px-1"><h2 id="dash-lab" className="label">{t('dash.lab')}</h2><Label className="hidden sm:inline">{t('dash.labD')}</Label></div>
      <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {MODS.map(([id, Icon]) => {
          const p = rows?.find(r => r.module === id), played = !!p && p.runs_completed > 0
          return (
            <li key={id}>
              <Link to={`/lab/${id}`} className="hud pressable flex h-full flex-col p-4">
                <span className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-haze text-forest"><Icon size={17} strokeWidth={1.6} aria-hidden /></span>
                  <span className="num text-[15px] text-ink">{rows === null ? '…' : played ? `${p.best_score}/100` : '—'}</span></span>
                <span className="mt-3 block text-[15px] font-medium leading-tight text-ink">{t(`lab.m.${id}`)}</span>
                <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-ink/10" aria-hidden><m.span className="block h-full rounded-full bg-up" initial={{ width: 0 }} animate={{ width: `${played ? p.best_score : 0}%` }} transition={{ duration: 0.8, delay: 0.3, ease }} /></span>
                <span className="label mt-2.5 inline-flex items-center gap-1">{t(played ? 'dash.again' : 'dash.play')}<ChevronRight size={12} aria-hidden /></span>
              </Link>
            </li>
          )
        })}
      </ul>
      {failed && <p role="alert" className="mt-2 px-1 text-[13px] text-rust">{t('dash.labFail')}</p>}
    </m.section>
  )
}

/** One short line from the coach, changing each day. */
export function TipCard({ i }: { i: number }) {
  const { t } = useI18n()
  const n = (Math.floor(Date.now() / 864e5) % 7) + 1
  return (
    <m.section {...rise(i)} data-guide="tip" aria-labelledby="dash-tip" className="hud p-5">
      <h2 id="dash-tip" className="label inline-flex items-center gap-1.5"><Lightbulb size={13} strokeWidth={1.6} aria-hidden className="text-amber" />{t('dash.tip')}</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-ink">{t(`dash.tip.${n}`)}</p>
      <Link to="/coach" className="link mt-2 !min-h-[44px]">{t('dash.ask')} →</Link>
    </m.section>
  )
}
