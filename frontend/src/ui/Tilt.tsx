import { useRef, type ReactNode } from 'react'
import { isTouch } from './motion'
import { prefersLessMotion } from '../lib/motionPref'

/**
 * Tilts toward the cursor (transform only), with an optional moving light reflection.
 * Off on touch devices and under reduced motion.
 */
export default function Tilt({ children, max = 6, className = '', glare = false }: { children: ReactNode; max?: number; className?: string; glare?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const shine = useRef<HTMLSpanElement>(null)
  const off = typeof window !== 'undefined' && (isTouch() || prefersLessMotion())
  const move = (e: React.PointerEvent) => {
    if (off || !el.current) return
    const r = el.current.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.current.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`
    if (shine.current) { shine.current.style.opacity = '1'; shine.current.style.transform = `translate(${x * 60}%, ${y * 60}%)` }
  }
  const leave = () => {
    if (el.current) el.current.style.transform = ''
    if (shine.current) shine.current.style.opacity = '0'
  }
  return (
    <div ref={el} onPointerMove={move} onPointerLeave={leave} className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}>
      {children}
      {glare && <span ref={shine} aria-hidden className="pointer-events-none absolute -inset-1/4 opacity-0 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at center, rgb(255 255 255 / 0.22), transparent 45%)' }} />}
    </div>
  )
}
