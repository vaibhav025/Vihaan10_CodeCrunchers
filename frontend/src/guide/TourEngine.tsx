import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGuide } from './GuideProvider'
import { fill } from './content'
import { findTarget, routeOf } from './targets'
import type { Content, Step } from './types'
import DadaJi from './DadaJi'
import { useI18n } from '../lib/i18n'
import { useAloud } from './readAloud'

interface Box { top: number; left: number; width: number; height: number }
const zoom = () => Number(document.documentElement.style.getPropertyValue('zoom')) || 1
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Runs one tour: goes to the right page, finds each target, lights it up, and keeps the step card on screen. */
export default function TourEngine({ c }: { c: Content }) {
  const g = useGuide(), u = c.ui, tour = g.tour!
  const nav = useNavigate()
  const { pathname } = useLocation()
  const steps = useMemo<Step[]>(() => {
    if (tour.id.startsWith('@')) {
      const id = tour.id.slice(1), k = c.controls.find(x => x.id === id)
      return [{ target: id, route: tour.route ?? routeOf(id), title: k?.label ?? id, body: k ? `${k.what} ${k.happens}` : '', pose: 'point' }]
    }
    return (c.tours[tour.id]?.steps ?? []).filter(s => !s.only || s.only === g.comfort)
  }, [tour.id, tour.route, c, g.comfort])
  const step = steps[tour.i]
  const [box, setBox] = useState<Box | null>(null)
  const [lost, setLost] = useState(false)
  const last = tour.i >= steps.length - 1 || lost || !!step?.end
  const el = useRef<HTMLElement | null>(null), card = useRef<HTMLDivElement>(null), before = useRef<Element | null>(null)
  const [size, setSize] = useState({ w: innerWidth, h: innerHeight })
  const { lang } = useI18n()
  const aloud = useAloud(lang)
  useEffect(() => { aloud.stop() }, [tour.i]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    // a `press` step presses the real button for the player, then waits a moment for the page to change
    if (step?.press && el.current) { el.current.click(); el.current = null; setBox(null); window.setTimeout(() => (last ? g.endTour(true) : g.setStep(tour.i + 1)), 450); return }
    if (last) g.endTour(true); else g.setStep(tour.i + 1)
  }, [g, last, tour.i, step])
  // remember what had focus, and give it back when the tour ends
  useEffect(() => { before.current = document.activeElement; return () => { (before.current as HTMLElement | null)?.focus?.() } }, [])
  useEffect(() => { if (!step) g.endTour(false) }, [step, g])

  // go to the step's page, then wait up to 1.5s for its target
  useEffect(() => {
    if (!step) return
    setBox(null); setLost(false); el.current = null
    if (step.route && pathname !== step.route) { nav(step.route); return }
    const want = step.target ?? step.when
    if (!want) return
    let tries = 0
    const id = setInterval(() => {
      const found = findTarget(want)
      if (found) { clearInterval(id); if (step.target) { el.current = found; found.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }) } }
      else if (++tries > 15) {
        clearInterval(id)
        // not on this page: move on quietly to the next step that can be shown, or say so once and finish
        const nxt = steps.findIndex((s, j) => j > tour.i && !s.when && (!s.target || (s.route && s.route !== pathname) || !!findTarget(s.target)))
        if (nxt >= 0) g.setStep(nxt); else setLost(true)
      }
    }, 100)
    return () => clearInterval(id)
  }, [step, pathname, nav]) // eslint-disable-line react-hooks/exhaustive-deps

  // follow the target while the tour is open (scroll, resize, layout shifts); this is the only rAF loop
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const t = el.current
      if (t) {
        const r = t.getBoundingClientRect(), z = zoom(), b = { top: r.top / z - 6, left: r.left / z - 6, width: r.width / z + 12, height: r.height / z + 12 }
        setBox(o => (o && Math.abs(o.top - b.top) < 0.5 && Math.abs(o.left - b.left) < 0.5 && Math.abs(o.width - b.width) < 0.5 && Math.abs(o.height - b.height) < 0.5 ? o : b))
      }
      const w = innerWidth / zoom(), h = innerHeight / zoom()
      setSize(o => (o.w === w && o.h === h ? o : { w, h }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // keyboard: Esc closes, Tab stays inside the card
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { g.endTour(false); return }
      if (e.key !== 'Tab' || !card.current) return
      const f = [...card.current.querySelectorAll<HTMLElement>('button')]
      if (!f.length) return
      const i = f.indexOf(document.activeElement as HTMLElement)
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [g])
  useLayoutEffect(() => { card.current?.querySelector<HTMLElement>('[data-primary]')?.focus() }, [tour.i, tour.id])

  if (!step) return null
  // where the card goes: a sheet on phones (top if the target is low), otherwise beside the target with a flip to stay on screen
  const phone = size.w < 640, CW = 360, CH = 250
  let pos: { top?: number; left?: number; bottom?: number; right?: number } = {}
  if (phone) pos = box && box.top + box.height / 2 > size.h * 0.5 ? { top: 12, left: 12, right: 12 } : { bottom: 12, left: 12, right: 12 }
  else if (!box) pos = { top: size.h / 2 - CH / 2, left: size.w / 2 - CW / 2 }
  else {
    const below = box.top + box.height + 18, above = box.top - CH - 18
    const fitsSide = box.left > CW + 26 || size.w - box.left - box.width > CW + 26
    // below, else above, else beside; if the target fills the width, sit at the far edge of the screen from it
    const top = below + CH < size.h ? below : above > 8 ? above : fitsSide ? Math.max(8, Math.min(size.h - CH - 8, box.top)) : box.top + box.height / 2 < size.h / 2 ? size.h - CH - 8 : 8
    const side = top !== below && top !== above && fitsSide
    const left = side ? (box.left > CW + 26 ? box.left - CW - 18 : box.left + box.width + 18) : Math.max(8, Math.min(size.w - CW - 8, box.left + box.width / 2 - CW / 2))
    pos = { top, left }
  }
  // the arrow and Dada Ji's arm both aim from the card at the target
  const from = phone || !box || pos.top === undefined || pos.left === undefined ? null : { x: pos.left + 46, y: pos.top + 60 }
  const to = box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null
  const aim = from && to ? (Math.atan2(-(to.x - from.x), to.y - from.y) * 180) / Math.PI : undefined
  const edge = from && to && box ? { x: Math.max(box.left, Math.min(from.x, box.left + box.width)), y: pos.top! > box.top ? box.top + box.height + 4 : box.top - 4 } : null
  const body = lost ? `${u.missing}${step.body ? ' ' + step.body : ''}` : step.body

  return (
    <div className="fixed inset-0 z-[90]" data-gd-ui>
      {box && !lost ? <span aria-hidden className="gd-ring" style={box} /> : <span aria-hidden className="absolute inset-0 bg-black/60" />}
      {from && edge && !lost && (
        <svg aria-hidden className="pointer-events-none fixed inset-0 z-[92] h-full w-full">
          <path key={`${tour.i}-${Math.round(edge.x)}-${Math.round(edge.y)}`} className="gd-arrow" pathLength={1} fill="none" stroke="#E9A23B" strokeWidth="2.5" strokeLinecap="round"
            d={`M${from.x + 150} ${pos.top! > box!.top ? pos.top! - 2 : pos.top! + CH - 40} Q${(from.x + 150 + edge.x) / 2 + 40} ${(pos.top! + edge.y) / 2} ${edge.x} ${edge.y}`} />
        </svg>
      )}
      <m.div ref={card} key={tour.i} role="dialog" aria-modal="true" aria-labelledby="gd-step-t" aria-describedby="gd-step-b"
        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="gd-panel fixed z-[93] rounded-[24px] p-4 sm:w-[360px]" style={pos}>
        <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-3">
          <div className="-mb-1 self-end"><DadaJi pose={lost ? 'surprised' : step.pose ?? 'talk'} aim={aim} size={64} talking={aloud.on} /></div>
          <div className="min-w-0">
            <p className="label" aria-live="polite">{fill(u.step, { n: tour.i + 1, total: steps.length })}</p>
            <h2 id="gd-step-t" className="mt-1 font-serif text-[1.25rem] leading-tight text-ink">{step.title}</h2>
            <p id="gd-step-b" className="mt-1.5 text-[15.5px] leading-snug text-soft">{body}</p>
          </div>
        </div>
        {steps.length > 1 && <div className="mt-3 flex gap-1.5" aria-hidden>{steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= tour.i ? 'bg-[#E9A23B]' : 'bg-ink/15'}`} />)}</div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {steps.length > 1 && <button type="button" className="link !min-h-[48px] px-1 text-soft" onClick={() => g.endTour(false)}>{u.skip}</button>}
            <button type="button" className="link !min-h-[48px] px-1 text-soft" aria-pressed={aloud.on} onClick={() => aloud.toggle(`${step.title}. ${body}`)}>{aloud.on ? u.stopRead : u.readAloud}</button>
          </div>
          <div className="flex gap-2">
            {tour.i > 0 && <button type="button" className="min-h-[48px] rounded-full border border-ink/20 px-4 text-[15px] text-ink hover:border-ink/50" onClick={() => g.setStep(tour.i - 1)}>{u.back}</button>}
            <button type="button" data-primary className="min-h-[48px] rounded-full bg-[#E9A23B] px-5 text-[15px] font-medium text-[#1B2622] active:scale-[.98]" onClick={next}>{step.press ? u.pressIt : last ? u.done : u.next}</button>
          </div>
        </div>
      </m.div>
    </div>
  )
}
