import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import World from '../components/world/World'
import RoadStory from '../components/world/RoadStory'
import { ZONES } from '../components/world/worldFromProfile'
import Reveal from '../ui/Reveal'
import { fadeUp } from '../ui/motion'
import { ScrubText } from '../ui/Scrub'
import { ArrowUpRight, BookOpen, Coins, Route } from '../components/ui/icons'
import { idleAfterPaint } from '../lib/idle'
import { prefetchNext } from '../routes'
import { Label, Range, StateChip } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { project } from '../lib/nps'
import { stateFor, vitalityFor } from '../lib/game'
import { rupees, rupeesShort } from '../lib/format'

// The landing demo assumes a ₹40,000 monthly income, so the 10% target is ₹4,000.
const DEMO_INCOME = 40000
const TARGET = DEMO_INCOME * 0.1
const EASE = [0.22, 1, 0.36, 1] as const
const rise = (delay: number) => ({ initial: { opacity: 0, y: 40, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.8, ease: EASE, delay } })
const STEP_ICONS = [BookOpen, Coins, Route]

/** How it works: a huge numeral stays pinned on the left while the steps scroll past on the right. */
function Steps() {
  const { t } = useI18n()
  const [on, setOn] = useState(0)
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const items = Array.from(list.current?.children ?? [])
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setOn(items.indexOf(e.target)) }), { rootMargin: '-45% 0px -45% 0px' })
    items.forEach(x => io.observe(x))
    return () => io.disconnect()
  }, [])
  return (
    <div className="mt-14 grid gap-8 lg:mt-24 lg:grid-cols-[5fr_7fr] lg:gap-20">
      <div aria-hidden className="hidden lg:block">
        <div className="sticky top-[30vh]">
          <div className="h-[clamp(96px,14vw,200px)] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <m.p key={on} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }} transition={{ duration: 0.3, ease: EASE }}
                className="num grad text-[clamp(96px,14vw,200px)] font-semibold leading-none">0{on + 1}</m.p>
            </AnimatePresence>
          </div>
          <span className="mt-8 block h-px w-[120px] bg-ink/25" />
          <p className="label mt-5">0{on + 1} / 0{STEP_ICONS.length}</p>
        </div>
      </div>
      <ol ref={list} className="lg:pb-[18vh]">
        {STEP_ICONS.map((Icon, i) => (
          <li key={i} className={`flex flex-col justify-center border-t border-ink/10 py-10 transition-opacity duration-500 lg:min-h-[46vh] lg:py-0 ${on === i ? 'opacity-100' : 'lg:opacity-30'}`}>
            <div className="flex items-center gap-4">
              <span className="orb !h-12 !w-12"><Icon size={20} strokeWidth={1.5} aria-hidden /></span>
              <span className="num grad text-[44px] font-semibold leading-none lg:hidden" aria-hidden>0{i + 1}</span>
            </div>
            <h3 className="mt-7 text-[clamp(1.75rem,3.4vw,3rem)] font-medium text-ink">{t(`land.h${i + 1}t`)}</h3>
            <p className="mt-4 max-w-[30rem] text-[17px] leading-[1.6] text-soft sm:text-[18px]">{t(`land.h${i + 1}d`)}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Landing() {
  const { t } = useI18n()
  const { user } = useSession()
  const [age, setAge] = useState(25)
  const [saving, setSaving] = useState(2500)
  const p = project({ age, retireAge: 60, monthly: saving, returnPct: 10, annualIncome: DEMO_INCOME * 12 })
  const state = stateFor(saving, TARGET)
  useEffect(() => idleAfterPaint(prefetchNext, 3000), [])
  const topics = ZONES.map(z => t(`zone.${z.key}`))

  return (
    <div className="overflow-x-clip">
      {/* hero: centred type, then the living world as the product shot */}
      <section className="relative isolate mx-auto w-full max-w-[1320px] px-6 pt-10 text-center sm:px-12 sm:pt-14">
        <div aria-hidden className="hero-bg">
          <World className="hero-world" vitality={vitalityFor(saving, TARGET)} road={1} lanterns={7} level={3} label="" />
        </div>
        <m.a href="#how" {...rise(0.1)} className="badge transition-colors hover:bg-ink/5">{t('land.how')}<ArrowUpRight size={13} aria-hidden /></m.a>
        <h1 className="mx-auto mt-8 max-w-[17ch] text-[clamp(2.75rem,8vw,7.75rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-ink">
          <m.span {...rise(0.2)} className="block">{t('land.h1')}</m.span>
          <m.em {...rise(0.32)} className="grad block pb-[0.08em]">{t('land.h1em')}</m.em>
        </h1>
        <m.p {...rise(0.52)} className="mx-auto mt-8 max-w-[38rem] text-[17px] leading-[1.6] text-soft sm:text-[18px]">{t('land.sub')}</m.p>
        <m.div {...rise(0.6)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to={user ? '/home' : '/start'} className="btn">{user ? t('land.resume') : t('land.cta')}</Link>
          {!user && <Link to="/login" className="btn-ghost">{t('land.signin')}</Link>}
        </m.div>
        <p aria-hidden className="scroll-cue label absolute bottom-0 left-12 hidden !tracking-[0.3em] !text-dim xl:block">Scroll</p>
      </section>

      <m.section {...rise(0.75)} aria-label={t('land.try')} className="relative mx-auto mt-14 w-full max-w-[1000px] px-4 sm:mt-20 sm:px-8">
        <div
          onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`) }}
          className="surface-float spotlight grid gap-6 p-6 backdrop-blur-xl sm:p-8 md:grid-cols-[1fr_1fr_auto] md:items-end md:gap-10"
        >
          <div className="md:col-span-3 flex items-center justify-between gap-3">
            <Label>{t('land.try')}</Label>
            <StateChip state={state} />
          </div>
          <Range label={t('land.age')} value={age} min={18} max={45} onChange={setAge} format={String} />
          <Range label={t('land.saving')} value={saving} min={0} max={6000} step={250} onChange={setSaving} format={rupees} />
          <div className="border-t border-ink/10 pt-5 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <Label>{t('land.pension')}</Label>
            <p className="num mt-1.5 text-[44px] leading-none text-ink" aria-live="polite">{rupees(p.monthly_pension)}</p>
          </div>
        </div>
      </m.section>

      <section aria-label="Plan figures" className="mx-auto mt-20 w-full max-w-[1200px] px-6 sm:mt-28 sm:px-12">
        <Reveal stagger>
          <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {[
              [`${60 - age}`, `${t('common.years')} ${t('land.s1')}`],
              ['10%', t('land.s2')],
              ['5 min', t('land.s3')],
              [rupeesShort(p.projected_corpus), t('land.s4')],
            ].map(([n, l]) => (
              <m.div key={l} variants={fadeUp} className="flex flex-col-reverse gap-3 border-l border-ink/15 pl-5 sm:pl-7">
                <dt className="label">{l}</dt>
                <dd className="num grad text-[clamp(2.6rem,6vw,4.75rem)] font-semibold leading-none">{n}</dd>
              </m.div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* the seven stages of the road, as a slow strip */}
      <div aria-hidden className="marquee mt-20 border-y border-ink/10 py-5 sm:mt-28">
        <div>
          {[0, 1].map(k => (
            <ul key={k} className="flex shrink-0 items-center">
              {topics.map(x => <li key={x} className="flex items-center whitespace-nowrap text-[14px] font-medium uppercase tracking-[0.14em] text-soft">{x}<span className="mx-7 text-dim">•</span></li>)}
            </ul>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-[1200px] px-6 pt-24 sm:px-12 sm:pt-40">
        <span className="eyebrow">{t('road.title')}</span>
        <ScrubText text={t('road.sub')} className="mt-6 max-w-[20ch] text-[clamp(2rem,4.6vw,4.25rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-ink" />
      </section>

      <RoadStory vitality={vitalityFor(saving, TARGET)} state={state} age={age} saving={saving} onSaving={setSaving} maxSaving={6000} />

      <section id="how" className="relative mx-auto w-full max-w-[1200px] scroll-mt-28 px-6 py-24 sm:px-12 sm:py-36">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgb(var(--ink)/0.045),transparent_65%)]" />
        <Reveal>
          <span className="eyebrow">{t('land.how')}</span>
          <h2 className="mt-5 max-w-[14ch] text-[clamp(2.25rem,5vw,4.5rem)] text-ink">{t('land.howTitle')}</h2>
        </Reveal>
        <Steps />
      </section>

      <section className="relative mx-auto w-full max-w-[1200px] px-6 pb-8 pt-10 text-center sm:px-12 sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--ink)/0.06),transparent_65%)]" />
        <Reveal>
          <h2 className="grad relative mx-auto max-w-[16ch] pb-[0.08em] text-[clamp(2.5rem,6.4vw,5.5rem)] leading-[0.98]">{t('land.endT')}</h2>
          <p className="relative mx-auto mt-6 max-w-[36rem] text-[17px] leading-[1.6] text-soft sm:text-[18px]">{t('land.endD')}</p>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to={user ? '/home' : '/start'} className="btn">{user ? t('land.resume') : t('land.cta')}<ArrowUpRight size={16} aria-hidden /></Link>
            <Link to="/privacy" className="btn-ghost">{t('nav.privacy')}</Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
