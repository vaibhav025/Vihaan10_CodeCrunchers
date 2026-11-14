import { useEffect, useRef, useState } from 'react'
import { ASSIST_AFTER, starsFromScore } from '../../economy'
import { gt } from '../../strings'
import { drawFutureYou } from '../../character/draw'
import type { EngineProps } from '../../types'
import { play } from '../../../lib/sound'
import { buzz, drawFlies, follow, isLite, runLoop, type Fly } from '../kit'

// rows: 0 start, 1-2 bazaar street, 3 safe strip (checkpoint), 4 fuel station, 5 rail line, 6 goal
const COLS = 7, ROWS = 7, ROUNDS = 3, HOP = 0.15
type Kind = 'cart' | 'bike' | 'balloon'
const LANES: { row: number; kind: Kind; speed: number; xs: number[]; w: number }[] = [
  { row: 1, kind: 'cart', speed: 1.0, xs: [0.5, 4.2], w: 1.4 }, { row: 2, kind: 'bike', speed: -1.9, xs: [1.5, 5.4], w: 1.1 },
  { row: 4, kind: 'bike', speed: 1.6, xs: [0, 3.8], w: 1.1 }, { row: 5, kind: 'balloon', speed: -1.2, xs: [1, 3.6, 6.2], w: 0.85 },
]
const COIN_SPOTS = [[[1, 1], [5, 2], [2, 3], [4, 4], [6, 5]], [[3, 1], [0, 2], [5, 3], [1, 4], [3, 5]], [[6, 1], [2, 2], [3, 3], [5, 4], [0, 5]]]

/** Inflation Road: hop across a bazaar, a fuel station and a rail line three times while buying power drains. Coins top it up. */
export default function Hopper({ config, lang, shield, assist, reducedMotion: calm, onComplete }: EngineProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const move = useRef<(dx: number, dy: number) => void>(() => {})
  const end = useRef<(skip?: boolean) => void>(() => {})
  const [hud, setHud] = useState({ power: 100, coins: 0, hits: 0, round: 1, started: false, shield })

  useEffect(() => {
    const cv = canvas.current!, c = cv.getContext('2d')!, lite = isLite()
    const lanes = LANES.map(l => ({ ...l, xs: [...l.xs] }))
    const s = { col: 3, row: 0, fc: 3, fr: 0, hop: 1, land: 0, check: 0, power: 100, coins: 0, hits: 0, round: 0, t: 0, inv: 0, slow: 0, camY: 0, started: false, done: false, shield, near: false }
    let coins = COIN_SPOTS[0].map(([col, row]) => ({ col, row, got: false }))
    const flies: Fly[] = []
    let view = { w: 0, h: 0, cell: 0, ox: 0, oy: 0 }, shown = ''
    const sync = () => { const k = `${Math.round(s.power)}|${s.coins}|${s.hits}|${s.round}|${s.started}|${s.shield}`; if (k !== shown) { shown = k; setHud({ power: Math.round(s.power), coins: s.coins, hits: s.hits, round: s.round + 1, started: s.started, shield: s.shield }) } }
    const finish = (skip = false) => {
      if (s.done) return; s.done = true
      const v = Math.round(s.power)
      onComplete({ stars: skip ? 1 : starsFromScore(v), score: v, coins: s.coins + Math.round(v / 10), detail: gt('r_infl2', lang, { v, c: s.coins }), skipped: skip })
    }
    end.current = finish
    move.current = (dx, dy) => {
      if (s.done || s.hop < 1) return
      s.fc = s.col; s.fr = s.row
      s.col = Math.min(Math.max(s.col + dx, 0), COLS - 1); s.row = Math.min(Math.max(s.row + dy, 0), ROWS - 1)
      s.hop = calm ? 1 : 0; s.near = false; s.started = true; play('tick')
      if (s.row === 3) s.check = 3
    }
    const key = (e: KeyboardEvent) => { const m: Record<string, [number, number]> = { ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ' ': [0, 1] }; if (m[e.key]) { e.preventDefault(); move.current(...m[e.key]) } }
    let sx = 0, sy = 0
    const pd = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY }
    const pu = (e: PointerEvent) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return move.current(0, 1); Math.abs(dx) > Math.abs(dy) ? move.current(Math.sign(dx), 0) : move.current(0, dy < 0 ? 1 : -1) }
    addEventListener('keydown', key); cv.addEventListener('pointerdown', pd); cv.addEventListener('pointerup', pu)

    const update = (dt0: number) => {
      if (s.done) return true
      const helped = assist || s.hits >= ASSIST_AFTER
      s.slow -= dt0
      const dt = dt0 * (s.slow > 0 ? 0.35 : 1)
      s.t += dt; s.inv -= dt; s.land -= dt
      if (s.hop < 1) { s.hop = Math.min(1, s.hop + dt / HOP); if (s.hop === 1) s.land = 0.12 }
      const pace = (s.started ? 1 + s.round * 0.25 : 0.45) * (helped ? 0.6 : 1)
      lanes.forEach(l => { l.xs = l.xs.map(x => ((x + l.speed * pace * dt) % (COLS + 2) + COLS + 2) % (COLS + 2)) })
      if (s.started) s.power = Math.max(5, s.power - (helped ? 1.3 : 1.9) * dt) // idle money loses buying power
      if (s.hop === 1) {
        const cn = coins.find(q => !q.got && q.col === s.col && q.row === s.row)
        if (cn) {
          cn.got = true; s.coins++; s.power = Math.min(100, s.power + 7); play('coin'); buzz(12)
          if (!calm) flies.push({ x: view.ox + (s.col + 0.5) * view.cell, y: view.oy + (ROWS - 1 - s.row) * view.cell - s.camY + view.cell * 0.4, t: 0 })
        }
        const l = lanes.find(q => q.row === s.row)
        if (l && s.inv <= 0) {
          const reach = (l.w / 2 + 0.28) * (helped ? 0.7 : 1)
          const d = Math.min(...l.xs.map(x => Math.abs(x - 1 - s.col - 0.5 + l.w / 2)))
          if (d < reach) {
            s.inv = 1.2
            if (s.shield) { s.shield = false; play('good') }
            else { s.hits++; s.power = Math.max(5, s.power - 10); s.fc = s.col = 3; s.fr = s.row = s.check; play('bad'); buzz(40) }
          } else if (d < reach + 0.5 && !s.near && !calm) { s.near = true; s.slow = 0.35 } // near miss: a beat of slow motion
        }
        if (s.row === ROWS - 1) {
          s.round++; play('good'); buzz([15, 40, 15])
          if (s.round >= ROUNDS) finish()
          else { s.fc = s.col = 3; s.fr = s.row = 0; s.check = 0; coins = COIN_SPOTS[s.round].map(([col, row]) => ({ col, row, got: false })) }
        }
      }
      sync()
    }

    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio, lite ? 1 : 1.5)
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      const cell = Math.min(w / COLS, h / 4.4), gw = cell * COLS, gh = cell * ROWS, ox = (w - gw) / 2
      const e = 1 - Math.pow(1 - s.hop, 3), hx = s.fc + (s.col - s.fc) * e, hr = s.fr + (s.row - s.fr) * e
      const target = gh <= h ? -(h - gh) / 2 : Math.min(Math.max((ROWS - 1 - hr) * cell - h * 0.55, 0), gh - h)
      s.camY = calm ? target : follow(s.camY, target, 6, 1 / 60)
      view = { w, h, cell, ox, oy: 0 }
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      // sky and a two-layer city skyline (parallax with the camera)
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#FBEFD5'); g.addColorStop(1, '#EAF1EC'); c.fillStyle = g; c.fillRect(0, 0, w, h)
      for (const [f, col, base] of [[0.15, '#D9DECF', 0.42], [0.35, '#BFCBB4', 0.5]] as const) {
        c.fillStyle = col
        for (let i = 0; i < 16; i++) {
          const bw = 46 + (i * 37) % 40, bh = 60 + (i * 53) % 90, x = ((i * 97 - (calm ? 0 : s.t * 6 * f)) % (w + 120) + w + 120) % (w + 120) - 60
          c.fillRect(x, h * base - bh - s.camY * f * 0.3, bw, bh + h)
          if (!lite && f > 0.2) { c.fillStyle = '#F6E4BE'; for (let k = 0; k < 3; k++) c.fillRect(x + 8 + k * 12, h * base - bh + 12 - s.camY * f * 0.3, 5, 7); c.fillStyle = col }
        }
      }
      c.save(); c.translate(ox, -s.camY)
      const Y = (r: number) => (ROWS - 1 - r) * cell
      for (let r = 0; r < ROWS; r++) {
        const y = Y(r)
        c.fillStyle = ['#C6D6A0', '#E6D5B4', '#DCC9A6', '#B7C795', '#CFCBC1', '#BBAF9C', '#C6D6A0'][r]; c.fillRect(0, y, gw, cell)
        if (r === 1 || r === 2) for (let x = 0; x < gw; x += cell * 0.5) { c.fillStyle = (x / (cell * 0.5)) % 2 ? '#C4673A' : '#F3EAD6'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + cell * 0.25, y + cell * 0.12); c.lineTo(x + cell * 0.5, y); c.fill() } // stall awnings
        if (r === 4) { c.fillStyle = '#F3EAD6'; for (let x = cell * 0.2; x < gw; x += cell * 0.9) c.fillRect(x, y + cell * 0.48, cell * 0.45, 3); c.fillStyle = '#C4673A'; c.fillRect(4, y + cell * 0.2, cell * 0.22, cell * 0.6); c.fillRect(gw - 4 - cell * 0.22, y + cell * 0.2, cell * 0.22, cell * 0.6) } // fuel pumps
        if (r === 5) { c.fillStyle = '#8A6F55'; for (let x = 6; x < gw; x += cell * 0.32) c.fillRect(x, y + cell * 0.2, cell * 0.12, cell * 0.6); c.fillStyle = '#6E7A80'; c.fillRect(0, y + cell * 0.32, gw, 3); c.fillRect(0, y + cell * 0.66, gw, 3) } // rails
        if (r === 3) { c.fillStyle = '#4F8A5B'; c.fillRect(8, y + cell * 0.15, 3, cell * 0.7); c.beginPath(); c.moveTo(11, y + cell * 0.15); c.lineTo(11 + cell * 0.3, y + cell * 0.27); c.lineTo(11, y + cell * 0.39); c.fill() } // checkpoint flag
        if (r === 6) { c.fillStyle = '#4F8A5B'; c.fillRect(gw / 2 - cell * 0.9, y + cell * 0.1, 6, cell * 0.8); c.fillRect(gw / 2 + cell * 0.9 - 6, y + cell * 0.1, 6, cell * 0.8); c.fillRect(gw / 2 - cell * 0.9, y + cell * 0.1, cell * 1.8, 8) }
      }
      c.textAlign = 'center'
      for (const cn of coins) if (!cn.got) { const x = (cn.col + 0.5) * cell, y = Y(cn.row) + cell * 0.5 + (calm ? 0 : Math.sin(s.t * 4 + cn.col) * 3); c.fillStyle = '#E0B45C'; c.beginPath(); c.arc(x, y, cell * 0.15, 0, 7); c.fill(); c.fillStyle = '#7A5A1C'; c.font = `700 ${Math.round(cell * 0.18)}px Georgia`; c.fillText('₹', x, y + cell * 0.06) }
      const price = 100 + Math.round(s.t * 1.5 + s.round * 18)
      for (const l of lanes) for (const x0 of l.xs) {
        const x = (x0 - 1) * cell, y = Y(l.row), dir = Math.sign(l.speed), bw = l.w * cell
        if (x > gw + cell || x + bw < -cell) continue
        if (l.kind === 'cart') {
          c.fillStyle = '#9C6B3F'; c.beginPath(); c.roundRect(x, y + cell * 0.35, bw, cell * 0.35, 6); c.fill()
          c.fillStyle = '#3B342E'; c.beginPath(); c.arc(x + bw * 0.25, y + cell * 0.74, cell * 0.09, 0, 7); c.arc(x + bw * 0.75, y + cell * 0.74, cell * 0.09, 0, 7); c.fill()
          c.save(); c.translate(x + bw * 0.5, y + cell * 0.24); c.rotate(-0.08); c.fillStyle = '#FFFDF6'; c.fillRect(-cell * 0.36, -cell * 0.12, cell * 0.72, cell * 0.24); c.fillStyle = '#C4673A'; c.font = `700 ${Math.round(cell * 0.16)}px "IBM Plex Mono", monospace`; c.fillText(`₹${price}`, 0, cell * 0.06); c.restore()
        } else if (l.kind === 'bike') {
          c.fillStyle = '#3B342E'; c.beginPath(); c.arc(x + bw * 0.2, y + cell * 0.72, cell * 0.11, 0, 7); c.arc(x + bw * 0.8, y + cell * 0.72, cell * 0.11, 0, 7); c.fill()
          c.fillStyle = '#36506B'; c.fillRect(x + bw * 0.2, y + cell * 0.55, bw * 0.6, cell * 0.1)
          c.fillStyle = '#C4673A'; c.fillRect(dir > 0 ? x : x + bw * 0.62, y + cell * 0.3, bw * 0.38, cell * 0.28) // delivery box
          c.fillStyle = '#E8C4A0'; c.beginPath(); c.arc(x + bw * (dir > 0 ? 0.62 : 0.38), y + cell * 0.3, cell * 0.1, 0, 7); c.fill()
        } else {
          // Captain Inflation: a balloon with a grin and a cape that only rises
          const by = y + cell * 0.42 + (calm ? 0 : Math.sin(s.t * 3 + x0) * cell * 0.06), bx = x + bw / 2, r = cell * 0.3
          c.strokeStyle = '#55635A'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx, by + r); c.lineTo(bx, y + cell * 0.95); c.stroke()
          c.fillStyle = '#B23A2E'; c.beginPath(); c.moveTo(bx - r, by); c.lineTo(bx + r, by); c.lineTo(bx + r * 1.2, by + r * 1.3); c.lineTo(bx - r * 1.2, by + r * 1.3); c.fill()
          c.fillStyle = '#D9823F'; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill()
          c.fillStyle = '#243B2C'; c.beginPath(); c.arc(bx - r * 0.35, by - r * 0.1, r * 0.12, 0, 7); c.arc(bx + r * 0.35, by - r * 0.1, r * 0.12, 0, 7); c.fill()
          c.lineWidth = 2; c.strokeStyle = '#243B2C'; c.beginPath(); c.moveTo(bx - r * 0.55, by - r * 0.4); c.lineTo(bx - r * 0.15, by - r * 0.25); c.moveTo(bx + r * 0.55, by - r * 0.4); c.lineTo(bx + r * 0.15, by - r * 0.25); c.stroke()
          c.beginPath(); c.arc(bx, by + r * 0.15, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke()
          c.fillStyle = '#FFFDF6'; c.font = `700 ${Math.round(r * 0.55)}px Georgia`; c.fillText('↑', bx, by - r * 0.55)
        }
      }
      // hero: arc, squash on take-off, stretch in the air, squash on landing
      const px = (hx + 0.5) * cell, py = Y(hr) + cell * 0.88, lift = calm ? 0 : Math.sin(Math.PI * s.hop) * cell * 0.35
      const sq = calm ? 1 : s.hop < 1 ? 1 + 0.16 * Math.sin(Math.PI * s.hop) : s.land > 0 ? 0.84 : 1
      c.fillStyle = 'rgba(36,59,44,0.18)'; c.beginPath(); c.ellipse(px, py, cell * 0.22 * (1 - lift / cell), cell * 0.06, 0, 0, 7); c.fill()
      if (s.inv <= 0 || Math.floor(s.t * 12) % 2) { c.save(); c.translate(px, py - lift); c.scale(1 / Math.sqrt(sq), sq); drawFutureYou(c, 0, 0, s.hop < 1 ? s.t : 0, s.hop < 1, cell / 44, s.power < 30); c.restore() }
      if (s.shield) { c.strokeStyle = 'rgba(79,138,91,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(px, py - lift - cell * 0.45, cell * 0.5, 0, 7); c.stroke() }
      if (!s.started) { const a = calm ? 0 : Math.sin(s.t * 6) * 5; c.fillStyle = '#243B2C'; c.beginPath(); c.moveTo(px, py - cell * 1.35 - a); c.lineTo(px + 12, py - cell * 1.15 - a); c.lineTo(px - 12, py - cell * 1.15 - a); c.fill() } // tutorial cue
      c.restore()
      c.setTransform(dpr, 0, 0, dpr, 0, 0); drawFlies(c, flies, 1 / 60, 70, 24)
    }
    const stop = runLoop(update, draw, lite)
    return () => { stop(); removeEventListener('keydown', key); cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointerup', pu) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const Btn = ({ dx, dy, label, rot, pulse }: { dx: number; dy: number; label: string; rot: number; pulse?: boolean }) => (
    <button aria-label={label} onClick={() => move.current(dx, dy)} className={`relative grid h-14 w-14 place-items-center rounded-full border border-line bg-card/95 text-ink shadow-[0_4px_0_rgb(var(--line))] active:translate-y-1 active:shadow-none ${pulse ? 'pedestal-glow-host' : ''}`}>
      {pulse && <span aria-hidden className="absolute inset-0 animate-ping rounded-full border-2 border-forest" />}
      <svg width="20" height="20" viewBox="0 0 18 18" style={{ transform: `rotate(${rot}deg)` }} aria-hidden><path d="M9 3l6 8H3z" fill="currentColor" /></svg>
    </button>
  )
  return (
    <div className="relative h-full w-full touch-none select-none">
      <canvas ref={canvas} className="h-full w-full" role="img" aria-label={config.title[lang]} />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <span className="label flex items-center gap-2 rounded bg-card/90 px-2.5 py-1.5 !text-ink">{gt('hp_value', lang)}
          <span className="h-2 w-24 overflow-hidden rounded-full bg-mist"><span className={`block h-full w-full origin-left transition-transform duration-200 ${hud.power < 30 ? 'bg-rust' : 'bg-forest'}`} style={{ transform: `scaleX(${hud.power / 100})` }} /></span>
          <span className="num text-[15px]">₹{hud.power}</span></span>
        <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">₹ <span className="num text-[15px]">{hud.coins}</span></span>
        <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">{gt('hp_year', lang, { n: Math.min(hud.round, ROUNDS), t: ROUNDS })}</span>
        {hud.shield && <span className="label rounded bg-forest px-2.5 py-1.5 !text-on-forest">{gt('shieldOn', lang)}</span>}
        {(assist || hud.hits >= ASSIST_AFTER) && <span className="label rounded bg-card/90 px-2.5 py-1.5">{gt('assist', lang)}</span>}
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
        <Btn dx={-1} dy={0} label={gt('hp_l', lang)} rot={-90} /><Btn dx={0} dy={1} label={gt('hp_u', lang)} rot={0} pulse={!hud.started} /><Btn dx={1} dy={0} label={gt('hp_r', lang)} rot={90} />
      </div>
      {hud.hits >= ASSIST_AFTER && <button onClick={() => end.current(true)} className="link absolute bottom-6 right-4 rounded bg-card/95 px-3 !no-underline">{gt('skip', lang)}</button>}
    </div>
  )
}
