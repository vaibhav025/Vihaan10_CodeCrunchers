import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { FastForward, Pause, Play } from '../ui/icons'
import { Move, Tick } from '../lab/kit'
import { useI18n } from '../../lib/i18n'
import { rupees } from '../../lib/format'
import { COMPANIES } from '../../sim/companies'
import { createMarket, pct, run, step, type Market } from '../../sim/market'
import { rise } from './panels'

const WARMUP = 60, KEEP = 120, DAYS = 60, NEWS = 1 / 25
const seedOf = () => { try { return Number(localStorage.getItem('pq.lab.seed')) || 2026 } catch { return 2026 } }

/** Price chart for one company: glowing line and fill, axis prices, and a crosshair that reads the price on any day (pointer, touch or arrow keys). */
function PriceChart({ values, days, label }: { values: number[]; days: number[]; label: string }) {
  const { t } = useI18n()
  const id = useId(), box = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<number | null>(null)
  const n = values.length, W = 600, H = 200
  let lo = Math.min(...values), hi = Math.max(...values)
  if (hi === lo) { hi += 1; lo -= 1 }
  const pad = (hi - lo) * 0.1, top = hi + pad, bot = lo - pad
  const x = (i: number) => (i / (n - 1)) * W, y = (v: number) => H - ((v - bot) / (top - bot)) * H
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const fell = values[n - 1] < values[0], c = fell ? 'rgb(var(--down))' : 'rgb(var(--up))'
  const pick = (e: PointerEvent) => { const r = box.current!.getBoundingClientRect(); setAt(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))) }
  const keys = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setAt(a => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1)))) } }
  const l = at === null ? 0 : (at / (n - 1)) * 100
  const ch = at === null ? 0 : ((values[at] - values[0]) / values[0]) * 100
  return (
    <div className="flex items-stretch gap-2">
      <div className="mono flex w-[3.6rem] shrink-0 flex-col justify-between whitespace-nowrap py-1 text-right text-[11px] text-soft" aria-hidden><span>{rupees(hi)}</span><span>{rupees(lo)}</span></div>
      <div ref={box} tabIndex={0} role="img" aria-label={label} onKeyDown={keys} onBlur={() => setAt(null)}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={e => { if (e.pointerType === 'mouse') setAt(null) }}
        className="relative h-[190px] min-w-0 flex-1 cursor-crosshair touch-pan-y rounded-[14px] sm:h-[230px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mkt-chart absolute inset-0 h-full w-full" aria-hidden>
          <defs><linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".32" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(var(--ink) / .07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${id}f)`} />
          <line x1="0" x2={W} y1={y(values[n - 1])} y2={y(values[n - 1])} stroke={c} strokeOpacity=".45" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          <polyline points={pts} fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
        </svg>
        <span aria-hidden className="mkt-end" style={{ top: `${(y(values[n - 1]) / H) * 100}%`, background: c, color: c }} />
        {at !== null && (<>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-ink/40" style={{ left: `${l}%` }} />
          <span aria-hidden className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#050506]" style={{ left: `${l}%`, top: `${(y(values[at]) / H) * 100}%`, background: c }} />
          <div role="status" className="mono pointer-events-none absolute top-2 z-10 rounded-lg border border-ink/15 bg-card/95 px-2.5 py-1.5 text-[12px] shadow-xl" style={l > 55 ? { right: `${100 - l + 3}%` } : { left: `${l + 3}%` }}>
            <span className="block text-soft">{t('lab.s.dayN', { n: days[at] })}</span>
            <span className="block text-[14px] text-ink">{rupees(values[at])}</span>
            <span className={`block ${ch < 0 ? 'text-down' : 'text-up'}`}>{ch < 0 ? '−' : '+'}{Math.abs(ch).toFixed(1)}%</span>
          </div>
        </>)}
      </div>
    </div>
  )
}

/** A tiny line for a board chip. */
function Spark({ values, up }: { values: number[]; up: boolean }) {
  const lo = Math.min(...values), hi = Math.max(...values), d = hi - lo || 1
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(28 - ((v - lo) / d) * 24).toFixed(1)}`).join(' ')
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full" aria-hidden><polyline points={pts} fill="none" stroke={up ? 'rgb(var(--up))' : 'rgb(var(--down))'} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>
}

/** The Lab's market on the dashboard: the chosen company large, and the whole board as chips with sparklines. Same market as the Lab. */
export default function MarketPulse({ i }: { i: number }) {
  const { t } = useI18n()
  const [hist, setHist] = useState<Market[]>(() => run(createMarket(seedOf()), WARMUP, { auto: 1 / 30 }))
  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const mk = hist[hist.length - 1]
  const advance = useCallback(() => setHist(h => [...h, step(h[h.length - 1], { auto: NEWS })].slice(-KEEP)), [])
  useEffect(() => { if (!playing) return; const id = setInterval(advance, 1100); return () => clearInterval(id) }, [playing, advance])
  const c = COMPANIES[sel], last = hist.slice(-DAYS)
  const first = last[0].prices[sel], now = mk.prices[sel], move = ((now - first) / first) * 100, up = move >= 0
  const icon = 'grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:border-ink/40 hover:bg-ink/[0.05]'
  return (
    <m.section {...rise(i)} aria-labelledby="mp-h" className="mkt hud relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="mkt-glow" style={{ background: up ? 'rgb(var(--up) / .16)' : 'rgb(var(--down) / .16)' }} />
      <div className="relative flex items-center justify-between gap-3">
        <h2 id="mp-h" className="flex items-center gap-2.5">
          <span className={`mkt-live ${playing ? 'on' : ''}`} aria-hidden />
          <span className="label">{t('lab.s.board')}</span>
          <span className="mono text-[12px] text-soft">· {t('lab.s.dayN', { n: mk.day })}</span>
        </h2>
        <div className="flex gap-2">
          <button type="button" className={icon} aria-label={t('lab.s.next')} title={t('lab.s.tipNext')} onClick={advance}><FastForward size={16} strokeWidth={1.6} aria-hidden /></button>
          <button type="button" className={`${icon} ${playing ? '!border-up/60 !text-up' : ''}`} aria-pressed={playing} aria-label={t(playing ? 'lab.s.pause' : 'lab.s.play')} title={t('lab.s.tipPlay')} onClick={() => setPlaying(p => !p)}>
            {playing ? <Pause size={16} strokeWidth={1.6} aria-hidden /> : <Play size={16} strokeWidth={1.6} aria-hidden />}
          </button>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-soft">{c.name} <span className="text-[13px]">· {t(`lab.sec.${c.sector}`)}</span></p>
          <p className="mono mt-1 text-[clamp(2.2rem,5vw,3rem)] leading-none tracking-[-0.03em] text-ink"><Tick value={now}>{rupees(now)}</Tick></p>
        </div>
        <span className={`mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${up ? 'bg-up/[0.14] text-up' : 'bg-down/[0.14] text-down'}`}>
          {up ? '▲' : '▼'} {Math.abs(move).toFixed(1)}% <span className="text-soft">· {t('mp.days', { n: last.length })}</span>
        </span>
      </div>
      <div className="relative mt-4"><PriceChart values={last.map(d => d.prices[sel])} days={last.map(d => d.day)} label={t('lab.s.chart', { name: c.name, n: last.length })} /></div>

      <ul className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COMPANIES.map((co, n) => {
          const p0 = last[0].prices[n], cu = mk.prices[n], u = cu >= p0
          return (
            <li key={co.id}>
              <button type="button" aria-pressed={sel === n} onClick={() => setSel(n)} aria-label={`${co.name}. ${t('lab.s.price')} ${rupees(cu)}`}
                className={`mkt-chip w-full rounded-xl border p-2.5 text-left transition-all duration-200 ${sel === n ? 'border-ink/50 bg-ink/[0.07]' : 'border-ink/10 hover:-translate-y-0.5 hover:border-ink/30'}`}>
                <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-medium text-ink">{co.name.split(' ')[0]}</span><span className="mono shrink-0 text-[11.5px]"><Move pct={pct(mk.parts[n].total)} /></span></span>
                <Spark values={hist.slice(-30).map(d => d.prices[n])} up={u} />
                <span className="mono block text-[13px] text-ink"><Tick value={cu}>{rupees(cu)}</Tick></span>
              </button>
            </li>
          )
        })}
      </ul>
      <Link to="/lab/stocks" className="link relative mt-3 !min-h-[44px]">{t('mp.open')} →</Link>
    </m.section>
  )
}
