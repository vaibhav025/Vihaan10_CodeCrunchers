import { useEffect, useRef } from 'react'

/**
 * Desktop cursor: a dot that follows exactly and a ring that trails. The ring grows over
 * interactive elements, and inside the final call to action it becomes a glass orb that
 * magnifies the headline beneath it, kept sharp.
 */
export default function Cursor() {
  const ring = useRef<HTMLSpanElement>(null), dot = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const r = ring.current, d = dot.current
    if (!r || !d || !matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let px = 0, py = 0, rx = 0, ry = 0, raf = 0, shown = false
    let host: HTMLElement | null = null, box: DOMRect | null = null, stale = false
    const tick = () => {
      const k = host ? 0.1 : 0.18
      rx += (px - rx) * k; ry += (py - ry) * k
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      if (host) {
        if (stale || !box) { box = host.getBoundingClientRect(); stale = false }
        host.style.setProperty('--x', `${rx - box.left}px`); host.style.setProperty('--y', `${ry - box.top}px`)
      }
      raf = Math.abs(px - rx) + Math.abs(py - ry) > 0.1 ? requestAnimationFrame(tick) : 0
    }
    const setOrb = (next: HTMLElement | null) => {
      if (next === host) return
      host?.classList.remove('orb-on')
      host = next; box = null
      host?.classList.add('orb-on')
      r.classList.toggle('c-orb', !!host); d.classList.toggle('c-orb', !!host)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      px = e.clientX; py = e.clientY
      d.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`
      if (!shown) { shown = true; rx = px; ry = py; document.documentElement.classList.add('cur') }
      const own = !!(e.target as Element).closest?.('[data-own-cursor]')
      r.classList.toggle('c-on', !own); d.classList.toggle('c-on', !own)
      const el = e.target as Element
      const zone = el.closest?.('[data-orb]')
      setOrb(zone ? zone.querySelector<HTMLElement>('.orb-host') : null)
      const hov = !zone && !!el.closest?.('input, button, a, select, [data-cur]')
      r.classList.toggle('hov', hov); d.classList.toggle('hov', hov)
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const leave = () => { r.classList.remove('c-on'); d.classList.remove('c-on'); setOrb(null) }
    const scroll = () => { stale = true; if (host && !raf) raf = requestAnimationFrame(tick) }
    addEventListener('pointermove', move, { passive: true }); addEventListener('scroll', scroll, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      removeEventListener('pointermove', move); removeEventListener('scroll', scroll)
      document.documentElement.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf); document.documentElement.classList.remove('cur'); setOrb(null)
    }
  }, [])
  return (
    <>
      <span ref={ring} aria-hidden className="c-ring" /><span ref={dot} aria-hidden className="c-dot" />
    </>
  )
}
