import { useEffect, useRef, useState, type ReactNode } from 'react'
import { m } from 'framer-motion'
import { fadeUp, stagger } from './motion'

/** Fades and rises its children once, when scrolled into view. */
export function useInView<T extends Element>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: margin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen, margin])
  return [ref, seen] as const
}

export default function Reveal({ children, className, stagger: st, delay = 0, as = 'div' }: { children: ReactNode; className?: string; stagger?: boolean; delay?: number; as?: 'div' | 'section' | 'ul' }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  const C = m[as] as typeof m.div
  return (
    <C ref={ref} className={className} initial="hidden" animate={seen ? 'show' : 'hidden'}
      variants={st ? stagger(delay) : { ...fadeUp, show: { ...(fadeUp.show as object), transition: { ...(fadeUp.show as { transition: object }).transition, delay } } }}>
      {children}
    </C>
  )
}
export const RevealItem = ({ children, className }: { children: ReactNode; className?: string }) => <m.div variants={fadeUp} className={className}>{children}</m.div>
