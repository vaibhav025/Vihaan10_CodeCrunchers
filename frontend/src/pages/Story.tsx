import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { X } from '../components/ui/icons'
import { Label, StateChip } from '../components/ui/kit'
import WorldStill from '../components/world/WorldStill'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { api } from '../lib/api'
import { monthlyIncome, recommended, stateFor, vitalityFor } from '../lib/game'
import { rupees, rupeesShort } from '../lib/format'
import { NODES } from '../lib/path'
import { play } from '../lib/sound'
import { recordLesson } from '../lib/meta'

/** Story node: a scenario whose choices run through the calculator API and change the world. */
export default function Story() {
  const { id = '' } = useParams()
  const idx = NODES.findIndex(n => n.id === id)
  const { t } = useI18n()
  const nav = useNavigate()
  const { user, progress, saveProgress } = useSession()
  const [pick, setPick] = useState<number | null>(null)
  const [res, setRes] = useState<{ corpus: number; pension: number } | null>(null)
  if (!user) return null
  const income = monthlyIncome(user.income_range) * 1.2 // the raise
  const base = Math.round(recommended(user.income_range) / 100) * 100
  const choices = [base + 2000, base, 0]
  const target = income * 0.1

  async function choose(i: number) {
    setPick(i); setRes(null); play('tick')
    const r = await api.simulate({ current_age: Math.max(user!.age, 28), retirement_age: user!.retirement_age, monthly_contribution: choices[i], annual_return_pct: 10, risk_profile: user!.risk_profile, annual_income: income * 12 })
    setRes({ corpus: r.projected_corpus, pension: r.monthly_pension })
  }
  function finish() {
    saveProgress({ nodes: { ...progress.nodes, [id]: 3 }, coins: progress.coins + 10 })
    recordLesson({ accuracy: 1, xp: 0 })
    nav('/home', { state: { walkFrom: idx } })
  }
  const monthly = pick === null ? base : choices[pick]
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto max-w-[760px] px-5 py-5">
        <button onClick={() => nav('/home')} aria-label={t('ls.close')} className="grid h-11 w-11 place-items-center rounded text-soft hover:text-ink"><X size={22} aria-hidden /></button>
        <Label className="mt-4 block">{t('node.story')}</Label>
        <h1 className="mt-2 text-[clamp(1.8rem,4.5vw,2.6rem)] leading-tight text-ink">{t('st.title')}</h1>
        <p className="mt-2 text-[17px] text-soft">{t('st.sub', { inc: rupees(income) })}</p>
        {/* the world reacts to the choice: richer when saving more, dimmer when paused */}
        <div className="relative mx-auto mt-4 h-[230px] max-w-[380px]">
          <AnimatePresence mode="wait">
            <m.div key={pick ?? 'none'} className="absolute inset-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <WorldStill vitality={vitalityFor(monthly, target)} className="h-full w-full" />
            </m.div>
          </AnimatePresence>
          <StateChip state={stateFor(monthly, target)} className="absolute left-0 top-0" />
        </div>
        <div role="radiogroup" className="mt-4 space-y-2.5">
          {['st.a', 'st.b', 'st.c'].map((k, i) => (
            <button key={k} role="radio" aria-checked={pick === i} onClick={() => choose(i)} className="row !min-h-[58px] justify-between">
              <span className="py-3">{t(k)}</span><span className="num text-lg text-ink">{rupees(choices[i])}{t('common.perMonth')}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 min-h-[2em] font-serif text-xl text-ink" aria-live="polite">
          {res ? t('st.result', { c: rupeesShort(res.corpus), p: rupees(res.pension) }) : t('st.pick')}
        </p>
        <button className="btn game-btn mt-4 w-full" disabled={pick === null} onClick={finish}>{t('st.done')}</button>
      </div>
    </div>
  )
}
