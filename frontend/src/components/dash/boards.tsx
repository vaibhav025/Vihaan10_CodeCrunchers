import { useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { CoinIcon, FlaskConical, Landmark, PieChart, Route, Target, TrendingUp } from '../ui/icons'
import { Flame, useCountUp } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { today, useSession } from '../../lib/session'
import { useMeta } from '../../lib/useMeta'
import { levelInfo } from '../../lib/game'
import { norm, totals, useMoney, type AssetType } from '../../lib/tracker'
import { readiness } from '../../lib/readiness'
import { rupees, rupeesShort } from '../../lib/format'
import type { LabRow } from '../../lib/api'
import { rise } from './panels'

const ease = [0.22, 1, 0.36, 1] as const
/** Chart colours: a fixed categorical order checked for colour-blind separation on the dark surface. Colour follows the thing, never its rank. */
const CAT = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const OTHER = '#6b6b6b', BRAND = '#54ACBF'
const SLOT: Partial<Record<AssetType, number>> = { nps: 0, mf: 1, stocks: 2, epf: 3, ppf: 4, fd: 5, gold: 6, property: 7 }

/* ---------- game progress ---------- */

/** Level, XP to the next one, and the counters a player watches: streak, coins, today's quests, Lab runs. */
export function ProgressBoard({ rows, i }: { rows: LabRow[] | null; i: number }) {
  const { t } = useI18n()
  const { user, progress } = useSession()
  const meta = useMeta()
  const xp = user?.total_xp ?? 0, lv = levelInfo(xp)
  const shown = useCountUp(xp, 900)
  const quests = +(progress.simDay === today()) + +(meta.labDay === today()) + +(meta.coachDay === today())
  const runs = rows?.reduce((s, r) => s + r.runs_completed, 0) ?? 0
  const tiles = [
    { k: 'streak', v: progress.streak, sub: t('home.streak'), c: '#fab219', icon: <Flame size={18} /> },
    { k: 'coins', v: progress.coins, sub: t('path.coins'), c: '#c98500', icon: <CoinIcon size={18} strokeWidth={1.6} aria-hidden /> },
    { k: 'quests', v: `${quests}/3`, sub: t('pg.today'), c: BRAND, icon: <Target size={18} strokeWidth={1.6} aria-hidden /> },
    { k: 'runs', v: rows === null ? '…' : runs, sub: t('pg.played'), c: '#3987e5', icon: <FlaskConical size={18} strokeWidth={1.6} aria-hidden /> },
  ]
  return (
    <m.section {...rise(i)} aria-labelledby="pg-h" className="hud grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] lg:items-center">
      <div className="flex items-center gap-4">
        <span className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
          <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90" aria-hidden>
            <circle cx="38" cy="38" r="32" fill="none" stroke="rgb(var(--ink) / .1)" strokeWidth="6" />
            <m.circle cx="38" cy="38" r="32" fill="none" stroke="rgb(var(--up))" strokeWidth="6" strokeLinecap="round" strokeDasharray={201.1}
              initial={{ strokeDashoffset: 201.1 }} animate={{ strokeDashoffset: 201.1 * (1 - lv.pct / 100) }} transition={{ duration: 1.1, delay: 0.2, ease }} />
          </svg>
          <span className="absolute text-center leading-none"><span className="label block !text-[9px]">{t('pg.lv')}</span><span className="num text-[24px] text-ink">{lv.level}</span></span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pg-h" className="label">{t('pg.title')}</h2>
          <p className="mt-1 truncate text-[1.25rem] font-medium leading-tight text-ink">{lv.title}</p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={t('pg.xpBar', { p: lv.pct })}>
            <m.span className="block h-full rounded-full" style={{ background: `linear-gradient(90deg, ${BRAND}, rgb(var(--up)))` }} initial={{ width: 0 }} animate={{ width: `${lv.pct}%` }} transition={{ duration: 1.1, delay: 0.2, ease }} />
          </div>
          <p className="mt-1.5 text-[13px] text-soft"><span className="num text-ink">{Math.round(shown)}</span>{lv.next ? ` / ${lv.next} XP · ${t('pg.toNext', { n: lv.toNext, lv: lv.level + 1 })}` : ` XP · ${t('pg.max')}`}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((x, n) => (
          <m.li key={x.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 + 0.07 * n, ease }}
            className="tile relative overflow-hidden p-3.5 transition-transform duration-200 hover:-translate-y-0.5">
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: x.c }} />
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${x.c}26`, color: x.c }}>{x.icon}</span>
            <span className="num mt-2.5 block text-[1.5rem] leading-none text-ink">{x.v}</span>
            <span className="label mt-1.5 block truncate">{x.sub}</span>
          </m.li>
        ))}
      </ul>
    </m.section>
  )
}

/* ---------- Lab scores ---------- */

const MODS = [['retire', Route], ['stocks', TrendingUp], ['funds', PieChart], ['schemes', Landmark]] as const

/** Best score per simulator as a bar chart. Pick a bar to see runs, last result and when it was last played. */
export function LabBoard({ rows, failed, i }: { rows: LabRow[] | null; failed: boolean; i: number }) {
  const { t, lang } = useI18n()
  const [sel, setSel] = useState(0)
  const of = (id: string) => rows?.find(r => r.module === id)
  const played = MODS.filter(([id]) => (of(id)?.runs_completed ?? 0) > 0)
  const avg = played.length ? Math.round(played.reduce((s, [id]) => s + (of(id)?.best_score ?? 0), 0) / played.length) : 0
  const [id, Icon] = MODS[sel], p = of(id), has = !!p && p.runs_completed > 0
  const when = p?.updated_at ? new Date(p.updated_at).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' }) : '—'
  return (
    <m.section {...rise(i)} aria-labelledby="lb-h" className="hud p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="lb-h" className="label">{t('lb.title')}</h2>
        <p className="text-[13px] text-soft">{t('lb.done', { n: played.length })}{played.length ? <> · {t('lb.avg')} <span className="num text-ink">{avg}</span></> : null}</p>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* one series (best score out of 100), so one colour; the selected bar is brighter */}
        <div>
          <div className="relative h-[190px]">
            {[0, 50, 100].map(v => <span key={v} aria-hidden className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(v / 100) * 150 + 30 - 7}px` }}><span className="num w-6 text-right text-[10px] text-soft">{v}</span><span className="h-px flex-1 bg-ink/[0.07]" /></span>)}
            <div role="group" aria-label={t('lb.title')} className="absolute inset-0 grid grid-cols-4 gap-2 pl-8">
              {MODS.map(([mid], n) => {
                const r = of(mid), sc = r && r.runs_completed > 0 ? r.best_score : 0, on = sel === n
                return (
                  <button key={mid} type="button" aria-pressed={on} onClick={() => setSel(n)} onMouseEnter={() => setSel(n)} onFocus={() => setSel(n)}
                    aria-label={`${t(`lab.m.${mid}`)}: ${sc ? t('lb.outOf', { n: sc }) : t('lab.notYet')}`}
                    className={`group relative flex flex-col justify-end rounded-lg pb-[30px] transition-colors ${on ? 'bg-ink/[0.05]' : ''}`}>
                    <span className="num mb-1 text-center text-[13px] text-ink">{rows === null ? '' : sc || '—'}</span>
                    <m.span className="mx-auto block w-[46%] max-w-[44px] rounded-t-[4px]" style={{ background: BRAND, opacity: on ? 1 : 0.55 }}
                      initial={{ height: 0 }} animate={{ height: Math.max((sc / 100) * 150 - 20, sc ? 4 : 2) }} transition={{ duration: 0.9, delay: 0.25 + 0.08 * n, ease }} />
                    <span className={`absolute inset-x-0 bottom-1.5 truncate px-1 text-center text-[11px] ${on ? 'text-ink' : 'text-soft'}`}>{t(`lb.s.${mid}`)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {failed && <p role="alert" className="mt-2 text-[13px] text-rust">{t('dash.labFail')}</p>}
        </div>
        <m.div key={id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="tile flex flex-col p-4" aria-live="polite">
          <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${BRAND}26`, color: BRAND }}><Icon size={17} strokeWidth={1.6} aria-hidden /></span>
            <span className="text-[16px] font-medium leading-tight text-ink">{t(`lab.m.${id}`)}</span></span>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-[13px]">
            <div><dt className="label">{t('lab.best')}</dt><dd className="num mt-1 text-[1.35rem] leading-none text-ink">{has ? p.best_score : '—'}<span className="text-[12px] text-soft">/100</span></dd></div>
            <div><dt className="label">{t('lb.runs')}</dt><dd className="num mt-1 text-[1.35rem] leading-none text-ink">{p?.runs_completed ?? 0}</dd></div>
            <div><dt className="label">{t('lb.last')}</dt><dd className="num mt-1 text-[1.05rem] leading-tight text-ink">{has ? when : '—'}</dd></div>
          </dl>
          <p className="mt-3 flex-1 text-[14px] leading-snug text-soft">{has ? t('lb.beat', { n: p.best_score }) : t(`lab.m.${id}.d`)}</p>
          <Link to={`/lab/${id}`} className="link mt-2 !min-h-[44px] self-start">{t(has ? 'dash.again' : 'dash.play')} →</Link>
        </m.div>
      </div>
    </m.section>
  )
}

/* ---------- your money (the Tracker's vault) ---------- */

function Donut({ parts, total }: { parts: { key: string; name: string; value: number; c: string }[]; total: number }) {
  const { t } = useI18n()
  const [hot, setHot] = useState<number | null>(null)
  const R = 52, C = 2 * Math.PI * R
  let at = 0
  const cur = hot === null ? null : parts[hot]
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[150px] w-[150px] shrink-0" onMouseLeave={() => setHot(null)}>
        <m.svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={t('vb.allocChart')} initial={{ rotate: -200, opacity: 0 }} animate={{ rotate: -90, opacity: 1 }} transition={{ duration: 0.9, ease }}>
          {parts.map((p, n) => {
            const len = (p.value / total) * C, off = -at; at += len
            // a 2px gap of surface between slices
            return <circle key={p.key} cx="70" cy="70" r={R} fill="none" stroke={p.c} strokeWidth={hot === n ? 22 : 18} strokeDasharray={`${Math.max(len - 2, 0.5)} ${C}`} strokeDashoffset={off}
              opacity={hot === null || hot === n ? 1 : 0.35} style={{ transition: 'opacity .2s, stroke-width .2s' }} onMouseEnter={() => setHot(n)} />
          })}
        </m.svg>
        <span className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="label !text-[10px]">{cur ? cur.name : t('vb.own')}</span>
          <span className="num text-[1.15rem] leading-tight text-ink">{cur ? `${Math.round((cur.value / total) * 100)}%` : rupeesShort(total)}</span>
        </span>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-0.5">
        {parts.map((p, n) => (
          <li key={p.key}>
            <button type="button" onMouseEnter={() => setHot(n)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(n)} onBlur={() => setHot(null)}
              className={`flex min-h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-left text-[14px] transition-colors ${hot === n ? 'bg-ink/[0.07]' : ''}`}>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.c }} />
              <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
              <span className="num shrink-0 text-soft">{rupeesShort(p.value)}</span>
              <span className="num w-9 shrink-0 text-right text-ink">{Math.round((p.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The Tracker at a glance: net worth, what you own, where each month's pay goes, and the score part by part. */
export function VaultBoard({ i }: { i: number }) {
  const { t } = useI18n()
  const { user } = useSession()
  const raw = useMoney()
  const years = Math.max((user?.retirement_age ?? 60) - (user?.age ?? 25), 0)
  const money = norm(raw), tt = totals(raw, years), r = readiness(raw, years)
  const started = raw.assets.length > 0 || raw.income > 0
  const net = useCountUp(tt.netWorth, 900)

  // slices keep the colour of their asset type; types without a slot fold into "Other"
  const named = tt.byType.filter(b => SLOT[b.type] !== undefined).sort((a, b) => SLOT[a.type]! - SLOT[b.type]!)
    .map(b => ({ key: b.type as string, name: t(`as.${b.type}`), value: b.value, c: CAT[SLOT[b.type]!] }))
  const rest = tt.byType.filter(b => SLOT[b.type] === undefined).reduce((s, b) => s + b.value, 0)
  const parts = rest > 0 ? [...named, { key: 'rest', name: t('as.other'), value: rest, c: OTHER }] : named

  const left = Math.max(tt.surplus, 0)
  const flow = [
    { k: 'spend', v: money.expenses, c: CAT[0] }, { k: 'emi', v: money.emi, c: CAT[1] },
    { k: 'invest', v: tt.investing, c: CAT[2] }, { k: 'left', v: left, c: CAT[3] },
  ].filter(f => f.v > 0)
  const flowSum = flow.reduce((s, f) => s + f.v, 0) || 1
  const months = money.expenses ? tt.liquid / money.expenses : 0
  const stats = [
    { k: 'net', v: rupeesShort(net), neg: tt.netWorth < 0 },
    { k: 'invest', v: rupeesShort(tt.investing), neg: false },
    { k: 'left', v: rupeesShort(tt.surplus), neg: tt.surplus < 0 },
    { k: 'cover', v: t('vb.months', { n: months.toFixed(1) }), neg: false },
  ]

  return (
    <m.section {...rise(i)} aria-labelledby="vb-h" className="hud p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="vb-h" className="label">{t('vb.title')}</h2>
        <Link to="/tracker" className="link !min-h-[44px]">{t(started ? 'vb.edit' : 'vb.start')} →</Link>
      </div>
      {!started ? (
        <div className="mt-2 grid items-center gap-6 sm:grid-cols-[150px_minmax(0,1fr)]">
          <svg viewBox="0 0 140 140" className="mx-auto h-[150px] w-[150px]" aria-hidden><circle cx="70" cy="70" r="52" fill="none" stroke="rgb(var(--ink) / .14)" strokeWidth="18" strokeDasharray="5 7" /></svg>
          <div><p className="text-[1.2rem] font-medium leading-snug text-ink">{t('vb.emptyT')}</p><p className="mt-1.5 max-w-lg text-[15px] leading-relaxed text-soft">{t('vb.emptyD')}</p></div>
        </div>
      ) : (<>
        <dl className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {stats.map((s, n) => (
            <m.div key={s.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 + 0.06 * n, ease }} className="tile p-3.5">
              <dt className="label">{t(`vb.s.${s.k}`)}</dt>
              <dd className={`num mt-1.5 text-[1.45rem] leading-none ${s.neg ? 'text-down' : 'text-ink'}`}>{s.v}</dd>
            </m.div>
          ))}
        </dl>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="label">{t('vb.alloc')}</h3>
            <div className="mt-3">{parts.length ? <Donut parts={parts} total={tt.now} /> : <p className="text-[14px] text-soft">{t('vb.noAssets')}</p>}</div>
          </div>
          <div>
            <h3 className="label">{t('vb.flow')}</h3>
            {money.income > 0 ? (<>
              <div className="mt-3 flex h-5 gap-[2px] overflow-hidden rounded-[5px]" role="img" aria-label={t('vb.flowChart')}>
                {flow.map((f, n) => <m.span key={f.k} title={`${t(`vb.f.${f.k}`)}: ${rupees(f.v)}`} style={{ background: f.c }} initial={{ flexGrow: 0 }} animate={{ flexGrow: f.v / flowSum }} transition={{ duration: 0.9, delay: 0.2 + 0.08 * n, ease }} className="h-full min-w-[3px] basis-0" />)}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
                {flow.map(f => <li key={f.k} className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: f.c }} /><span className="min-w-0 flex-1 truncate text-ink">{t(`vb.f.${f.k}`)}</span><span className="num text-soft">{rupeesShort(f.v)}</span></li>)}
              </ul>
              <p className="mt-2 text-[13px] text-soft">{tt.surplus < 0 ? <span className="text-down">{t('vb.over', { v: rupees(-tt.surplus) })}</span> : t('vb.of', { v: rupees(money.income) })}</p>
            </>) : <p className="mt-3 text-[14px] text-soft">{t('vb.noPay')}</p>}
            <h3 className="label mt-5">{t('vb.parts')}</h3>
            <ul className="mt-2.5 space-y-2">
              {r.parts.map((p, n) => (
                <li key={p.key} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem] items-center gap-2.5 text-[13px]">
                  <span className="truncate text-ink">{t(`vb.p.${p.key}`)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-ink/10"><m.span className="block h-full rounded-full" style={{ background: BRAND }} initial={{ width: 0 }} animate={{ width: `${(p.got / p.max) * 100}%` }} transition={{ duration: 0.8, delay: 0.25 + 0.05 * n, ease }} /></span>
                  <span className="num text-right text-soft"><span className="text-ink">{Math.round(p.got)}</span>/{p.max}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>)}
    </m.section>
  )
}
