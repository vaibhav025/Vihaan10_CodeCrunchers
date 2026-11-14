import { useEffect, useRef, useState } from 'react'
import { ASSIST_AFTER, starsFromHits } from '../../economy'
import { gt } from '../../strings'
import type { EngineProps } from '../../types'
import { api } from '../../../lib/api'
import { rupeesShort } from '../../../lib/format'
import { play } from '../../../lib/sound'
import { buzz, drawFlies, isLite, runLoop, type Fly } from '../kit'

interface Ent { x: number; kind: 'coin' | 'fee'; air: boolean; gone?: boolean }

/** Compounding Hill: tap to push the snowball. Coins grow it by a share of its size; fees chip it. Then a start-earlier slider. */
export default function Snowball({ config, lang, assist, reducedMotion: calm, onComplete }: EngineProps) {
  const p = config.params as { seconds: number; monthly: number; rate: number }
  const canvas = useRef<HTMLCanvasElement>(null)
  const push = useRef(() => {})
  const [hud, setHud] = useState({ value: 1, coins: 0, hits: 0, started: false })
  const [over, setOver] = useState<{ value: number; coins: number; hits: number } | null>(null)

  useEffect(() => {
    const cv = canvas.current!, c = cv.getContext('2d')!, lite = isLite()
    const L = 210 * p.seconds, ents: Ent[] = []
    for (let x = 500, i = 0; x < L - 200; x += 150, i++) ents.push(i % 4 === 3 ? { x, kind: 'fee', air: false } : { x, kind: 'coin', air: i % 3 === 1 })
    const s = { d: 0, v: 120, y: 0, vy: 0, value: 1, coins: 0, hits: 0, inv: 0, t: 0, started: false, done: false, spin: 0 }
    const flies: Fly[] = []; let k = 1, shown = ''
    const R = () => 12 + Math.sqrt(s.value) * 3.2
    push.current = () => { if (s.done) return; s.started = true; s.v = Math.min(s.v + 70, 360); if (s.y === 0) s.vy = 300; play('tick') }
    const key = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowRight') { e.preventDefault(); if (!e.repeat) push.current() } }
    const pd = () => push.current()
    addEventListener('keydown', key); cv.addEventListener('pointerdown', pd)
    const update = (dt: number) => {
      if (s.done) return true
      const helped = assist || s.hits >= ASSIST_AFTER
      s.t += dt; s.inv -= dt
      if (s.started) { s.v = Math.max(110, s.v - 50 * dt); s.d += s.v * dt * (helped ? 0.8 : 1) }
      s.spin += (s.v * dt) / R()
      if (s.y > 0 || s.vy > 0) { s.vy -= 900 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0 }
      const r = R()
      for (const e of ents) {
        if (e.gone || Math.abs(e.x - s.d) > r * (helped ? 0.6 : 0.85)) continue
        const ey = e.air ? 70 : 0
        if (Math.abs(s.y + r - (ey + 10)) > r + (helped ? 4 : 10)) continue
        if (e.kind === 'coin') { e.gone = true; s.coins++; s.value = s.value * (1 + p.rate / 100) + 1; play('coin'); buzz(10); if (!calm) flies.push({ x: 140 * k, y: (cv.clientHeight * 0.62 - s.y - r) , t: 0 }) }
        else if (s.inv <= 0) { e.gone = true; s.inv = 0.8; s.hits++; s.value *= 0.85; play('bad'); buzz(40) }
      }
      const key2 = `${Math.round(s.value)}|${s.coins}|${s.hits}|${s.started}`
      if (key2 !== shown) { shown = key2; setHud({ value: Math.round(s.value), coins: s.coins, hits: s.hits, started: s.started }) }
      if (s.d >= L) { s.done = true; setOver({ value: Math.round(s.value), coins: s.coins, hits: s.hits }); play('good') }
    }
    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio, lite ? 1 : 1.5)
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      k = Math.min(1, w / 700)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#E4EEF0'); g.addColorStop(1, '#FBF7EE'); c.fillStyle = g; c.fillRect(0, 0, w, h)
      // distant peaks drift slower than the slope
      for (const [f, col, hh] of [[0.1, '#CFDCE0', 0.42], [0.25, '#B7C9CE', 0.5]] as const) { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 40; x += 40) { const q = (x + (calm ? 0 : s.d * f)) / 120; c.lineTo(x, h * hh - Math.abs(Math.sin(q)) * 70 - Math.sin(q * 2.3) * 14) } c.lineTo(w, h); c.fill() }
      const tilt = 0.18, gy = (x: number) => h * 0.62 + (x - 140 * k) * tilt // slope line through the ball
      c.save(); c.translate(0, 0)
      c.fillStyle = '#F7FAFA'; c.beginPath(); c.moveTo(0, gy(0)); c.lineTo(w, gy(w)); c.lineTo(w, h); c.lineTo(0, h); c.fill()
      c.strokeStyle = '#C9D3D6'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, gy(0)); c.lineTo(w, gy(w)); c.stroke()
      if (!lite) { c.fillStyle = '#6F8F62'; for (let i = 0; i < 8; i++) { const x = ((i * 230 - s.d) % (w + 230) + w + 230) % (w + 230) - 40; c.beginPath(); c.moveTo(x - 12, gy(x) + 2); c.lineTo(x, gy(x) - 40); c.lineTo(x + 12, gy(x) + 2); c.fill() } }
      c.textAlign = 'center'; c.font = '600 11px "IBM Plex Mono", monospace'
      for (const e of ents) {
        if (e.gone) continue
        const x = 140 * k + (e.x - s.d), y = gy(x) - (e.air ? 70 : 0)
        if (x < -40 || x > w + 40) continue
        if (e.kind === 'coin') { c.fillStyle = '#E0B45C'; c.beginPath(); c.arc(x, y - 12, 10, 0, 7); c.fill(); c.fillStyle = '#7A5A1C'; c.fillText('₹', x, y - 8) }
        else { c.fillStyle = '#7A5C44'; c.beginPath(); c.moveTo(x - 16, y + 2); c.lineTo(x - 6, y - 22); c.lineTo(x + 4, y - 8); c.lineTo(x + 16, y + 2); c.fill(); c.fillStyle = '#B23A2E'; c.fillText(gt('sb_fee', lang), x, y - 28) }
      }
      const r = R(), bx = 140 * k, by = gy(bx) - s.y - r
      c.fillStyle = 'rgba(36,59,44,0.14)'; c.beginPath(); c.ellipse(bx, gy(bx), r * 0.9, 5, tilt, 0, 7); c.fill()
      c.save(); c.translate(bx, by); c.rotate(calm ? 0 : s.spin); if (s.inv > 0 && Math.floor(s.t * 12) % 2) c.globalAlpha = 0.5
      c.fillStyle = '#FFFFFF'; c.strokeStyle = '#C9D3D6'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke()
      c.fillStyle = '#E0B45C'; for (let i = 0; i < Math.min(s.coins, 12); i++) { const a = i * 2.4; c.beginPath(); c.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, 3, 0, 7); c.fill() }
      c.restore(); c.restore()
      if (!s.started) { const a = calm ? 0 : Math.sin(s.t * 6) * 5; c.fillStyle = '#243B2C'; c.beginPath(); c.moveTo(bx + r + 26 + a, by); c.lineTo(bx + r + 12 + a, by - 10); c.lineTo(bx + r + 12 + a, by + 10); c.fill() } // tutorial cue: push
      drawFlies(c, flies, 1 / 60, 60, 22)
    }
    const stop = runLoop(update, draw, lite)
    return () => { stop(); removeEventListener('keydown', key); cv.removeEventListener('pointerdown', pd) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full w-full touch-none select-none">
      <canvas ref={canvas} className="h-full w-full" role="img" aria-label={config.title[lang]} />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
        <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">{gt('snow', lang)} <span className="num text-[15px]">₹{hud.value}</span></span>
        <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">₹ <span className="num text-[15px]">{hud.coins}</span></span>
        {hud.hits > 0 && <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-rust">{gt('hits', lang)} {hud.hits}</span>}
      </div>
      {!over && <button onClick={() => push.current()} aria-label={gt('sb_push', lang)} className="btn game-btn absolute bottom-5 left-1/2 min-w-[150px] -translate-x-1/2">{gt('sb_push', lang)}</button>}
      {!over && hud.hits >= ASSIST_AFTER && <button onClick={() => onComplete({ stars: 1, coins: hud.coins, detail: '', skipped: true })} className="link absolute bottom-6 right-4 rounded bg-card/95 px-3 !no-underline">{gt('skip', lang)}</button>}
      {over && <Earlier p={p} lang={lang} onDone={() => onComplete({ stars: starsFromHits(over.hits), coins: over.coins, score: over.value, detail: gt('r_snow2', lang, { n: over.coins, v: over.value }) })} />}
    </div>
  )
}

/** Start-earlier slider: corpus at 60 for each starting age, from the calculator API, plus the rule of 72. */
function Earlier({ p, lang, onDone }: { p: { monthly: number; rate: number }; lang: EngineProps['lang']; onDone: () => void }) {
  const [age, setAge] = useState(25)
  const [cache, setCache] = useState<Record<number, number | 'x'>>({})
  const get = (a: number) => { if (cache[a] !== undefined) return; api.simulate({ current_age: a, retirement_age: 60, monthly_contribution: p.monthly, annual_return_pct: p.rate, risk_profile: 'moderate', annual_income: 0 }).then(r => setCache(c => ({ ...c, [a]: r.projected_corpus }))).catch(() => setCache(c => ({ ...c, [a]: 'x' }))) }
  useEffect(() => { get(22); get(age) }) // eslint-disable-line react-hooks/exhaustive-deps
  const base = cache[22], now = cache[age], ok = typeof base === 'number' && typeof now === 'number'
  return (
    <div className="absolute inset-0 grid place-items-center bg-paper/95 px-5">
      <div className="hud w-full max-w-md p-5" role="status">
        <p className="font-serif text-[1.5rem] leading-snug text-ink">{gt('sb_title', lang, { m: p.monthly.toLocaleString('en-IN') })}</p>
        <label className="label mt-4 block" htmlFor="age">{gt('sb_age', lang, { a: age })}</label>
        <input id="age" type="range" min={22} max={40} value={age} onChange={e => setAge(+e.target.value)} className="mt-2 w-full accent-[rgb(var(--forest))]" />
        <p className="num mt-3 text-[2rem] leading-none text-ink">{typeof now === 'number' ? rupeesShort(now) : now === 'x' ? '—' : '…'}</p>
        {ok && age > 22 && <p className="mt-2 text-[15px] text-rust">{gt('sb_cost', lang, { a: age, c: rupeesShort((base as number) - (now as number)) })}</p>}
        <p className="mt-3 rounded-md bg-haze px-3 py-2 text-[15px] text-ink">{gt('sb_72', lang, { r: p.rate, y: (72 / p.rate).toFixed(1) })}</p>
        <p className="label mt-2">{Object.values(cache).includes('x') ? gt('calcOff', lang) : gt('fk_src', lang, { a: 60 })}</p>
        <button autoFocus className="btn game-btn mt-4 w-full" onClick={onDone}>{gt('next', lang)}</button>
      </div>
    </div>
  )
}
