import { useEffect, useRef } from 'react'

/** Desktop only: a ring with a centre dot that trails the pointer and grows over interactive elements. */
export default function Cursor() {
  const ring = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ring.current
    if (!el || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, s = 1, ts = 1, raf = 0, on = false
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18; s += (ts - s) * 0.18
      el.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0) scale(${s})`
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) > 0.05 ? requestAnimationFrame(tick) : 0
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      tx = e.clientX; ty = e.clientY
      ts = (e.target as Element).closest?.('a, button, [role="button"], input, select, .pressable') ? 1.78 : 1
      if (!on) { on = true; x = tx; y = ty; el.style.opacity = '1' }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const leave = () => { on = false; el.style.opacity = '0' }
    addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave)
    return () => { removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf) }
  }, [])
  return <span ref={ring} aria-hidden className="cursor-ring"><i /></span>
}
