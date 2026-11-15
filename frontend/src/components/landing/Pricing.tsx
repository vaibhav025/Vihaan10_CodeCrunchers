import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Briefcase, Check, MessageSquare, Route, ScrollText, Target, TrendingUp, UserRound } from '../ui/icons'
import { useI18n } from '../../lib/i18n'
import './pricing.css'

const PLANS = ['free', 'pro', 'emp'] as const
const ROWS = [['coach', MessageSquare], ['replay', TrendingUp], ['plan', Target], ['report', ScrollText]] as const
const ICON = { free: Route, pro: UserRound, emp: Briefcase }
const ease = [0.22, 1, 0.36, 1] as const

/** The business model: three plans as cards, after "How it works". Free, Pro (₹399 a year) and Employer (₹699 a year). */
export default function Pricing() {
  const { t } = useI18n()
  const box = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = box.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <section ref={box} id="plans" aria-labelledby="plans-h" className="pr relative isolate mx-auto mt-24 w-full max-w-[1200px] px-6 sm:mt-32 sm:px-12">
      {/* the slow light behind the cards */}
      <span aria-hidden className="pr-aura" /><span aria-hidden className="pr-aura pr-aura-2" /><span aria-hidden className="pr-grid" />
      <div className="text-center">
        <p className="eyebrow">{t('pr.eyebrow')}</p>
        <h2 id="plans-h" className="grad mx-auto mt-4 max-w-[18ch] pb-[0.06em] text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{t('pr.title')}</h2>
        <p className="mx-auto mt-4 max-w-[38rem] text-[17px] leading-[1.6] text-soft">{t('pr.sub')}</p>
      </div>
      <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((p, i) => { const Icon = ICON[p], hot = p === 'pro'; return (
          <m.li key={p} initial={{ opacity: 0, y: 28 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.12 * i, ease }}
            className={`pr-card ${hot ? 'pr-hot' : ''} ${p === 'emp' ? 'pr-team' : ''}`}>
            {hot && <span className="pr-badge">{t('pr.popular')}</span>}
            {p === 'emp' && <span className="pr-badge pr-badge-team">{t('pr.forTeams')}</span>}
            <div className="flex items-center gap-3">
              <span className="pr-ico"><Icon size={18} strokeWidth={1.6} aria-hidden /></span>
              <h3 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink">{t(`pr.${p}`)}</h3>
            </div>
            <p className="mt-2 text-[14.5px] leading-snug text-soft">{t(`pr.${p}.d`)}</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-[clamp(2.4rem,4vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-ink">{t(`pr.${p}.price`)}</span>
              <span className="text-[14px] text-soft">{t(p === 'free' ? 'pr.forever' : 'pr.year')}</span>
            </p>
            {p !== 'free' && <p className="mt-1.5 text-[13px] text-soft">{t(`pr.${p}.month`)}</p>}
            <span aria-hidden className="pr-rule" />
            {p === 'emp' && <p className="-mt-2 mb-4 text-[14px] font-medium text-ink">{t('pr.emp.plus')}</p>}
            <ul className="space-y-4">
              {ROWS.map(([r, RIcon], k) => (
                <m.li key={r} initial={{ opacity: 0, x: -8 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.25 + 0.12 * i + 0.06 * k, ease }} className="flex gap-3">
                  <span className={`pr-tick ${hot ? 'on' : ''} ${p === 'emp' ? 'team' : ''}`}><Check size={12} strokeWidth={3} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="label flex items-center gap-1.5"><RIcon size={12} strokeWidth={1.6} aria-hidden />{t(`pr.r.${r}`)}</span>
                    <span className="mt-0.5 block text-[15px] leading-snug text-ink">{t(`pr.${p}.${r}`)}</span>
                  </span>
                </m.li>
              ))}
            </ul>
            <Link to="/start" className={`mt-8 ${hot ? 'btn' : 'btn-ghost'} w-full justify-center`}>{t(`pr.${p}.cta`)}</Link>
          </m.li>
        ) })}
      </ul>
    </section>
  )
}
