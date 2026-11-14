import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import './lab.css'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, FlaskConical, Info, Minus, X } from '../ui/icons'
import { Label } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { today, useSession } from '../../lib/session'
import { setMeta } from '../../lib/meta'
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

/** "How to play" in three steps. Open on the first visit to each Lab page, then a small link to bring it back. */
export function HowTo({ id }: { id: string }) {
  const { t } = useI18n()
  const key = `pq.howto.${id}`
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(key) !== '1' } catch { return false } })
  const close = () => { setOpen(false); try { localStorage.setItem(key, '1') } catch { /* private mode */ } }
  if (!open) return <button type="button" className="link !min-h-[44px] gap-1.5 text-soft" onClick={() => setOpen(true)}><Info size={14} strokeWidth={1.6} aria-hidden />{t('howto.show')}</button>
  return (
    <section aria-labelledby={`howto-${id}`} className="hud relative border-up/40 p-5 sm:p-6">
      <button type="button" onClick={close} aria-label={t('howto.close')} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-soft hover:text-ink"><X size={17} strokeWidth={1.6} aria-hidden /></button>
      <h2 id={`howto-${id}`} className="lab-eyebrow !flex pr-10"><i aria-hidden />{t('howto.title')}</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(n => (
          <li key={n} className="flex gap-3 text-[15px] leading-snug text-ink">
            <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/25 text-[13px]">{n}</span>
            <span>{t(`howto.${id}.${n}`)}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-quiet mt-5" onClick={close}>{t('howto.got')}</button>
    </section>
  )
}

/** Page heading with a way back to the Lab. */
export function LabHead({ title, sub, back = true, children }: { title: string; sub: string; back?: boolean; children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
      <div className="max-w-3xl">
        {back && <Link to="/lab" className="link !min-h-[44px]">← {t('lab.back')}</Link>}
        <p className="lab-eyebrow !flex mt-2"><i aria-hidden />{back ? t('lab.title') : t('lab.pretend')}</p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,4.25rem)] font-semibold leading-[1] tracking-[-0.04em] text-ink">{title}</h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-soft">{sub}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}{back && <span className="lab-chip">{t('lab.pretend')}</span>}</div>
    </header>
  )
}

/** A figure that flashes green when it rises and red when it falls. */
export function Tick({ value, children, className = '' }: { value: number; children: ReactNode; className?: string }) {
  const prev = useRef(value), dir = useRef<'' | 'up' | 'down'>(''), n = useRef(0)
  if (value !== prev.current) { dir.current = value > prev.current ? 'up' : 'down'; prev.current = value; n.current++ }
  return <span key={n.current} className={`tick ${dir.current} ${className}`}>{children}</span>
}

/** A percentage change. The arrow and the sign carry the direction, not colour alone. */
export function Move({ pct, className = '', digits = 1 }: { pct: number; className?: string; digits?: number }) {
  const { t } = useI18n()
  const flat = Math.abs(pct) < 0.05
  const up = pct > 0
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${flat ? 'text-soft' : up ? 'text-up' : 'text-down'} ${className}`}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      <span className="sr-only">{t(flat ? 'lab.flat' : up ? 'lab.up' : 'lab.down')}</span>
      {flat ? '0.0' : `${up ? '+' : '−'}${Math.abs(pct).toFixed(digits)}`}%
    </span>
  )
}

export interface Series { name: string; values: number[]; tone?: 'forest' | 'amber' | 'soft' | 'rust'; dashed?: boolean }
// the main line is green, a warning line red; a single line turns red when it ends below where it began
const STROKE = { forest: 'rgb(var(--up))', amber: 'rgb(var(--amber))', soft: 'rgb(var(--soft))', rust: 'rgb(var(--down))' }

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
  const lead = series[0], fell = series.length === 1 && lead.values.length > 1 && lead.values[lead.values.length - 1] < lead.values[0]
  const colour = (s: Series) => (s === lead && !s.tone && fell ? STROKE.rust : STROKE[s.tone ?? 'forest'])
  const leadPts = lead.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <figure>
      <div className="flex items-stretch gap-2">
        <div className="flex w-[4.5rem] shrink-0 flex-col justify-between py-0.5 text-right" aria-hidden>
          <span className="label !tracking-normal">{format(hi - pad)}</span>
          <span className="label !tracking-normal">{format(lo + pad)}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-labelledby={id} className="lab-chart w-full" style={{ height }}>
          <title id={id}>{label}</title>
          <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colour(lead)} stopOpacity="0.32" /><stop offset="1" stopColor={colour(lead)} stopOpacity="0" /></linearGradient></defs>
          {lead.values.length > 1 && <polygon points={`0,${H} ${leadPts} ${x(lead.values.length - 1).toFixed(1)},${H}`} fill={`url(#${id}-fill)`} />}
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(var(--ink) / 0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {marks?.map(mk => <line key={mk.at} x1={x(mk.at)} x2={x(mk.at)} y1="0" y2={H} stroke="rgb(var(--down))" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}
          {series.map(s => (
            <polyline key={s.name} fill="none" stroke={colour(s)} strokeWidth={s === lead ? 2.5 : 2} strokeLinejoin="round" strokeLinecap="round"
              className={s === lead ? 'glow' : undefined} style={{ color: colour(s) }}
              strokeDasharray={s.dashed ? '7 5' : undefined} vectorEffect="non-scaling-stroke"
              points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />
          ))}
        </svg>
      </div>
      {(series.length > 1 || !!marks?.length) && (
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-[5rem]">
          {series.length > 1 && series.map(s => (
            <span key={s.name} className="inline-flex items-center gap-2 text-[13px] text-soft">
              <svg width="26" height="6" aria-hidden><line x1="0" x2="26" y1="3" y2="3" stroke={colour(s)} strokeWidth="2" strokeDasharray={s.dashed ? '7 5' : undefined} /></svg>
              {s.name}
            </span>
          ))}
          {marks?.map(mk => (
            <span key={mk.at} className="inline-flex items-center gap-2 text-[13px] text-soft">
              <svg width="6" height="14" aria-hidden><line x1="3" x2="3" y1="0" y2="14" stroke="rgb(var(--down))" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
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
      setMeta({ labDay: today() })
      if (r.xp_earned > 0) { toast(t('lab.xp', { n: r.xp_earned })); void refresh() }
      else if (r.xp_capped) toast(t('lab.xpCap'))
      return r
    } catch {
      toast(t('lab.saveFail'))
      return null
    }
  }, [refresh, t, toast])
}
