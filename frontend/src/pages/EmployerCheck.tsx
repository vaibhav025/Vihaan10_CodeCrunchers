import { useEffect, useState } from 'react'
import { Check, Shield } from '../components/ui/icons'
import { Label, StateChip } from '../components/ui/kit'
import { Terms } from '../components/ui/Term'
import Segmented from '../ui/Segmented'
import CountUp from '../ui/CountUp'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { api } from '../lib/api'
import { AGGREGATE_CAP, check, type Regime, type Sector } from '../lib/employer'
import { rupees, rupeesShort } from '../lib/format'

/** Employer NPS checker: is your employer's contribution what you are owed, and what tax room is unused? */
export default function EmployerCheck() {
  const { t } = useI18n()
  const { user } = useSession()
  const [basic, setBasic] = useState('40000')
  const [emp, setEmp] = useState('0')
  const [sector, setSector] = useState<Sector>('private')
  const [regime, setRegime] = useState<Regime>('new')
  const [slab, setSlab] = useState(0.2)
  const b = Number(basic) || 0, e = Number(emp) || 0
  const r = check(b, e, sector, regime, slab)
  const gap = r.shortfall || r.headroom
  // what the missing or unused amount would be worth at 60, from the calculator API
  const [worth, setWorth] = useState<number | null>(null)
  useEffect(() => {
    if (!user || gap < 1) { setWorth(null); return }
    const id = setTimeout(() => api.simulate({ current_age: user.age, retirement_age: user.retirement_age, monthly_contribution: Math.round(gap), annual_return_pct: 10, risk_profile: user.risk_profile, annual_income: b * 12 })
      .then(x => setWorth(x.projected_corpus)).catch(() => setWorth(null)), 400)
    return () => clearTimeout(id)
  }, [gap, user, b])
  const yearly = e * 12

  const field = (id: string, label: string, v: string, set: (s: string) => void, hint: string) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative mt-1.5"><span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft">₹</span>
        <input id={id} inputMode="numeric" className="field !pl-8" value={v} onChange={x => set(x.target.value.replace(/[^\d]/g, ''))} aria-describedby={`${id}-h`} /></div>
      <p id={`${id}-h`} className="mt-1 text-[13px] text-soft">{hint}</p>
    </div>
  )
  const tone = r.status === 'short' ? 'critical' : r.status === 'over' ? 'struggling' : r.status === 'room' ? 'stable' : 'thriving'
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
      <section className="band p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <Label>80CCD(2)</Label>
          <h1 className="mt-2 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">{t('em.title')}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-ink/80">{t('em.sub')}</p>
          <Terms keys={['nps', 'ccd']} className="mt-3" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <form className="hud h-fit space-y-5 p-6" onSubmit={x => x.preventDefault()}>
          {field('basic', t('em.basic'), basic, setBasic, t('em.basicHint'))}
          {field('emp', t('em.emp'), emp, setEmp, t('em.empHint'))}
          <div><span className="label">{t('em.sector')}</span>
            <Segmented label={t('em.sector')} value={sector} onChange={setSector} options={[{ id: 'private', name: t('em.private') }, { id: 'central', name: t('em.central') }, { id: 'state', name: t('em.state') }]} /></div>
          <div><span className="label">{t('em.regime')}</span>
            <Segmented label={t('em.regime')} value={regime} onChange={setRegime} options={[{ id: 'new', name: t('em.new') }, { id: 'old', name: t('em.old') }]} /></div>
          <div><span className="label">{t('em.slab')}</span>
            <Segmented label={t('em.slab')} value={String(slab) as '0.05' | '0.2' | '0.3'} onChange={v => setSlab(Number(v))} options={[{ id: '0.05', name: '5%' }, { id: '0.2', name: '20%' }, { id: '0.3', name: '30%' }]} /></div>
        </form>

        <div className="space-y-5" aria-live="polite">
          <div className="hud p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>{t('em.verdict')}</Label><StateChip state={tone} />
            </div>
            <p className="mt-3 font-serif text-[1.8rem] leading-tight text-ink">{t(`em.s.${r.status}`, { amt: rupees(r.shortfall || r.overCap || r.headroom) })}</p>
            {/* where the employer sits against what is owed and what is tax-free */}
            <div className="relative mt-6 h-4 rounded-full bg-mist" role="img" aria-label={`${r.pct.toFixed(1)}% / ${r.cap}%`}>
              <span className="absolute inset-y-0 left-0 origin-left rounded-full bg-forest transition-transform duration-500" style={{ width: '100%', transform: `scaleX(${Math.min(r.pct / 16, 1)})` }} />
              <span className="absolute -top-1 bottom-[-4px] w-[2px] bg-amber" style={{ left: `${(r.cap / 16) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between"><span className="label">{t('em.yours', { p: r.pct.toFixed(1) })}</span><span className="label !text-rust">{t('em.limit', { p: r.cap })}</span></div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="hud p-5"><dt className="label">{r.shortfall ? t('em.missing') : t('em.room')}</dt><dd className="num mt-1 text-[2rem] leading-none text-ink"><CountUp value={gap} format={rupees} /></dd><p className="label mt-1">{t('common.perMonth')}</p></div>
            <div className="hud p-5"><dt className="label">{t('em.tax')}</dt><dd className="num mt-1 text-[2rem] leading-none text-ink"><CountUp value={r.taxSavable} format={rupees} /></dd><p className="label mt-1">{t('em.perYear')}</p></div>
            <div className="hud p-5"><dt className="label">{t('em.worth')}</dt><dd className="num mt-1 text-[2rem] leading-none text-ink">{worth === null ? '—' : <CountUp value={worth} format={rupeesShort} />}</dd><p className="label mt-1">{t('qt.calc')}</p></div>
          </dl>
          <div className="hud p-6">
            <Label>{t('em.next')}</Label>
            <ul className="mt-3 space-y-2">
              {(r.status === 'short' ? ['em.a.short1', 'em.a.short2'] : r.status === 'room' ? ['em.a.room1', 'em.a.room2'] : r.status === 'over' ? ['em.a.over1'] : ['em.a.ok1']).map(k => (
                <li key={k} className="flex gap-2.5 text-ink"><Check size={18} className="mt-0.5 shrink-0 text-forest" aria-hidden />{t(k)}</li>
              ))}
              {yearly > AGGREGATE_CAP * 0.6 && <li className="flex gap-2.5 text-ink"><Shield size={18} className="mt-0.5 shrink-0 text-rust" aria-hidden />{t('em.cap')}</li>}
            </ul>
            <p className="mt-4 text-[13px] text-soft">{t('em.note')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
