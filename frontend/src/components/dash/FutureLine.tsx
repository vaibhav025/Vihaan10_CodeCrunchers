import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { FL_FLAGS, LIFE_EVENTS, type LifeEvent } from './futureEvents'

/**
 * The "future line": about a thousand dots drifting along a noisy line. A click adds a life event that
 * bends the line, recolours nearby dots and leaves a ring, an impulse stroke and a tag. "Sort the noise"
 * tidies the dots into the steady trend. Canvas 2D, typed arrays, no allocation in the frame loop.
 */
const EV_GAIN = 1.75, EV_MAX = 1.2
const M = 2048, MASK = M - 1, STEPS = 16, SIZES = [0.9, 1.2, 1.6, 2.1], MAX_EV = 4
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const smooth = (u: number) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x) }
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(6.2832 * Math.random())
const rgbVar = (name: string, fb: number[]) => { const p = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/[\s,]+/).map(Number); return p.length >= 3 && p.every(n => !Number.isNaN(n)) ? p : fb }

interface Ev { on: boolean; k0: number; amp: number; dir: number; t0: number; slot: number; dec: number; hdec: number; tagW: number }
interface Engine { add: (xFrac: number | null, e: LifeEvent, label: string, chip: string) => void; sort: () => boolean; stop: () => void }

function start(host: HTMLElement, canvas: HTMLCanvasElement, tags: HTMLElement[], lite: boolean, onSort: (on: boolean) => void): Engine | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const ser = new Float32Array(M), vol = new Float32Array(M)
  const atlas = document.createElement('canvas'), actx = atlas.getContext('2d')!
  let W = 0, H = 0, dpr = 1, N = 0, spacing = 1.1, C = 8, quality = 1, base = 0, A = 0
  let k = new Int32Array(0), sz = new Uint8Array(0), spark = new Uint8Array(0)
  let g = new Float32Array(0), ph = g, fr = g, heat = g, ox = g, oy = g, vx = g, vy = g
  let genK = -1, ou = 0, sm = 0, volS = 0
  let scroll = 0, t = 0, tIn = lite ? 9 : 0
  let sortMode = 0, sortT = 0, sortP = 0
  let ink = [255, 255, 255]
  const BASE = [84, 172, 191] // #54ACBF, the resting colour of the curve
  const ev: Ev[] = Array.from({ length: MAX_EV }, () => ({ on: false, k0: 0, amp: 0, dir: 1, t0: 0, slot: 0, dec: 0, hdec: 0, tagW: 0 }))

  const gen = (to: number) => {
    while (genK < to) {
      genK++
      ou += -0.02 * ou + 0.11 * gauss()
      const prev = sm
      sm += 0.18 * (ou + 0.35 * Math.sin(genK * 0.006) - sm)
      volS += 0.1 * (Math.min(Math.abs(sm - prev) * 14, 1) - volS)
      ser[genK & MASK] = clamp(sm * 0.55, -1, 1); vol[genK & MASK] = volS
    }
  }
  const buildAtlas = () => {
    ink = rgbVar('--ink', [255, 255, 255])
    const up = rgbVar('--up', [0, 230, 118]), down = rgbVar('--down', [255, 71, 87])
    C = Math.ceil(SIZES[3] * 2 * dpr) + 4
    atlas.width = C * (STEPS * 2 + 1); atlas.height = C * SIZES.length
    for (let c = 0; c <= STEPS * 2; c++) {
      const h = (c - STEPS) / STEPS, to = h >= 0 ? up : down, a = Math.abs(h)
      actx.fillStyle = `rgb(${Math.round(BASE[0] + (to[0] - BASE[0]) * a)},${Math.round(BASE[1] + (to[1] - BASE[1]) * a)},${Math.round(BASE[2] + (to[2] - BASE[2]) * a)})`
      for (let s = 0; s < SIZES.length; s++) { actx.beginPath(); actx.arc(c * C + C / 2, s * C + C / 2, SIZES[s] * dpr, 0, 6.2832); actx.fill() }
    }
  }
  const layout = () => {
    W = host.clientWidth; H = host.clientHeight
    if (!W || !H) return
    const mobile = W < 640
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    N = Math.max(400, Math.round((FL_FLAGS.dotCount || clamp(Math.round(W / 1.1), 400, mobile ? 600 : 1500)) * quality))
    spacing = W / N; base = H * 0.5; A = H * 0.24
    k = new Int32Array(N); sz = new Uint8Array(N); spark = new Uint8Array(N)
    g = new Float32Array(N); ph = new Float32Array(N); fr = new Float32Array(N); heat = new Float32Array(N)
    ox = new Float32Array(N); oy = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N)
    scroll = 0; genK = -1; ou = 0; sm = 0
    for (let i = 0; i < 400; i++) { ou += -0.02 * ou + 0.11 * gauss(); sm += 0.18 * (ou - sm) } // warm up
    for (let i = 0; i < N; i++) {
      k[i] = i; g[i] = clamp(gauss(), -2.4, 2.4); ph[i] = Math.random() * 6.2832; fr[i] = (0.2 + Math.random() * 0.4) * 6.2832
      sz[i] = clamp(Math.floor(Math.exp(gauss() * 0.55) * 1.3), 0, 3); spark[i] = Math.random() < 0.06 ? 1 : 0
    }
    for (const e of ev) e.on = false
    for (const el of tags) el.style.opacity = '0'
    gen(N + 2); buildAtlas()
  }
  const valueAt = (ki: number) => {
    let own = -1
    for (let j = 0; j < MAX_EV; j++) { const e = ev[j]; if (e.on && e.k0 <= ki && (own < 0 || e.k0 > ev[own].k0)) own = j }
    if (own < 0) return ser[ki & MASK]
    const d = ki - ev[own].k0
    return ser[ki & MASK] + ev[own].amp * (d >= 14 ? 1 : smooth(d / 14)) * ev[own].dec
  }

  const frame = (dt: number) => {
    if (!W) return
    t += dt; tIn += dt
    if (!lite) scroll += FL_FLAGS.driftSpeed * dt
    gen(Math.floor((scroll + W) / spacing) + 2)
    // sort the noise: in 1.2s, hold 2.5s, out 1.5s
    if (sortMode) {
      sortT += dt
      if (sortMode === 1) { sortP = lite ? 1 : Math.min(sortT / 1.2, 1); if (sortP >= 1) { sortMode = 2; sortT = 0 } }
      else if (sortMode === 2) { if (sortT > 2.5 && !lite) { sortMode = 3; sortT = 0; onSort(false) } }
      else { sortP = 1 - Math.min(sortT / 1.5, 1); if (sortP <= 0) { sortMode = 0; sortP = 0 } }
    }
    for (let j = 0; j < MAX_EV; j++) {
      const e = ev[j]; if (!e.on) continue
      const age = t - e.t0
      if (age > 20) { e.on = false; continue }
      if (lite) { e.dec = 1; e.hdec = 1; continue }
      e.dec = smooth(age / 0.7) * Math.pow(0.5, age / 7) * (1 - smooth((age - 16) / 4)); e.hdec = smooth(age / 0.5) * Math.min(1, 1.25 * Math.exp(-age / 9))
    }
    const hk = 1 - Math.exp(-dt / 0.12), damp = Math.exp(-dt / 0.3), back = Math.exp(-dt / 0.5)
    const fade = W * 0.06
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < N; i++) {
      let x = k[i] * spacing - scroll
      if (x < -2) { k[i] += N; x += W; heat[i] = 0; ox[i] = oy[i] = vx[i] = vy[i] = 0 }
      const ki = k[i]
      let v = ser[ki & MASK], ht = 0, own = -1
      for (let j = 0; j < MAX_EV; j++) { const e = ev[j]; if (e.on && e.k0 <= ki + 6 && (own < 0 || e.k0 > ev[own].k0)) own = j }
      if (own >= 0) {
        const e = ev[own], d = ki - e.k0
        if (d >= 0) v += e.amp * (d >= 14 ? 1 : smooth(d / 14)) * e.dec
        ht = e.dir * e.hdec * (d < 0 ? 1 + d / 6 : 1 / (1 + (d * d) / 40000))
      }
      const u = x / W, s = sortP > 0 ? smooth(sortP * 1.4 - u * 0.4) : 0
      let y = base - v * A
      if (s > 0) y += (base + A * 0.75 - u * u * (0.6 + 0.4 * u) * A * 1.5 - y) * s
      const inF = tIn >= 1.6 ? 1 : smooth((tIn / 1.2) * 1.5 - u * 0.5), calm = 1 - 0.85 * s
      const py = y + (g[i] * (4 + 10 * vol[ki & MASK]) * inF + (lite ? 0 : 2 * Math.sin(ph[i] + t * fr[i]))) * calm
      heat[i] += (clamp(ht + s * 0.85, -1, 1) - heat[i]) * (lite ? 1 : hk)
      vx[i] *= damp; vy[i] *= damp; ox[i] = (ox[i] + vx[i] * dt) * back; oy[i] = (oy[i] + vy[i] * dt) * back
      const edge = x < fade ? x / fade : x > W - fade ? (W - x) / fade : 1
      const al = clamp(edge, 0, 1) * inF * (spark[i] ? 0.85 + 0.15 * Math.sin(ph[i] * 3 + t * 1.3) : 0.78 + 0.22 * Math.abs(heat[i]))
      if (al <= 0.01) continue
      ctx.globalAlpha = al
      ctx.drawImage(atlas, (STEPS + Math.round(heat[i] * STEPS)) * C, (Math.abs(heat[i]) > 0.45 && sz[i] < 3 ? sz[i] + 1 : sz[i]) * C, C, C, (x + ox[i]) * dpr - C / 2, clamp(py + oy[i], 3, H - 3) * dpr - C / 2, C, C)
    }
    // rings, impulse strokes and tags ride along with their sample
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`; ctx.lineCap = 'round'
    for (let j = 0; j < MAX_EV; j++) {
      const e = ev[j], el = tags[j]
      if (!e.on) continue
      const age = lite ? 1 : t - e.t0, x = e.k0 * spacing - scroll, y = clamp(base - valueAt(e.k0) * A, 6, H - 6)
      const ra = age < 1.9 || lite ? 1 : 1 - (age - 1.9) / 0.3
      if (ra > 0 && x > -20) {
        ctx.globalAlpha = ra; ctx.lineWidth = 1.5; ctx.beginPath()
        ctx.arc(x, y, 6 + 12 * (age >= 0.26 ? 1 : 1 - Math.pow(2, (-10 * age) / 0.26)), 0, 6.2832); ctx.stroke()
      }
      const la = lite ? 0.7 : age < 0.5 ? 1 : 1 - (age - 0.5) / 0.9
      if (la > 0 && x > -40) {
        // part of a quadratic, split at p so the stroke grows without a dash array
        const p = lite ? 1 : Math.min(age / 0.5, 1), len = H * 0.4 * -e.dir, cx = x + 4, cy = y + len * 0.6, x2 = x + 30, y2 = y + len
        const ax = x + (cx - x) * p, ay = y + (cy - y) * p, bx = cx + (x2 - cx) * p, by = cy + (y2 - cy) * p
        ctx.globalAlpha = la * 0.9; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(ax, ay, ax + (bx - ax) * p, ay + (by - ay) * p); ctx.stroke()
      }
      const ta = age > 5 ? 0 : lite ? 1 : Math.min(age / 0.18, 1) * Math.min((5 - age) / 0.3, 1)
      if (ta <= 0 || x < -e.tagW) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue }
      const tyy = clamp(e.dir > 0 ? y - 44 - e.slot * 30 : y + 20 + e.slot * 30, 4, H - 30)
      el.style.opacity = String(ta)
      el.style.transform = `translate3d(${clamp(x + 14, 4, Math.max(W - e.tagW - 4, 4)).toFixed(1)}px,${tyy.toFixed(1)}px,0) scale(${(0.92 + 0.08 * Math.min(age / 0.18, 1)).toFixed(3)})`
    }
    ctx.globalAlpha = 1
  }

  // one loop; paused off-screen and in hidden tabs; quality drops if frames run slow
  let raf = 0, last = 0, seen = true, slow = 0
  const tick = (now: number) => {
    raf = 0
    const ms = Math.min(now - last, 50); last = now
    slow = ms > 20 ? slow + ms : 0
    if (slow > 2000 && N > 400) { slow = 0; quality *= 0.75; layout() }
    frame(ms / 1000)
    run()
  }
  const run = () => { if (!raf && !lite && seen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick) } }
  const still = () => { if (lite) frame(0) }
  layout(); frame(0)
  const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run() })
  io.observe(host)
  let rt = 0, w0 = host.clientWidth
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => { if (host.clientWidth !== w0) { w0 = host.clientWidth; layout(); frame(0) } }, 160) })
  ro.observe(host)
  const mo = new MutationObserver(() => { buildAtlas(); still() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const vis = () => run()
  document.addEventListener('visibilitychange', vis)
  run()

  return {
    add(xFrac, le, label, chip) {
      if (!W) return
      const x = (xFrac ?? 0.55 + Math.random() * 0.2) * W
      let j = 0
      for (let i = 0; i < MAX_EV; i++) { if (!ev[i].on || t - ev[i].t0 > 5) { j = i; break } if (ev[i].t0 < ev[j].t0) j = i }
      let slot = 0
      for (let i = 0; i < MAX_EV; i++) if (i !== j && ev[i].on && t - ev[i].t0 < 5) slot++
      const e = ev[j], el = tags[j], dir = le.type === 'up' ? 1 : -1
      el.dataset.dir = le.type; el.children[0].textContent = chip; el.children[1].textContent = label
      e.on = true; e.k0 = Math.round((x + scroll) / spacing); e.amp = clamp(le.impact * EV_GAIN, 0.95, EV_MAX) * dir; e.dir = dir; e.t0 = t; e.slot = slot % 3; e.dec = lite ? 1 : 0; e.hdec = lite ? 1 : 0; e.tagW = el.offsetWidth
      if (!lite) for (let i = 0; i < N; i++) { const d = Math.abs(k[i] * spacing - scroll - x); if (d < 120) { const f = 1 - d / 120; vx[i] = gauss() * 70 * f; vy[i] = (gauss() * 90 - dir * 60) * f } }
      if (lite) { frame(0); window.setTimeout(() => { if (e.t0 === t) { e.on = false; el.style.opacity = '0'; frame(0) } }, 5000) }
    },
    sort() {
      const on = sortMode === 0 || sortMode === 3
      if (on) { sortT = sortMode === 3 ? sortP * 1.2 : 0; sortMode = 1 } else { sortT = (1 - sortP) * 1.5; sortMode = 3 }
      if (lite) { sortMode = on ? 2 : 0; sortP = on ? 1 : 0; frame(0) }
      onSort(on); run()
      return on
    },
    stop() {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); clearTimeout(rt)
      document.removeEventListener('visibilitychange', vis)
    },
  }
}

export default function FutureLine() {
  const { t } = useI18n()
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), tagBox = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null), last = useRef(-1), timer = useRef(0)
  const [hint, setHint] = useState<{ k: 'init' | 'event' | 'nudge' | 'sorted'; id?: string }>({ k: 'init' })
  const [sorted, setSorted] = useState(false)
  const clicked = useRef(false)

  useLayoutEffect(() => {
    if (!host.current || !canvas.current || !tagBox.current) return
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const lite = matchMedia('(prefers-reduced-motion: reduce)').matches || !!conn?.saveData
    engine.current = start(host.current, canvas.current, [...tagBox.current.children] as HTMLElement[], lite, setSorted)
    return () => { engine.current?.stop(); engine.current = null }
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const add = (xFrac: number | null) => {
    let n = Math.floor(Math.random() * LIFE_EVENTS.length)
    if (n === last.current) n = (n + 1 + Math.floor(Math.random() * (LIFE_EVENTS.length - 1))) % LIFE_EVENTS.length
    last.current = n
    const e = LIFE_EVENTS[n]
    engine.current?.add(xFrac, e, t(`fl.e.${e.id}`), `${e.type === 'up' ? '▲' : '▼'} ${t('fl.chip')}`)
    setHint({ k: 'event', id: e.id })
    clearTimeout(timer.current)
    if (!clicked.current) { clicked.current = true; timer.current = window.setTimeout(() => setHint({ k: 'nudge' }), 4500) }
  }
  const sort = () => { const on = engine.current?.sort(); if (on) { clearTimeout(timer.current); setHint({ k: 'sorted' }) } }

  return (
    <div className="relative z-10 mt-7 border-t border-ink/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="label">{t('fl.title')}</h2>
        <p className="label !normal-case !tracking-normal">{t('fl.note')}</p>
      </div>
      <div ref={host} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); add((e.clientX - r.left) / r.width) }}
        className="fl-stage relative mt-3 h-[260px] cursor-crosshair overflow-hidden rounded-2xl sm:h-[360px]">
        <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
        <div ref={tagBox} aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: MAX_EV }, (_, i) => <div key={i} className="fl-tag"><span /><span /></div>)}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="flex min-h-[3em] max-w-2xl items-start gap-2.5 text-[14px] leading-snug text-soft sm:min-h-[2.8em]">
          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
          <span>{hint.k === 'event' && hint.id ? <><span className="font-medium text-ink">{t(`fl.e.${hint.id}`)}.</span> {t(`fl.e.${hint.id}.l`)}</> : t(`fl.hint.${hint.k}`)}</span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-quiet" onClick={() => add(null)}>{t('fl.add')}</button>
          <button type="button" className="btn-quiet" aria-pressed={sorted} onClick={sort}>{t(sorted ? 'fl.unsort' : 'fl.sort')}</button>
        </div>
      </div>
    </div>
  )
}
