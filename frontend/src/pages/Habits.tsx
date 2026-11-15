import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { Check, Coins } from '../components/ui/icons'
import { Flame, Label } from '../components/ui/kit'
import CountUp from '../ui/CountUp'
import { useToast } from '../ui/Toast'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { api } from '../lib/api'
import { HABITS, monthTotal, setHabits, skipStreak, useHabits } from '../lib/habits'
import { rupees, rupeesShort } from '../lib/format'
import { play } from '../lib/sound'
import { spring } from '../ui/motion'

/** Habit-linked micro-saving: tap when you skip a habit; the month's total becomes an NPS contribution. */
export default function Habits() {
  const { t } = useI18n()
  const { user, refresh } = useSession()
  const h = useHabits()
  const toast = useToast()
  const total = monthTotal(h)
  const streak = skipStreak(h)
  const unlogged = Math.max(0, total - h.logged)
  const [pop, setPop] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const all = [...HABITS, ...h.custom]
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim(), p = Number(price)
    if (!n || !(p > 0)) return
    const id = 'c-' + Date.now()
    setHabits({ custom: [...h.custom, { id, price: p, custom: n }], picked: [...h.picked, id] }); setName(''); setPrice(''); play('good')
  }
  // keep it up for a year: what the monthly habit savings are worth at 60, from the calculator API
  const [worth, setWorth] = useState<number | null>(null)
  const monthly = Math.max(total, h.picked.reduce((a, id) => a + (all.find(x => x.id === id)?.price ?? 0) * 8, 0))
  useEffect(() => {
    if (!user || !monthly) return
    const id = setTimeout(() => api.simulate({ current_age: user.age, retirement_age: user.retirement_age, monthly_contribution: monthly, annual_return_pct: 10, risk_profile: user.risk_profile, annual_income: 0 })
      .then(x => setWorth(x.projected_corpus)).catch(() => {}), 300)
    return () => clearTimeout(id)
  }, [monthly, user])

  const skip = (id: string, price: number) => {
    setHabits({ log: [...h.log, { id, amt: price, at: new Date().toISOString() }] })
    setPop(id + Date.now()); play('tick'); navigator.vibrate?.(12)
  }
  async function logIt() {
    if (!unlogged) return
    setBusy(true)
    try { await api.contribute(unlogged); setHabits({ logged: h.logged + unlogged }); await refresh(); toast(t('hb.logged', { amt: rupees(unlogged) })); play('good') }
    catch (e) { toast(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  const counts = (id: string) => h.log.filter(l => l.id === id && l.at.startsWith(new Date().toISOString().slice(0, 7))).length

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
      <section className="band p-6 sm:p-9">
        <div className="relative z-10 grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-xl">
            <Label>{t('hb.month')}</Label>
            <h1 className="mt-2 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">{t('hb.title')}</h1>
            <p className="mt-2 text-[16px] leading-relaxed text-ink/80">{t('hb.sub')}</p>
          </div>
          <div className="flex gap-3">
            <div className="tile px-5 py-4"><p className="label">{t('hb.saved')}</p><p className="num mt-1 text-[2.6rem] leading-none text-ink"><CountUp value={total} format={rupees} /></p></div>
            <div className="tile px-5 py-4"><p className="label flex items-center gap-1"><Flame size={12} />{t('home.streak')}</p><p className="num mt-1 text-[2.6rem] leading-none"><CountUp value={streak} /></p></div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="hb-list">
          <h2 id="hb-list" className="text-[1.7rem] text-ink">{t('hb.skipped')}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {all.map(x => {
              const on = h.picked.includes(x.id)
              return (
                <li key={x.id} className={`hud relative overflow-hidden p-4 ${on ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-serif text-xl text-ink">{x.custom ?? t(`hb.h.${x.id}`)}</p><p className="label mt-0.5">{rupees(x.price)} · {t('hb.times', { n: counts(x.id) })}</p></div>
                    <button aria-pressed={on} aria-label={t('hb.track')} onClick={() => setHabits({ picked: on ? h.picked.filter(p => p !== x.id) : [...h.picked, x.id] })}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${on ? 'border-forest bg-forest text-on-forest' : 'border-line text-soft hover:border-forest'}`}><Check size={16} aria-hidden /></button>
                  </div>
                  {x.custom && <button className="link !min-h-0 py-1 text-[13px]" onClick={() => setHabits({ custom: h.custom.filter(c => c.id !== x.id), picked: h.picked.filter(p => p !== x.id) })}>{t('tr.remove')}</button>}
                  {on && (
                    <button onClick={() => skip(x.id, x.price)} className="btn game-btn relative mt-3 w-full !min-h-[46px]">
                      {t('hb.skip')}
                      {pop?.startsWith(x.id) && <m.span key={pop} aria-hidden initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -26 }} transition={{ duration: 0.8 }} className="absolute right-4 font-mono text-[13px] text-amber-soft">+{rupees(x.price)}</m.span>}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {/* add a habit of your own */}
          <form onSubmit={addHabit} className="hud mt-4 grid gap-3 p-5 sm:grid-cols-[1fr_150px_auto] sm:items-end">
            <div><label htmlFor="hb-n" className="label">{t('hb.addTitle')}</label><input id="hb-n" className="field mt-1 !min-h-[46px]" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder={t('hb.namePh')} /></div>
            <div><label htmlFor="hb-p" className="label">{t('hb.price')}</label><input id="hb-p" inputMode="numeric" className="field mt-1 !min-h-[46px]" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ''))} placeholder="₹" /></div>
            <button className="btn !min-h-[46px]" disabled={!name.trim() || !(Number(price) > 0)}>{t('hb.add')}</button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="hud p-6">
            <Label>{t('hb.toNps')}</Label>
            <p className="num mt-2 text-[2.4rem] leading-none text-ink"><CountUp value={unlogged} format={rupees} /></p>
            <p className="mt-2 text-[14px] text-soft">{t('hb.payNote')}</p>
            <a href="https://enps.nsdl.com" target="_blank" rel="noreferrer" className="link mt-2">{t('common.official')}</a>
            <button className="btn game-btn mt-3 w-full gap-2" disabled={!unlogged || busy} onClick={logIt}><Coins size={17} aria-hidden />{t('hb.log', { amt: rupees(unlogged) })}</button>
          </div>
          <m.div className="hud p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Label>{t('hb.worth')}</Label>
            <p className="num mt-2 text-[2.4rem] leading-none text-forest">{worth === null ? '—' : <CountUp value={worth} format={rupeesShort} />}</p>
            <p className="mt-2 text-[14px] text-soft">{t('hb.worthSub', { amt: rupees(monthly) })}</p>
          </m.div>
        </aside>
      </div>
    </div>
  )
}
