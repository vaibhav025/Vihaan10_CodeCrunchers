import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { Check, ChevronRight } from '../components/ui/icons'
import LifeWorld from '../components/world/LifeWorld'
import { ZONES } from '../components/world/worldFromProfile'
import { Label, StateChip, XpBar } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { today, useSession } from '../lib/session'
import { useLifeProfile } from '../lib/useWorld'
import { api } from '../lib/api'
import { BADGES, nextStep, recommended, TOTAL_QUESTS } from '../lib/game'
import { rupees, pad2 } from '../lib/format'
import { motion as M } from '../design-tokens'


export default function Home() {
  const { t } = useI18n()
  const { user, progress } = useSession()
  const profile = useLifeProfile()
  const [ghost, setGhost] = useState<number | null>(null)
  const [saved, setSaved] = useState<{ total: number; count: number; today: boolean } | null>(null)
  const [earned, setEarned] = useState<string[]>([])

  // the profile is already loaded by the session layer; Quest and Profile refresh it after changes
  useEffect(() => {
    api.history().then(h => setSaved({
      total: h.total, count: h.count,
      today: h.contributions.some(c => !!c.contributed_at && (c.contributed_at.slice(0, 10) === today() || new Date(c.contributed_at).toLocaleDateString('en-CA') === today())),
    })).catch(() => {})
    api.badges().then(b => setEarned(b.badges.map(x => x.name))).catch(() => {})
  }, [])

  if (!user) return null
  const state = user.avatar_state
  const target = recommended(user.income_range)
  const monthly = saved && saved.count ? saved.total / saved.count : 0
  const step = nextStep(monthly, target)
  const done = progress.journal.length

  // the nearest insignia the player has not earned yet
  const have: Record<string, number> = { quests: progress.journal.filter(j => j.correct).length, streak: progress.streak, contributions: saved?.count ?? 0, total: saved?.total ?? 0 }
  const next = BADGES.find(b => b.trigger in have && !earned.includes(b.name) && have[b.trigger] < b.value)

  const missions = [
    { key: 'm.quest', to: '/quest', done: progress.questDay === today() },
    { key: 'm.sim', to: '/tracker', done: progress.simDay === today() },
    { key: 'm.save', to: '/profile', done: !!saved?.today },
  ]
  const cleared = missions.filter(m => m.done).length

  const card = (i: number, from: 'left' | 'right' | 'up' = 'up') => ({
    initial: { opacity: 0, x: from === 'left' ? -24 : from === 'right' ? 24 : 0, y: from === 'up' ? 24 : 0 },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { delay: 0.5 + i * M.stagger * 2, duration: 0.45, ease: M.ui.ease },
  })

  const status = (
    <header>
      <Label>{t('home.welcome')} · {user.name}</Label>
      <h1 className="mt-2 text-[clamp(1.7rem,3.4vw,2.7rem)] leading-[1.08] text-ink">{t(`line.${state}`)}</h1>
      <p className="mt-2 text-[16px] text-soft sm:text-[17px]">
        {step ? t('line.add', { amount: rupees(step.add), state: t(`state.${step.state}`) }) : t('line.hold')}
      </p>
      <StateChip state={state} className="mt-3" />
    </header>
  )

  return (
    <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:min-h-[calc(100dvh-230px)]">
      <div className="lg:hidden">{status}</div>
      {/* the world is the stage; everything else floats over it */}
      <div className="lg:absolute lg:inset-0 lg:px-8">
        {profile && (
          <LifeWorld profile={profile} userId={user.id} onGhostTap={setGhost}
            className="h-[52vh] min-h-[320px] w-full lg:h-full lg:min-h-[560px]"
            label={`${t(`line.${state}`)} ${t('q.road')}: ${done} / ${TOTAL_QUESTS}. ${t('home.streak')}: ${progress.streak}.`} />
        )}
      </div>

      <div className="pointer-events-none relative z-10 grid gap-4 lg:min-h-[calc(100dvh-230px)] lg:grid-cols-[minmax(0,380px)_1fr_minmax(0,320px)] lg:grid-rows-[auto_1fr_auto]">
        <m.div {...card(0, 'left')} className="pointer-events-auto hidden lg:col-start-1 lg:block">{status}</m.div>

        <m.section {...card(1, 'right')} aria-labelledby="missions" className="hud pointer-events-auto p-5 lg:col-start-3 lg:row-start-1">
          <div className="flex items-baseline justify-between">
            <h2 id="missions" className="label !font-mono">{t('home.missions')}</h2>
            <span className="num text-xl text-ink">{cleared}<span className="label"> / 3</span></span>
          </div>
          <ul className="mt-3 space-y-1.5">
            {missions.map(m => (
              <li key={m.key}>
                <Link to={m.to} className="row !min-h-[48px] !px-3">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border ${m.done ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>
                    {m.done && <Check size={13} strokeWidth={2.5} aria-hidden />}
                  </span>
                  <span className={`flex-1 text-[15px] ${m.done ? 'text-soft line-through' : 'text-ink'}`}>{t(m.key)}</span>
                  <span className="sr-only">{m.done ? t('pro.unlocked') : ''}</span>
                  <ChevronRight size={16} className="text-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </m.section>

        <p className="label min-h-[2.8em] self-end lg:col-start-2 lg:row-start-3 lg:min-h-0 lg:justify-self-center lg:text-center lg:rounded lg:border lg:border-line lg:bg-card/90 lg:px-3 lg:py-2" aria-live="polite">
          {ghost !== null ? <span className="text-ink">{t(`zone.${ZONES[ghost].key}`)} · {t('w.req', { title: ZONES[ghost].title, need: ZONES[ghost].xp, have: user.total_xp })}</span> : t('w.hint')}
        </p>

        <m.section {...card(2)} className="hud pointer-events-auto order-first flex flex-col justify-between gap-4 p-6 lg:order-none lg:col-start-1 lg:row-start-3">
          <div>
            <Label>{t('home.quest')} · {pad2(Math.min(done + 1, TOTAL_QUESTS))} / {TOTAL_QUESTS}</Label>
            <p className="mt-2 font-serif text-[1.5rem] leading-tight text-ink">{done >= TOTAL_QUESTS ? t('q.doneTitle') : t('survey.road')}</p>
          </div>
          <Link to="/quest" className="btn self-start">{t('home.start')}</Link>
        </m.section>

        <m.section {...card(3)} className="hud pointer-events-auto grid grid-cols-2 divide-x divide-line lg:col-start-3 lg:row-start-3">
          <div className="p-5">
            <Label>{t('home.lanterns')}</Label>
            <div className="mt-3 flex gap-1.5" role="img" aria-label={`${Math.min(progress.streak, 7)} / 7`}>
              {Array.from({ length: 7 }, (_, i) => {
                const lit = i < progress.streak
                return <span key={i} className={`h-5 flex-1 rounded-sm border ${lit ? 'border-amber bg-amber-soft shadow-[0_0_10px_rgb(var(--amber-soft))]' : 'border-line bg-paper'}`} />
              })}
            </div>
            <p className="label mt-3">{progress.streak} {progress.streak === 1 ? t('home.day') : t('home.days')}</p>
          </div>
          <div className="p-5">
            <Label>{t('home.badge')}</Label>
            {next ? (
              <>
                <p className="mt-2 font-serif text-lg leading-tight text-ink">{next.name}</p>
                <XpBar pct={Math.round((have[next.trigger] / next.value) * 100)} className="mt-2.5" />
                <p className="label mt-2">{Math.floor(have[next.trigger])} / {next.value}</p>
              </>
            ) : <p className="mt-2 font-serif text-lg text-ink">—</p>}
          </div>
        </m.section>
      </div>

    </div>
  )
}
