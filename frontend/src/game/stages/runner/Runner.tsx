import { useEffect, useRef, useState } from 'react'
import { ASSIST_AFTER, REWARDS } from '../../economy'
import { gt } from '../../strings'
import { drawFutureYou } from '../../character/draw'
import type { EngineProps } from '../../types'
import { play } from '../../../lib/sound'
import { buzz, drawFlies, type Fly } from '../kit'

interface Ent { x: number; y: number; w: number; h: number; kind: 'coin' | 'trap' | 'block' | 'treat'; label?: string; gone?: boolean }
const H = 360, GROUND = 290, PX = 96, BASE = 200, STEP = 1 / 60

/** Auto-run side-scroller. Tap or Space to jump, hold for a higher jump. No game over: a hit costs coins and the run goes on. */
export default function Runner({ config: stage, lang, shield, assist: helped, reducedMotion, onComplete: onDone }: EngineProps) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ coins: 0, hits: 0, value: 0, shield })
  const api = useRef<{ finish: (skipped?: boolean) => void }>({ finish: () => {} })
  const mode = stage.params.mode as string
  const seconds = stage.params.seconds as number
  const labels = ((stage.params.traps as Record<string, string>)[lang] ?? '').split('|')

  useEffect(() => {
    const cv = canvas.current!, c = cv.getContext('2d')!
    const lite = (navigator.hardwareConcurrency ?? 8) <= 4, calm = reducedMotion
    const flies: Fly[] = []; let kk = 1
    const length = BASE * seconds
    // the course: coins to collect, labelled money traps to jump, question blocks to hit
    const ents: Ent[] = []
    for (let i = 0, x = 520; x < length - 200; i++, x += mode === 'tutorial' ? 380 : 320) {
      const k = i % 4, trapOk = mode !== 'tutorial' || x > length * 0.45
      if (k === 0) for (let j = 0; j < 4; j++) ents.push({ x: x + j * 34, y: 26, w: 18, h: 18, kind: 'coin' })
      else if (k === 2) ents.push(mode !== 'tutorial' && i % 8 === 6 ? { x: x - 20, y: 58, w: 96, h: 14, kind: 'treat' } : { x, y: 84, w: 30, h: 30, kind: 'block' }) // Chai Cat's treat-yourself platform
      else if (trapOk) {
        ents.push({ x, y: 0, w: 36, h: 30, kind: 'trap', label: labels[(i >> 1) % labels.length] })
        for (let j = 0; j < 3; j++) ents.push({ x: x - 22 + j * 36, y: 62 + (j === 1 ? 22 : 0), w: 18, h: 18, kind: 'coin' })
      } else for (let j = 0; j < 3; j++) ents.push({ x: x + j * 34, y: 26, w: 18, h: 18, kind: 'coin' })
    }
    const s = { jumped: false, dist: 0, y: 0, vy: 0, held: false, holdT: 0, coins: 0, lost: 0, hits: 0, value: 0, n: 0, inv: 0, slow: 0, shield, t: 0, done: false }
    const sync = () => setHud({ coins: s.coins, hits: s.hits, value: Math.round(s.value * 100), shield: s.shield })
    const finish = (skipped = false) => {
      if (s.done) return
      s.done = true
      const detail = mode === 'bills' ? gt('r_bills', lang, { c: s.coins + s.lost, b: s.lost }) : mode === 'snowball' ? gt('r_snow', lang, { n: s.n, v: Math.round(s.value * 100) }) : gt('r_plain', lang, { c: s.coins })
      onDone({ stars: skipped ? 1 : s.hits === 0 ? 3 : s.hits <= 2 ? 2 : 1, coins: s.coins, detail, skipped })
    }
    api.current.finish = finish

    const jump = (down: boolean) => { s.held = down; if (down && s.y === 0) { s.jumped = true; s.vy = 430; s.holdT = 0; play('tick') } }
    const key = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(e.type === 'keydown') } }
    const pd = () => jump(true), pu = () => jump(false)
    const el = box.current!
    el.addEventListener('pointerdown', pd); addEventListener('pointerup', pu); addEventListener('keydown', key); addEventListener('keyup', key)

    function update() {
      const assist = helped || s.hits >= ASSIST_AFTER
      const pace = (!s.jumped && mode === 'tutorial' ? 0.7 : 1) * (mode === 'creep' ? 1 + 0.6 * (s.dist / length) : 1) * (assist ? 0.8 : 1) * (s.slow > 0 ? 0.55 : 1)
      s.t += STEP; s.dist += BASE * pace * STEP; s.inv -= STEP; s.slow -= STEP
      if (s.y > 0 || s.vy > 0) {
        s.holdT += STEP
        s.vy -= 1500 * (s.held && s.vy > 0 && s.holdT < 0.24 ? 0.4 : 1) * STEP
        s.y = Math.max(0, s.y + s.vy * STEP); if (s.y === 0) s.vy = 0
      }
      const pad = assist ? 9 : 4
      for (const e of ents) {
        if (e.gone) continue
        const ex = e.x - s.dist + PX
        if (ex > PX + 40 || ex + e.w < PX - 20) continue
        const hitX = ex + pad < PX + 11 && ex + e.w - pad > PX - 11, hitY = s.y < e.y + e.h - pad && s.y + 46 > e.y + pad
        if (!hitX || !hitY) continue
        if (e.kind === 'coin') { e.gone = true; s.coins++; s.n++; play('coin'); buzz(10); if (!calm) flies.push({ x: PX * kk, y: (GROUND - e.y - 9) * kk, t: 0 }); sync() }
        else if (e.kind === 'treat') { e.gone = true; s.slow = 1.4; s.coins = Math.max(0, s.coins - 1); play('bad'); sync() }
        else if (e.kind === 'block') { e.gone = true; s.coins += REWARDS.questionBlock; play('good'); sync() }
        else if (s.inv <= 0) {
          s.inv = 1.2
          if (s.shield) s.shield = false
          else { s.hits++; const l = Math.min(3, s.coins); s.coins -= l; s.lost += l; if (mode === 'snowball') s.value *= 0.5; s.slow = 0.5; play('bad'); navigator.vibrate?.(40) }
          sync()
        }
      }
      if (s.dist >= length) finish()
    }

    function draw() {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio, 1.5)
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      const k = h / H, W = w / k; kk = k
      c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
      const g = c.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#FBEFD5'); g.addColorStop(1, '#EAF1EC')
      c.fillStyle = g; c.fillRect(0, 0, W, H)
      c.fillStyle = '#F6D9A6'; c.beginPath(); c.arc(W * 0.8, 70, 34, 0, 7); c.fill()
      const par = calm ? 0 : s.dist
      // parallax: far hills, near hills, trees
      for (const [f, amp, base, col] of [[0.12, 26, 200, '#C9D8B4'], [0.28, 34, 232, '#A9BB85']] as const) {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, GROUND)
        for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, base - Math.sin((x + par * f) / 90) * amp - Math.sin((x + par * f) / 37) * 8)
        c.lineTo(W, GROUND); c.fill()
      }
      if (!lite) for (let i = 0; i < 9; i++) {
        const x = ((i * 190 - par * 0.5) % (W + 200) + W + 200) % (W + 200) - 60
        c.fillStyle = '#7A5C44'; c.fillRect(x - 3, GROUND - 22, 6, 22)
        c.fillStyle = i % 3 ? '#6F8F62' : '#D9823F'; c.beginPath(); c.moveTo(x - 22, GROUND - 18); c.lineTo(x, GROUND - 78); c.lineTo(x + 22, GROUND - 18); c.fill()
      }
      c.fillStyle = '#C6D6A0'; c.fillRect(0, GROUND, W, 14); c.fillStyle = '#B98E66'; c.fillRect(0, GROUND + 14, W, H)
      c.fillStyle = '#E9DFC6'; for (let x = -((s.dist) % 60); x < W; x += 60) c.fillRect(x, GROUND + 4, 30, 4)
      c.font = '600 11px "IBM Plex Mono", monospace'; c.textAlign = 'center'
      for (const e of ents) {
        if (e.gone) continue
        const x = e.x - s.dist + PX, y = GROUND - e.y - e.h
        if (x > W + 40 || x < -60) continue
        if (e.kind === 'coin') { c.fillStyle = '#E0B45C'; c.beginPath(); c.arc(x + 9, y + 9, 9, 0, 7); c.fill(); c.fillStyle = '#7A5A1C'; c.fillText('₹', x + 9, y + 13) }
        else if (e.kind === 'block') { c.fillStyle = '#D9823F'; c.beginPath(); c.roundRect(x, y, e.w, e.h, 5); c.fill(); c.fillStyle = '#FFF3DC'; c.font = '700 18px Georgia'; c.fillText('?', x + 15, y + 21); c.font = '600 11px "IBM Plex Mono", monospace' }
        else if (e.kind === 'treat') { c.fillStyle = '#E79C84'; c.beginPath(); c.roundRect(x, y, e.w, e.h, 7); c.fill(); c.fillStyle = '#F3EAD6'; c.fillRect(x + 8, y + 4, e.w - 16, 3); const cx = x + e.w - 16, cy = y - 12; c.fillStyle = '#D9823F'; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.moveTo(cx - 9, cy - 4); c.lineTo(cx - 6, cy - 16); c.lineTo(cx - 1, cy - 8); c.moveTo(cx + 9, cy - 4); c.lineTo(cx + 6, cy - 16); c.lineTo(cx + 1, cy - 8); c.fill(); c.fillStyle = '#243B2C'; c.fillRect(cx - 5, cy - 2, 2, 3); c.fillRect(cx + 3, cy - 2, 2, 3); c.fillText(gt('treat', lang), x + e.w / 2 - 10, y - 28) }
        else { c.fillStyle = '#C4673A'; c.beginPath(); c.roundRect(x, y, e.w, e.h, 5); c.fill(); c.fillStyle = '#243B2C'; c.fillText(e.label ?? '', x + e.w / 2, y - 6) }
      }
      const fx = length - s.dist + PX
      if (fx < W + 40) { c.fillStyle = '#243B2C'; c.fillRect(fx, GROUND - 90, 4, 90); c.fillStyle = '#4F8A5B'; c.beginPath(); c.moveTo(fx + 4, GROUND - 90); c.lineTo(fx + 44, GROUND - 76); c.lineTo(fx + 4, GROUND - 62); c.fill() }
      if (mode === 'snowball') { const r = 8 + Math.min(s.value, 70) * 0.45; c.fillStyle = '#FFFFFF'; c.strokeStyle = '#C9D3D6'; c.lineWidth = 2; c.beginPath(); c.arc(PX + 34 + r, GROUND - r, r, 0, 7); c.fill(); c.stroke() }
      const sq = calm ? 1 : s.y > 0 ? 1 + Math.min(s.vy, 400) / 2600 : 1
      if (s.inv <= 0 || Math.floor(s.t * 12) % 2) { c.save(); c.translate(PX, GROUND - s.y); c.scale(1 / sq, sq); drawFutureYou(c, 0, 0, s.t, s.y > 0, 1.25, s.hits >= ASSIST_AFTER); c.restore() }
      if (!s.jumped) { const a = calm ? 0 : Math.sin(s.t * 6) * 5; c.fillStyle = '#243B2C'; c.beginPath(); c.moveTo(PX, GROUND - 92 - a); c.lineTo(PX + 10, GROUND - 76 - a); c.lineTo(PX - 10, GROUND - 76 - a); c.fill() } // tutorial cue: jump
      c.setTransform(dpr, 0, 0, dpr, 0, 0); drawFlies(c, flies, 1 / 60, 60, 22)
    }

    let raf = 0, last = performance.now(), acc = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) { last = now; return } // paused while the tab is hidden
      acc += Math.min((now - last) / 1000, 0.1); last = now
      while (acc >= STEP && !s.done) { update(); acc -= STEP }
      draw()
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointerdown', pd); removeEventListener('pointerup', pu); removeEventListener('keydown', key); removeEventListener('keyup', key) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className="relative h-full w-full touch-none select-none">
      <canvas ref={canvas} className="h-full w-full" aria-label={stage.title[lang]} role="img" />
      <div className="pointer-events-none absolute left-4 top-3 flex flex-wrap gap-2">
        <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">{gt('coins', lang)} <span className="num text-[15px]">{hud.coins}</span></span>
        {mode === 'snowball' && <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-ink">{gt('snow', lang)} <span className="num text-[15px]">₹{hud.value}</span></span>}
        {hud.hits > 0 && <span className="label rounded bg-card/90 px-2.5 py-1.5 !text-rust">{gt('hits', lang)} {hud.hits}</span>}
        {hud.shield && <span className="label rounded bg-forest px-2.5 py-1.5 !text-on-forest">{gt('shieldOn', lang)}</span>}
        {(helped || hud.hits >= ASSIST_AFTER) && <span className="label rounded bg-card/90 px-2.5 py-1.5">{gt('assist', lang)}</span>}
      </div>
      {hud.hits >= ASSIST_AFTER && <button onPointerDown={e => e.stopPropagation()} onClick={() => api.current.finish(true)} className="link absolute bottom-4 right-4 rounded bg-card/95 px-3 !no-underline">{gt('skip', lang)}</button>}
    </div>
  )
}
