import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import World from '../components/world/World'
import RoadStory from '../components/world/RoadStory'
import { ZONES } from '../components/world/worldFromProfile'
import Reveal from '../ui/Reveal'
import { ScrubText } from '../ui/Scrub'
import { ArrowUpRight } from '../components/ui/icons'
import { PlanCard, StatsCard, useReveal } from '../components/landing/Plan'
import HowItWorks from '../components/landing/HowItWorks'
import Pricing from '../components/landing/Pricing'
import { idleAfterPaint } from '../lib/idle'
import { prefetchNext } from '../routes'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { project } from '../lib/nps'
import { stateFor, vitalityFor } from '../lib/game'

// The landing demo assumes a ₹40,000 monthly income, so the 10% target is ₹4,000.
const DEMO_INCOME = 40000
const TARGET = DEMO_INCOME * 0.1
export default function Landing() {
  const { t } = useI18n()
  const { user } = useSession()
  const [age, setAge] = useState(25)
  const [saving, setSaving] = useState(6000)
  const p = project({ age, retireAge: 60, monthly: saving, returnPct: 10, annualIncome: DEMO_INCOME * 12 })
  const state = stateFor(saving, TARGET)
  useEffect(() => idleAfterPaint(prefetchNext, 3000), [])
  useReveal()
  const d = (s: number) => ({ '--d': `${s}s` } as CSSProperties)
  const topics = ZONES.map(z => t(`zone.${z.key}`))

  return (
    <div className="overflow-x-clip">
      {/* hero: centred type, then the living world as the product shot */}
      <section className="relative isolate mx-auto w-full max-w-[1320px] px-6 pt-10 text-center sm:px-12 sm:pt-14"
        onPointerMove={e => { if (e.pointerType !== 'mouse') return; const st = e.currentTarget.style; st.setProperty('--hx', String(e.clientX / innerWidth - 0.5)); st.setProperty('--hy', String(e.clientY / innerHeight - 0.5)) }}>
        <div aria-hidden className="hero-bg">
          <World className="hero-world" vitality={vitalityFor(saving, TARGET)} road={1} lanterns={7} level={3} label="" />
          <div className="hero-dof" />
        </div>
        <a href="#how" style={d(0.1)} className="reveal load badge hover:bg-ink/5">{t('land.how')}<ArrowUpRight size={13} aria-hidden /></a>
        <h1 style={d(0.2)} className="reveal load mx-auto mt-8 max-w-[17ch] text-[clamp(2.75rem,8vw,7.75rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-ink">
          <span className="block">{t('land.h1')}</span>
          <em className="grad block pb-[0.08em]">{t('land.h1em')}</em>
        </h1>
        <p style={d(0.4)} className="reveal load mx-auto mt-8 max-w-[38rem] text-[17px] leading-[1.6] text-soft sm:text-[18px]">{t('land.sub')}</p>
        <div style={d(0.5)} className="reveal load mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to={user ? '/home' : '/start'} className="btn">{user ? t('land.resume') : t('land.cta')}</Link>
          {!user && <Link to="/login" className="btn-ghost">{t('land.signin')}</Link>}
        </div>
        <p aria-hidden className="scroll-cue label absolute bottom-0 left-12 hidden !tracking-[0.3em] !text-dim xl:block">Scroll</p>
      </section>

      {/* A and B: the plan and the figures it leads to */}
      <section aria-label={t('land.try')} className="lp lp-wrap relative mt-[120px]">
        <PlanCard age={age} saving={saving} pension={p.monthly_pension} onAge={setAge} onSaving={setSaving} />
        <StatsCard age={age} corpus={p.projected_corpus} />
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

      <RoadStory vitality={vitalityFor(saving, TARGET)} state={state} age={age} saving={Math.min(saving, 6000)} onSaving={setSaving} maxSaving={6000} />

      <HowItWorks />
      <Pricing />

      <section data-orb className="relative mx-auto mt-24 w-full max-w-[1200px] px-6 pb-16 pt-16 text-center sm:px-12 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--ink)/0.06),transparent_65%)]" />
        <Reveal>
          <div className="orb-host">
            <h2 className="grad relative mx-auto max-w-[16ch] pb-[0.08em] text-[clamp(2.5rem,6.4vw,5.5rem)] leading-[0.98]">{t('land.endT')}</h2>
          </div>
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
