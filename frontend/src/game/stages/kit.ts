// Shared game-feel helpers for the canvas engines: lite mode, haptics, easing, fixed-step loop, coin particles.
export const isLite = () => { try { return localStorage.getItem('pq.lite') === '1' || (navigator.hardwareConcurrency ?? 8) <= 4 } catch { return false } }
export const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch { /* no haptics */ } }
/** Frame-rate independent ease toward a target. */
export const follow = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt))

/** Runs `update(dt)` at a fixed 60 Hz and `draw()` once per frame (every other frame in lite mode). Returns a stop function. */
export function runLoop(update: (dt: number) => boolean | void, draw: () => void, lite = false) {
  const STEP = 1 / 60
  let raf = 0, last = performance.now(), acc = 0, f = 0, done = false
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    if (document.hidden) { last = now; return } // paused while hidden
    acc += Math.min((now - last) / 1000, 0.1); last = now
    while (acc >= STEP && !done) { done = !!update(STEP); acc -= STEP }
    if (!lite || f++ % 2 === 0) draw()
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/** Coins that fly from where they were picked up to the HUD counter (screen coordinates). */
export interface Fly { x: number; y: number; t: number }
export function drawFlies(c: CanvasRenderingContext2D, flies: Fly[], dt: number, tx: number, ty: number) {
  for (let i = flies.length - 1; i >= 0; i--) {
    const p = flies[i]; p.t += dt * 2.2
    if (p.t >= 1) { flies.splice(i, 1); continue }
    const e = 1 - Math.pow(1 - p.t, 3), x = p.x + (tx - p.x) * e, y = p.y + (ty - p.y) * e - Math.sin(p.t * Math.PI) * 60
    c.globalAlpha = 1 - p.t * 0.4; c.fillStyle = '#E0B45C'; c.beginPath(); c.arc(x, y, 8 - p.t * 3, 0, 7); c.fill()
  }
  c.globalAlpha = 1
}
