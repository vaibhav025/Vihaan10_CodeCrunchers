import { useMemo, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { Move, Tick } from '../lab/kit'
import { useI18n } from '../../lib/i18n'
import { rupees } from '../../lib/format'
import { useMoney } from '../../lib/tracker'
import { dateLabel, holdingsSummary, indexMove, linkedHoldings, quotes, useMarketDay } from '../../lib/marketDay'
import { rise } from './panels'

const CHIPS = 8
const sign = (n: number, d = 2) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}%`

/** Intraday price chart for one stock: glowing line and fill, axis prices, and a crosshair that reads the price at any minute (pointer, touch or arrow keys). */
function PriceChart({ values, times, base, label }: { values: number[]; times: string[]; base: number; label: string }) {
  const { t } = useI18n()
  const id = useId(), box = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<number | null>(null)
  const n = values.length, W = 600, H = 200
  let lo = Math.min(...values), hi = Math.max(...values)
  if (hi === lo) { hi += 1; lo -= 1 }
  const pad = (hi - lo) * 0.1, top = hi + pad, bot = lo - pad
  const x = (i: number) => (i / (n - 1)) * W, y = (v: number) => H - ((v - bot) / (top - bot)) * H
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const fell = values[n - 1] < base, c = fell ? 'rgb(var(--down))' : 'rgb(var(--up))'
  const pick = (e: PointerEvent) => { const r = box.current!.getBoundingClientRect(); setAt(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))) }
  const keys = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setAt(a => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1)))) } }
  const l = at === null ? 0 : (at / (n - 1)) * 100
  const ch = at === null ? 0 : ((values[at] - base) / base) * 100
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
            <span className="block text-soft">{t('mk.time', { time: times[at] })}</span>
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

/** The real NSE trading day on the dashboard: the chosen stock large, the user's own stocks first among the chips, then the day's top gainers and fallers. */
export default function MarketPulse({ i }: { i: number }) {
  const { t } = useI18n()
  const { status, data, real } = useMarketDay()
  const money = useMoney()
  const [picked, setPicked] = useState<string | null>(null)
  const list = useMemo(() => (data ? quotes(data) : []), [data])
  const mine = useMemo(() => (data && real ? linkedHoldings(data, money.assets) : []), [data, real, money.assets])
  const chips = useMemo(() => {
    const own = [...new Set(mine.map(h => h.quote.symbol))]
    // the day's top gainers and top fallers, alternating, so both sides of the market show; real data only
    const free = list.filter(q => !own.includes(q.symbol))
    const gainers = free.filter(q => q.pct > 0).sort((a, b) => b.pct - a.pct)
    const fallers = free.filter(q => q.pct <= 0).sort((a, b) => a.pct - b.pct)
    const mixed: string[] = []
    for (let k = 0; mixed.length < free.length && k < free.length; k++) {
      if (gainers[k]) mixed.push(gainers[k].symbol)
      if (fallers[k]) mixed.push(fallers[k].symbol)
    }
    return [...own, ...mixed].slice(0, CHIPS).map(s => list.find(q => q.symbol === s)!)
  }, [list, mine])

  if (!data) {
    return (
      <m.section {...rise(i)} aria-labelledby="mp-h" className="mkt hud relative overflow-hidden p-5 sm:p-6">
        <h2 id="mp-h" className="label">{t('mk.board')}</h2>
        <p className="mt-3 text-[15px] text-soft" role="status">{t(status === 'loading' ? 'mk.loading' : 'mk.missing')}</p>
      </m.section>
    )
  }
  const q = list.find(x => x.symbol === picked) ?? chips[0], s = data.stocks[q.index]
  const up = q.pct >= 0, date = dateLabel(data), nifty = indexMove(data), sum = holdingsSummary(mine)
  return (
    <m.section {...rise(i)} aria-labelledby="mp-h" className="mkt hud relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="mkt-glow" style={{ background: up ? 'rgb(var(--up) / .16)' : 'rgb(var(--down) / .16)' }} />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <h2 id="mp-h" className="flex items-center gap-2.5">
          <span className="label">{t('mk.board')}</span>
          <span className="mono text-[12px] text-soft">· {t('mk.close', { date })}</span>
        </h2>
        <span className="mono text-[13px] text-soft">{t('mk.nifty')} <Move pct={nifty} digits={2} /></span>
      </div>
      {data.synthetic && <p className="relative mt-3 rounded-md border border-rust px-3 py-2 text-[13px] text-rust" role="note">{t('mk.sample')}</p>}

      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-soft">{q.name} <span className="text-[13px]">· {q.symbol}</span></p>
          <p className="mono mt-1 text-[clamp(2.2rem,5vw,3rem)] leading-none tracking-[-0.03em] text-ink"><Tick value={q.price}>{rupees(q.price)}</Tick></p>
        </div>
        <span className={`mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${up ? 'bg-up/[0.14] text-up' : 'bg-down/[0.14] text-down'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.pct).toFixed(2)}% <span className="text-soft">· {t('mk.vsPrev')}</span>
        </span>
      </div>
      <p className="relative mt-1 mono text-[12px] text-soft">{t('mk.range', { low: rupees(q.low), high: rupees(q.high) })}</p>
      <div className="relative mt-3"><PriceChart values={s.close} times={data.times} base={s.prevClose} label={t('mk.chart', { name: q.name, date })} /></div>

      {mine.length > 0 && (
        <p className="relative mt-4 rounded-lg border border-ink/10 px-3 py-2 text-[14px] text-soft">
          <span className="text-ink">{t('mk.yours')}:</span> {t('mk.yoursDay', { chg: `${sum.change >= 0 ? '+' : '−'}${rupees(Math.abs(sum.change))}`, pct: sign(sum.pct) })}
        </p>
      )}

      <ul className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {chips.map(c => {
          const own = mine.some(h => h.quote.symbol === c.symbol)
          return (
            <li key={c.symbol}>
              <button type="button" aria-pressed={q.symbol === c.symbol} onClick={() => setPicked(c.symbol)} aria-label={`${c.name}. ${t('lab.s.price')} ${rupees(c.price)}, ${sign(c.pct)}`}
                className={`mkt-chip w-full rounded-xl border p-2.5 text-left transition-all duration-200 ${q.symbol === c.symbol ? 'border-ink/50 bg-ink/[0.07]' : 'border-ink/10 hover:-translate-y-0.5 hover:border-ink/30'}`}>
                <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-medium text-ink">{c.symbol}{own ? ' ★' : ''}</span><span className="mono shrink-0 text-[11.5px]"><Move pct={c.pct} /></span></span>
                <Spark values={data.stocks[c.index].close.filter((_, k) => k % 5 === 0)} up={c.pct >= 0} />
                <span className="mono block text-[13px] text-ink">{rupees(c.price)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="relative mt-3 text-[12px] text-soft">{t('mk.source', { date })}</p>
      <Link to="/lab/replay" className="link relative mt-2 !min-h-[44px]">{t('mk.replay')} →</Link>
    </m.section>
  )
}
