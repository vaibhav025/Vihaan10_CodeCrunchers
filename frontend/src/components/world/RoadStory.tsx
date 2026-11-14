import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import LifeWorld from './LifeWorld'
import { ZONES, TOTAL_SEGMENTS } from './worldFromProfile'
import { Check, ChevronRight, Lock } from '../ui/icons'
import { Label, Range, StateChip } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { LEVEL_THRESHOLDS } from '../../lib/game'
import { rupees } from '../../lib/format'
import { spring } from '../../ui/motion'
import type { FutureState } from '../../design-tokens'

/**
 * Landing fly-through. Scrolling, the zone rail, or the arrows travel the camera along the Life
 * Road; the saving slider decides how many zones are built, and newly reached ones build in view.
 */
export default function RoadStory({ vitality, state, age, saving, onSaving, maxSaving }: {
  vitality: number; state: FutureState; age: number; saving: number; onSaving: (n: number) => void; maxSaving: number
}) {
  const { t } = useI18n()
  const box = useRef<HTMLElement>(null)
  const [s, setS] = useState(0)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '400px' })
    if (box.current) io.observe(box.current)
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!box.current) return
        const r = box.current.getBoundingClientRect(), span = r.height - innerHeight
        setS(Math.min(Math.max(-r.top / span, 0), 1) * TOTAL_SEGMENTS)
      })
    }
    addEventListener('scroll', on, { passive: true }); on()
    return () => { io.disconnect(); removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])

  const level = Math.max(1, Math.min(7, 1 + Math.round(vitality * 6)))
  const profile = { xp: LEVEL_THRESHOLDS[level - 1], questsCompleted: (level - 1) * 5, streakDays: level * 3, contributionCount: level, futureYouState: state, badgesUnlocked: level * 2 }
  const k = Math.min(Math.round(s / 5), 6)
  const z = ZONES[k], built = k < level
  const nowAge = Math.round(age + (s / TOTAL_SEGMENTS) * (60 - age))
  const go = (zone: number) => {
    if (!box.current) return
    const span = box.current.offsetHeight - innerHeight
    scrollTo({ top: box.current.offsetTop + (zone / 6) * span, behavior: 'smooth' })
  }

  return (
    <section ref={box} aria-labelledby="road-title" className="relative mt-16" style={{ height: `${ZONES.length * 75 + 40}vh` }}>
      <div className="sticky top-0 h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,rgb(var(--haze)),rgb(var(--paper)))]">
        {near && <LifeWorld profile={profile} userId="landing" mode="landing" scrollS={s} backdrop className="h-full w-full" label={t('road.title')} />}
        {/* soft edges so the HUD reads over the world */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-paper to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-paper to-transparent" />

        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-[1320px] flex-col justify-between px-5 pb-6 pt-24 sm:px-8 sm:pb-8 sm:pt-28">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-md">
              <Label>{t('road.zone', { n: k + 1 })}</Label>
              <h2 id="road-title" className="mt-1 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] text-ink">{t('road.title')}</h2>
            </div>
            <div className="flex shrink-0 flex-col-reverse items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
              <p className="hud px-4 py-2 text-center"><span className="label block">{t('ob.age')}</span><span className="num text-[2rem] leading-none text-ink">{nowAge}</span></p>
              <a href="#how" className="btn-ghost pointer-events-auto !min-h-[44px] shrink-0 !px-4 text-[14px] backdrop-blur">{t('road.skip')}</a>
            </div>
          </div>

          {/* zone rail: where you are on the road; tap a stop to travel there */}
          <nav aria-label={t('road.title')} className="pointer-events-auto absolute right-5 top-1/2 hidden -translate-y-1/2 sm:right-8 md:block">
            <ol className="relative flex flex-col gap-3">
              <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-[2px] bg-line" />
              <span aria-hidden className="absolute left-[19px] top-5 w-[2px] origin-top bg-forest" style={{ height: 'calc(100% - 40px)', transform: `scaleY(${Math.min(s / TOTAL_SEGMENTS, 1)})` }} />
              {ZONES.map((zn, i) => (
                <li key={zn.key}>
                  <button onClick={() => go(i)} aria-current={i === k} aria-label={`${t(`zone.${zn.key}`)}, ${i < level ? t('pro.unlocked') : t('q.locked')}`}
                    className="group relative flex items-center gap-3">
                    <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110 ${i === k ? 'scale-110 border-forest bg-forest text-on-forest shadow-[0_0_30px_rgb(var(--ink)/0.4)]' : i < level ? 'border-forest bg-card text-forest' : 'border-line bg-paper text-soft'}`}>
                      {i < level ? (i === k ? <span className="num text-[17px]">{i + 1}</span> : <Check size={16} aria-hidden />) : <Lock size={13} aria-hidden />}
                    </span>
                    <span className={`label absolute right-12 whitespace-nowrap rounded bg-card px-2 py-1 !text-ink shadow-paper transition-opacity duration-150 ${i === k ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>{t(`zone.${zn.key}`)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* the zone in view */}
            <div className="pointer-events-auto relative w-full max-w-md sm:min-h-[178px]">
              <AnimatePresence mode="wait">
                <m.article key={z.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="hud p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{t('road.level', { n: z.level, title: z.title, xp: z.xp.toLocaleString('en-IN') })}</Label>
                    <span className={`label inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 ${built ? 'bg-forest !text-on-forest' : 'bg-mist'}`}>{built ? <Check size={12} aria-hidden /> : <Lock size={11} aria-hidden />}{built ? t('pro.unlocked') : t('q.locked')}</span>
                  </div>
                  <h3 className="mt-2 text-[1.6rem] leading-tight text-ink sm:text-[2rem]">{t(`zone.${z.key}`)}</h3>
                  <p className="mt-1 hidden leading-relaxed text-soft sm:block">{t(`zd.${z.key}`)}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => go(Math.max(k - 1, 0))} disabled={k === 0} aria-label={t('common.back')} className="pressable grid h-11 w-11 place-items-center rounded-md border border-line bg-paper text-ink hover:border-forest disabled:opacity-40"><ChevronRight size={18} className="rotate-180" aria-hidden /></button>
                    <button onClick={() => go(Math.min(k + 1, 6))} disabled={k === 6} aria-label={t('common.continue')} className="pressable grid h-11 w-11 place-items-center rounded-md border border-line bg-paper text-ink hover:border-forest disabled:opacity-40"><ChevronRight size={18} aria-hidden /></button>
                  </div>
                </m.article>
              </AnimatePresence>
            </div>

            {/* change the plan here and watch the road build or fade */}
            <div className="hud pointer-events-auto w-full max-w-sm p-5">
              <div className="flex items-center justify-between gap-3"><Label>{t('road.your')}</Label><StateChip state={state} /></div>
              <div className="mt-1"><Range label={t('land.saving')} value={saving} min={0} max={maxSaving} step={250} onChange={onSaving} format={rupees} /></div>
              <div className="flex gap-1.5" role="img" aria-label={`${level} / 7`}>
                {ZONES.map((zn, i) => <span key={zn.key} className="relative h-2 flex-1 overflow-hidden rounded-full bg-mist"><span className={`absolute inset-0 bg-forest transition-opacity duration-300 ${i < level ? 'opacity-100' : 'opacity-0'}`} /></span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
