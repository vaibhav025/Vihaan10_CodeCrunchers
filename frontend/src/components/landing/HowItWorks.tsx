import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import './howItWorks.css'
import { useI18n } from '../../lib/i18n'
import { useReduceMotion } from '../../lib/motionPref'

/** Look switches for this section. */
const FLAGS = { monochrome: false, accentProgress: false, cursorRing: true }

const STEPS = 5
const E = [0.22, 1, 0.36, 1] as const
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/** How it works: a sticky step number on the left while five cards scroll past an active line on the right. */
export default function HowItWorks() {
  const { t } = useI18n()
  const calm = !!useReducedMotion() || useReduceMotion()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 899px)').matches)
  const sec = useRef<HTMLElement>(null), list = useRef<HTMLOListElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const stepRef = useRef(0)

  useEffect(() => {
    const mq = matchMedia('(max-width: 899px)'), on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on)
  }, [])

  // Card positions are measured only when something resizes; the scroll handler does arithmetic on the cache.
  useEffect(() => {
    const ol = list.current; if (!ol) return
    let geo: { top: number; h: number }[] = [], olTop = 0, raf = 0
    const measure = () => {
      olTop = ol.getBoundingClientRect().top + scrollY
      geo = cards.current.map(c => { if (!c) return { top: 0, h: 1 }; const r = c.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height } })
      paint()
    }
    const paint = () => {
      raf = 0
      const line = innerHeight * (narrow ? 0.5 : 0.55)
      // the active step is the card nearest the line, so it holds before the first card and after the last
      let best = 0, gap = Infinity
      geo.forEach((g, i) => {
        const dist = Math.abs(g.top + g.h / 2 - scrollY - line), p = clamp01(1 - dist / (g.h * 1.1))
        if (dist < gap) { gap = dist; best = i }
        cards.current[i]?.style.setProperty('--p', (calm ? 0 : p).toFixed(3))
      })
      if (calm) cards.current.forEach((c, i) => c?.style.setProperty('--p', i === best ? '1' : '0'))
      cards.current.forEach((c, i) => c?.classList.toggle('on', i === best))
      ol.style.setProperty('--mpos', `${scrollY - olTop}px`)
      if (best !== stepRef.current) { setDir(best > stepRef.current ? 1 : -1); stepRef.current = best; setStep(best) }
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(paint) }
    const ro = new ResizeObserver(measure)
    ro.observe(ol); ro.observe(document.body)
    measure()
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', measure)
    return () => { ro.disconnect(); removeEventListener('scroll', ask); removeEventListener('resize', measure); cancelAnimationFrame(raf) }
  }, [calm, narrow])

  // pointer spotlight on each card, one write per frame
  const spot = useRef({ raf: 0, el: null as HTMLElement | null, x: 0, y: 0 })
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const s = spot.current, r = e.currentTarget.getBoundingClientRect()
    s.el = e.currentTarget; s.x = e.clientX - r.left; s.y = e.clientY - r.top
    if (!s.raf) s.raf = requestAnimationFrame(() => { s.raf = 0; s.el?.style.setProperty('--mx', `${s.x}px`); s.el?.style.setProperty('--my', `${s.y}px`) })
  }
  // keyboard: a focused card is brought to the active line
  const onCardFocus = (i: number) => {
    const c = cards.current[i]; if (!c) return
    const r = c.getBoundingClientRect()
    scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight * (narrow ? 0.5 : 0.55), behavior: calm ? 'auto' : 'smooth' })
  }

  const ring = FLAGS.cursorRing && !calm && !narrow
  const reveal = (d = 0, y = 12) => calm ? {} : { initial: { opacity: 0, y }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '0px 0px -10% 0px' }, transition: { duration: 0.7, ease: E, delay: d } }
  const lineIn = (d: number) => calm ? {} : { initial: { y: '100%' }, whileInView: { y: '0%' }, viewport: { once: true }, transition: { duration: 0.7, ease: E, delay: d } }
  const n = String(step + 1).padStart(2, '0')

  return (
    <section ref={sec} id="how" aria-labelledby="hiw-title" data-own-cursor={ring || undefined}
      className={`hiw scroll-mt-24 ${FLAGS.monochrome ? 'mono' : ''} ${FLAGS.accentProgress ? 'accent' : ''} ${calm ? 'calm' : ''}`}>
      <div className="hiw-wrap">
        <div className="hiw-grid">
          <div className="hiw-left">
            <m.p className="hiw-eyebrow" {...reveal()}><i aria-hidden />{t('hiw.eyebrow')}</m.p>
            <h2 id="hiw-title" className="hiw-h">
              <span className="ln"><m.span {...lineIn(0.05)}>{t('hiw.h1')}</m.span></span>
              <span className="ln"><m.span className="l2" {...lineIn(0.13)}>{t('hiw.h2')}</m.span></span>
            </h2>
            <m.div className="hiw-numrow" {...(calm ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.4, ease: E, delay: 0.25 } })}>
              <p className="sr-only" aria-live="polite">{t('hiw.stepOf', { n: step + 1, total: STEPS })}</p>
              <div className="hiw-num" aria-hidden>
                <AnimatePresence initial={false} custom={dir}>
                  <m.span key={n} custom={dir}
                    variants={{
                      enter: (d: number) => calm ? { opacity: 0 } : { y: `${100 * d}%`, opacity: 0 },
                      show: { y: '0%', opacity: 1 },
                      leave: (d: number) => calm ? { opacity: 0 } : { y: `${-100 * d}%`, opacity: 0 },
                    }}
                    initial="enter" animate="show" exit="leave" transition={{ duration: calm ? 0.15 : 0.55, ease: E }}>{n}</m.span>
                </AnimatePresence>
              </div>
              <div className="hiw-bar" aria-hidden>
                <m.i style={{ scaleX: (step + 1) / STEPS }} {...(calm ? {} : { initial: { scaleX: 0 } })} animate={{ scaleX: (step + 1) / STEPS }} transition={{ duration: 0.6, ease: E }} />
              </div>
            </m.div>
          </div>

          <ol ref={list} className="hiw-list">
            {Array.from({ length: STEPS }, (_, i) => (
              <m.li key={i} {...reveal(0, 24)}>
                <div ref={el => { cards.current[i] = el }} className="hiw-card" tabIndex={0}
                  aria-label={`${t('hiw.stepOf', { n: i + 1, total: STEPS })}: ${t(`hiw.s${i + 1}.title`)}`}
                  onPointerMove={narrow ? undefined : onCardMove} onFocus={() => onCardFocus(i)}>
                  <p className="hiw-lab">{t(`hiw.s${i + 1}.label`)}</p>
                  <h3 className="hiw-title">{t(`hiw.s${i + 1}.title`)}</h3>
                  <p className="hiw-body">{t(`hiw.s${i + 1}.body`)}</p>
                </div>
              </m.li>
            ))}
          </ol>
        </div>

        <m.div className="hiw-close" {...reveal(0, 40)}>
          <h3>{t('hiw.close')}</h3>
          <p>{t('hiw.closeSub')}</p>
        </m.div>
      </div>
      {ring && <Ring host={sec} cards={cards} step={step} />}
    </section>
  )
}

/** A ring that follows the pointer inside the section on a spring. The native pointer stays visible. */
function Ring({ host, cards, step }: { host: React.RefObject<HTMLElement | null>; cards: React.RefObject<(HTMLDivElement | null)[]>; step: number }) {
  const x = useMotionValue(-100), y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40 }), sy = useSpring(y, { stiffness: 500, damping: 40 })
  const [inside, setInside] = useState(false)
  const [overActive, setOverActive] = useState(false)
  const stepRef = useRef(step); stepRef.current = step
  useEffect(() => {
    const el = host.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    let live = false
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x.set(e.clientX); y.set(e.clientY)
      const card = (e.target as Element).closest?.('.hiw-card')
      setOverActive(!!card && card === cards.current?.[stepRef.current])
    }
    const enter = () => setInside(true), leave = () => setInside(false)
    // the listener runs only while the section is on screen
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !live) { live = true; el.addEventListener('pointermove', move) }
      else if (!en.isIntersecting && live) { live = false; el.removeEventListener('pointermove', move); setInside(false) }
    })
    io.observe(el); el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave)
    return () => { io.disconnect(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerenter', enter); el.removeEventListener('pointerleave', leave) }
  }, [host, cards, x, y])
  return (
    <m.div aria-hidden className="hiw-ring" style={{ x: sx, y: sy, opacity: inside ? 1 : 0 } as unknown as CSSProperties}
      animate={{ scale: overActive ? 1.15 : 1 }} transition={{ duration: 0.25, ease: E }}><i /></m.div>
  )
}
