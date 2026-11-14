import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type RefObject } from 'react'
import './landing.css'
import { useI18n } from '../../lib/i18n'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const inr = (n: number) => `₹ ${Math.round(n).toLocaleString('en-IN')}`
/** Indian system: crore with 2 decimals, lakh with 1, otherwise plain grouping. */
export const corpusText = (n: number) => n >= 1e7 ? `₹ ${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹ ${(n / 1e5).toFixed(1)} L` : inr(n)

/** Pointer glow: the card's ::before follows the pointer through --mx / --my. */
const glowAt = (e: RPointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/** True once the element is `threshold` visible. Fires once. */
function useSeen(ref: RefObject<Element | null>, threshold: number) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [ref, seen, threshold])
  return seen
}

/**
 * Writes a number into an element and tweens it: 0 to value over 1400ms the first time it is armed,
 * then 450ms from whatever is on screen to each new value. A new tween always cancels the previous frame.
 */
function useCount<T extends HTMLElement>(value: number, format: (n: number) => string, armed: boolean, delay = 0, onTween?: () => void) {
  const el = useRef<T>(null)
  const st = useRef({ shown: 0, raf: 0, timer: 0, entered: false, len: 0 })
  const fmt = useRef(format); fmt.current = format
  const cb = useRef(onTween); cb.current = onTween
  useEffect(() => {
    const node = el.current, s = st.current
    if (!node) return
    // long values ("₹ 22.79 Cr") never wrap; they scale down to their column instead. Measured only when the text length changes.
    const write = (n: number) => {
      const txt = fmt.current(n); node.textContent = txt
      if (txt.length !== s.len) { s.len = txt.length; node.style.transform = ''; const room = node.parentElement!.clientWidth - parseFloat(getComputedStyle(node.parentElement!).paddingLeft) * 2, w = node.scrollWidth; node.style.transform = w > room ? `scale(${room / w})` : '' }
    }
    if (!armed) { write(0); return }
    const run = (ms: number) => {
      cancelAnimationFrame(s.raf)
      if (reduced()) { s.shown = value; write(value); return }
      const from = s.shown, t0 = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - t0) / ms, 1)
        s.shown = from + (value - from) * easeOutCubic(t)
        write(s.shown)
        if (t < 1) s.raf = requestAnimationFrame(tick)
      }
      s.raf = requestAnimationFrame(tick)
    }
    clearTimeout(s.timer)
    if (!s.entered) { s.entered = true; s.timer = window.setTimeout(() => run(1400), reduced() ? 0 : delay) }
    else { run(450); cb.current?.() }
    return () => { cancelAnimationFrame(s.raf); clearTimeout(s.timer) }
  }, [value, armed, delay])
  return el
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <input type="range" className="rng" aria-label={label} min={min} max={max} step={step} value={value}
      style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      onInput={e => onChange(Number((e.target as HTMLInputElement).value))} onChange={e => onChange(Number(e.target.value))} />
  )
}

/** A) Try a plan: two sliders and the pension they lead to. */
export function PlanCard({ age, saving, pension, onAge, onSaving }: { age: number; saving: number; pension: number; onAge: (n: number) => void; onSaving: (n: number) => void }) {
  const { t } = useI18n()
  const card = useRef<HTMLDivElement>(null), chip = useRef<HTMLSpanElement>(null), glow = useRef(0)
  const seen = useSeen(card, 0.4)
  const num = useCount<HTMLSpanElement>(pension, inr, seen, 0, () => {
    const n = num.current; if (!n || reduced()) return
    n.classList.add('glow'); clearTimeout(glow.current); glow.current = window.setTimeout(() => n.classList.remove('glow'), 600)
  })
  const lit = pension >= 20000 ? 3 : pension >= 10000 ? 2 : 1
  const status = ['Needs a boost', 'On track', 'Thriving'][lit - 1]
  // the chip pops when its text changes: up to 1.06 and back in 260ms
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const c = chip.current; if (!c || reduced()) return
    c.classList.add('pop'); const id = window.setTimeout(() => c.classList.remove('pop'), 130)
    return () => clearTimeout(id)
  }, [status])
  return (
    <>
      <div ref={card} data-cur className="card plan reveal" onPointerMove={glowAt}>
        <div className="plan-top">
          <span className="label">{t('land.try')}</span>
          <span ref={chip} className="chip" role="status">
            <span className="bars" aria-hidden>{[1, 2, 3].map(i => <i key={i} className={i <= lit ? 'lit' : ''} />)}</span>{status}
          </span>
        </div>
        <div className="plan-body">
          <div className="plan-col">
            <div className="plan-head"><span className="label">{t('land.age')}</span><span className="plan-val">{age}</span></div>
            <Slider label={t('land.age')} value={age} min={18} max={59} step={1} onChange={onAge} />
          </div>
          <div className="plan-col">
            <div className="plan-head"><span className="label">{t('land.saving')}</span><span className="plan-val">{inr(saving)}</span></div>
            <Slider label={t('land.saving')} value={saving} min={500} max={100000} step={500} onChange={onSaving} />
          </div>
          <div className="plan-col">
            <span className="label">{t('land.pension')}</span>
            <span ref={num} aria-hidden className="plan-num g">{inr(0)}</span>
            <span className="sr-only" aria-live="polite">{inr(pension)}</span>
          </div>
        </div>
      </div>
      <p className="plan-note">Illustrative projection, not financial advice.</p>
    </>
  )
}

function Stat({ value, format, armed, delay, label, desc }: { value: number; format: (n: number) => string; armed: boolean; delay: number; label: string; desc: string }) {
  const num = useCount<HTMLElement>(value, format, armed, delay)
  return (
    <div className="stat">
      <dd ref={num} aria-hidden className="num g">{format(0)}</dd>
      <dd className="sr-only">{format(value)}</dd>
      <dt className="label">{label}</dt>
      <dd className="stat-desc">{desc}</dd>
    </div>
  )
}

/** B) Four figures on one baseline. They count up once, then stay live with the sliders. */
export function StatsCard({ age, corpus }: { age: number; corpus: number }) {
  const { t } = useI18n()
  const card = useRef<HTMLDListElement>(null)
  const seen = useSeen(card, 0.4)
  return (
    <dl ref={card} data-cur className="card stats reveal" onPointerMove={glowAt}>
      <Stat value={60 - age} format={n => String(Math.round(n))} armed={seen} delay={0} label={`${t('common.years')} ${t('land.s1')}`} desc="Years left until age 60." />
      <Stat value={10} format={n => `${Math.round(n)}%`} armed={seen} delay={120} label={t('land.s2')} desc="A steady share, every month." />
      <Stat value={5} format={n => `${Math.round(n)} min`} armed={seen} delay={240} label={t('land.s3')} desc="One quest, five minutes." />
      <Stat value={corpus} format={corpusText} armed={seen} delay={360} label={t('land.s4')} desc="What your plan could grow to." />
    </dl>
  )
}

/** Adds .v to every .reveal: page-load items after 60ms, the rest once they are 18% in view. */
export function useReveal() {
  useEffect(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.v)'))
    const id = window.setTimeout(() => all.filter(e => e.classList.contains('load')).forEach(e => e.classList.add('v')), 60)
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('v'); io.unobserve(e.target) } }), { threshold: 0.18 })
    all.filter(e => !e.classList.contains('load')).forEach(e => io.observe(e))
    return () => { clearTimeout(id); io.disconnect() }
  }, [])
}
