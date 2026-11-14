import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { type FutureState, STATES } from '../../design-tokens'
import { useI18n } from '../../lib/i18n'

/** A check mark that draws itself when shown (JS-driven path length). */
export function DrawCheck({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0 text-forest">
      <m.path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  )
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`label ${className}`}>{children}</span>
}

/** State chip. Bars carry the meaning as well as colour: zero = 0 of 4, thriving = 4 of 4. */
export function StateChip({ state, className = '' }: { state: FutureState; className?: string }) {
  const { t } = useI18n()
  const n = STATES.indexOf(state)
  return (
    <span className={`inline-flex items-center gap-2 rounded border border-line bg-card px-2.5 py-1.5 ${className}`}>
      <span aria-hidden className="flex items-end gap-[3px]">
        {[1, 2, 3, 4].map(i => (
          <span key={i} className="w-[3px] rounded-sm" style={{ height: 4 + i * 2.5, background: i <= n ? `rgb(var(--${state}))` : 'rgb(var(--line))' }} />
        ))}
      </span>
      <span className="label !text-ink">{t(`state.${state}`)}</span>
    </span>
  )
}

export function Range({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (n: number) => void; format: (n: number) => string
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        <output htmlFor={id} className="num text-xl text-ink">{format(value)}</output>
      </div>
      <div className="group relative">
        <input
          id={id} type="range" min={min} max={max} step={step} value={value}
          aria-valuetext={format(value)}
          onChange={e => onChange(Number(e.target.value))}
          style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        />
        <span aria-hidden className="label pointer-events-none absolute -top-5 -translate-x-1/2 rounded bg-forest px-1.5 py-0.5 !text-on-forest opacity-0 transition-opacity duration-150 group-active:opacity-100"
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% + ${12 - ((value - min) / (max - min)) * 24}px)` }}>{format(value)}</span>
      </div>
    </div>
  )
}

/** Counts up to a value. Jumps straight there under reduced motion. */
export function useCountUp(target: number, ms = 600) {
  const reduced = useReducedMotion()
  const [n, setN] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (reduced) { setN(target); from.current = target; return }
    const start = performance.now(), a = from.current
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1)
      setN(a + (target - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, ms, reduced])
  return n
}

export function XpBar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-sm bg-mist ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full origin-left bg-forest transition-transform duration-700" style={{ transform: `scaleX(${Math.min(Math.max(pct, 0), 100) / 100})` }} />
    </div>
  )
}

/** Line-drawn flame for the streak counter. */
export function Flame({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.5c.4 2.6 3.6 4 3.6 7.6A3.6 3.6 0 0 1 8 14.5a3.6 3.6 0 0 1-3.6-3.4c0-1.6.9-2.6 1.6-3.6.3 1 .8 1.6 1.4 1.8C7 7 6.800 4 8 1.500Z" />
    </svg>
  )
}

export function Compass({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <circle cx="17" cy="17" r="12.500" strokeDasharray="2 3" />
      <path d="M17 7l3.200 10L17 27l-3.200-10L17 7Z" /><path d="M17 7l3.200 10h-6.400L17 7Z" fill="currentColor" />
    </svg>
  )
}

export function Disclaimer({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <p className={`label ${className}`}>
      {t('common.disclaimer')}{' '}
      <a className="underline underline-offset-2 hover:text-ink" href="https://www.npstrust.org.in" target="_blank" rel="noreferrer">{t('common.official')}</a>
    </p>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="hud p-5">
      <Label>{t('err.server')}</Label>
      <p className="mt-2 text-ink">{message}</p>
      {onRetry && <button className="link mt-2" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  )
}
