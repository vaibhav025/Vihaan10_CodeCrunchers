import { useCallback, useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, FlaskConical, Minus } from '../ui/icons'
import { Label } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'
import { useToast } from '../../ui/Toast'
import { api } from '../../lib/api'

/** The notice every Lab page carries: fictional companies, virtual money, not advice. */
export function LabNote({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <p role="note" className={`flex items-start gap-2.5 rounded-md border border-line bg-haze px-3.5 py-2.5 text-[14px] leading-snug text-ink ${className}`}>
      <FlaskConical size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-forest" />
      <span>{t('lab.note')}</span>
    </p>
  )
}

/** Page heading with a way back to the Lab. */
export function LabHead({ title, sub, back = true, children }: { title: string; sub: string; back?: boolean; children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        {back && <Link to="/lab" className="link !min-h-[44px]">← {t('lab.back')}</Link>}
        <h1 className="text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] text-ink">{title}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-soft">{sub}</p>
      </div>
      {children}
    </header>
  )
}

/** A percentage change. The arrow and the sign carry the direction, not colour alone. */
export function Move({ pct, className = '', digits = 1 }: { pct: number; className?: string; digits?: number }) {
  const { t } = useI18n()
  const flat = Math.abs(pct) < 0.05
  const up = pct > 0
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${flat ? 'text-soft' : up ? 'text-forest' : 'text-rust'} ${className}`}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      <span className="sr-only">{t(flat ? 'lab.flat' : up ? 'lab.up' : 'lab.down')}</span>
      {flat ? '0.0' : `${up ? '+' : '−'}${Math.abs(pct).toFixed(digits)}`}%
    </span>
  )
}

export interface Series { name: string; values: number[]; tone?: 'forest' | 'amber' | 'soft' | 'rust'; dashed?: boolean }
const STROKE = { forest: 'rgb(var(--forest))', amber: 'rgb(var(--amber))', soft: 'rgb(var(--soft))', rust: 'rgb(var(--rust))' }

/**
 * A small line chart. Lines differ by dash pattern as well as colour, the legend names each
 * one, and the whole chart has a text label for screen readers.
 */
export function LineChart({ series, label, height = 180, format = (n: number) => String(Math.round(n)), marks }: {
  series: Series[]; label: string; height?: number; format?: (n: number) => string
  /** x positions (index into the values) to mark with a vertical line */
  marks?: { at: number; text: string }[]
}) {
  const id = useId()
  const all = series.flatMap(s => s.values)
  const n = Math.max(...series.map(s => s.values.length), 2)
  if (!all.length) return null
  let lo = Math.min(...all), hi = Math.max(...all)
  if (hi === lo) { hi += 1; lo -= 1 }
  const pad = (hi - lo) * 0.08
  lo -= pad; hi += pad
  const W = 600, H = 200
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  return (
    <figure>
      <div className="flex items-stretch gap-2">
        <div className="flex w-[4.5rem] shrink-0 flex-col justify-between py-0.5 text-right" aria-hidden>
          <span className="label !tracking-normal">{format(hi - pad)}</span>
          <span className="label !tracking-normal">{format(lo + pad)}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-labelledby={id} className="w-full rounded border border-line bg-paper" style={{ height }}>
          <title id={id}>{label}</title>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(var(--line))" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {marks?.map(mk => <line key={mk.at} x1={x(mk.at)} x2={x(mk.at)} y1="0" y2={H} stroke="rgb(var(--rust))" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}
          {series.map(s => (
            <polyline key={s.name} fill="none" stroke={STROKE[s.tone ?? 'forest']} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dashed ? '7 5' : undefined} vectorEffect="non-scaling-stroke"
              points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />
          ))}
        </svg>
      </div>
      {(series.length > 1 || !!marks?.length) && (
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-[5rem]">
          {series.length > 1 && series.map(s => (
            <span key={s.name} className="inline-flex items-center gap-2 text-[13px] text-soft">
              <svg width="26" height="6" aria-hidden><line x1="0" x2="26" y1="3" y2="3" stroke={STROKE[s.tone ?? 'forest']} strokeWidth="2" strokeDasharray={s.dashed ? '7 5' : undefined} /></svg>
              {s.name}
            </span>
          ))}
          {marks?.map(mk => (
            <span key={mk.at} className="inline-flex items-center gap-2 text-[13px] text-soft">
              <svg width="6" height="14" aria-hidden><line x1="3" x2="3" y1="0" y2="14" stroke="rgb(var(--rust))" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
              {mk.text}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

/** A lesson card: a short title, what happened, and the takeaway. */
export function Lesson({ kicker, title, children, tone = 'plain' }: { kicker: string; title: string; children: ReactNode; tone?: 'plain' | 'warn' }) {
  return (
    <section className={`hud p-5 sm:p-6 ${tone === 'warn' ? '!border-rust/60' : ''}`}>
      <Label className={tone === 'warn' ? '!text-rust' : ''}>{kicker}</Label>
      <h3 className="mt-1.5 text-[1.45rem] leading-tight text-ink">{title}</h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-soft">{children}</div>
    </section>
  )
}

/** One figure with its label, for result rows. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="num mt-1 text-[1.6rem] leading-none text-ink">{value}</dd>
      {sub && <dd className="mt-1 text-[13px] text-soft">{sub}</dd>}
    </div>
  )
}

/**
 * Saves a finished activity and reports the XP. Only a score, an outcome word and lesson
 * ids are sent: no cash, prices or tracker figures leave the browser.
 */
export function useLabSave() {
  const { t } = useI18n()
  const { refresh } = useSession()
  const toast = useToast()
  return useCallback(async (module: 'stocks' | 'retire' | 'funds' | 'schemes', score: number, outcome: string, lessons: string[]) => {
    try {
      const r = await api.saveLab({ module, score: Math.round(Math.min(Math.max(score, 0), 100)), outcome, lessons })
      if (r.xp_earned > 0) { toast(t('lab.xp', { n: r.xp_earned })); void refresh() }
      else if (r.xp_capped) toast(t('lab.xpCap'))
      return r
    } catch {
      toast(t('lab.saveFail'))
      return null
    }
  }, [refresh, t, toast])
}
