import { useEffect, useRef } from 'react'

/** A paragraph whose words brighten from 25% to 100% as it crosses the middle of the viewport. */
export function ScrubText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const words = text.split(' ')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>('span'))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { spans.forEach(s => { s.style.opacity = '1' }); return }
    let raf = 0
    const paint = () => {
      raf = 0
      const r = el.getBoundingClientRect(), vh = innerHeight
      const p = Math.min(Math.max((vh * 0.82 - r.top) / (vh * 0.42 + r.height), 0), 1) * (spans.length + 2)
      spans.forEach((s, i) => { s.style.opacity = String(0.25 + 0.75 * Math.min(Math.max(p - i, 0), 1)) })
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [text])
  return <p ref={ref} className={className}>{words.map((w, i) => <span key={i} style={{ opacity: 0.25 }}>{w}{i < words.length - 1 ? ' ' : ''}</span>)}</p>
}
