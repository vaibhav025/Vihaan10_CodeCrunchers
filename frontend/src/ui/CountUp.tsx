import { useEffect, useRef, useState } from 'react'
import { prefersLessMotion } from '../lib/motionPref'

/** Tweens a number over 600 ms (ease-out). Jumps under reduced motion. */
export function useTween(target: number, ms = 600) {
  const [n, setN] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (prefersLessMotion()) { from.current = target; setN(target); return }
    const a = from.current, start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1), e = 1 - Math.pow(1 - p, 3)
      setN(a + (target - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = a + (target - a) * 0.999 }
  }, [target, ms])
  return n
}

/** A number that always counts to its new value. Tabular numerals keep the width steady. */
export default function CountUp({ value, format = v => String(Math.round(v)), className = '' }: { value: number; format?: (v: number) => string; className?: string }) {
  const v = useTween(value)
  return <span className={`tabular-nums ${className}`}>{format(v)}</span>
}
