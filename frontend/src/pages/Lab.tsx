import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Landmark, Lock, PieChart, Route, TrendingUp } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { LabHead, LabNote } from '../components/lab/kit'
import { useI18n } from '../lib/i18n'
import { api, type LabRow } from '../lib/api'

const MODULES = [
  { id: 'retire', to: '/lab/retire', icon: Route, ready: true },
  { id: 'stocks', to: '/lab/stocks', icon: TrendingUp, ready: true },
  { id: 'funds', to: '/lab/funds', icon: PieChart, ready: true },
  { id: 'schemes', to: '/lab/schemes', icon: Landmark, ready: true },
] as const

export default function Lab() {
  const { t } = useI18n()
  const [rows, setRows] = useState<LabRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { api.labProgress().then(r => setRows(r.progress)).catch(() => setFailed(true)) }, [])
  const of = (id: string) => rows?.find(r => r.module === id)

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('lab.title')} sub={t('lab.sub')} back={false} />
      <LabNote />
      <ul className="grid gap-4 md:grid-cols-2">
        {MODULES.map(mod => {
          const p = of(mod.id)
          const body = (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-haze text-forest"><mod.icon size={22} strokeWidth={1.5} aria-hidden /></span>
                {mod.ready ? <ChevronRight size={20} strokeWidth={1.5} aria-hidden className="mt-3 text-soft" /> : <span className="label inline-flex items-center gap-1.5"><Lock size={12} aria-hidden />{t('lab.soon')}</span>}
              </div>
              <h2 className="mt-4 text-[1.5rem] leading-tight text-ink">{t(`lab.m.${mod.id}`)}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-soft">{t(`lab.m.${mod.id}.d`)}</p>
              {mod.ready && (
                <p className="mt-4 border-t border-line pt-3 text-[14px] text-soft" aria-live="polite">
                  {rows === null && !failed ? t('common.loading')
                    : p ? <>{t('lab.best')}: <span className="font-medium text-ink">{p.best_score} / 100</span> · {t('lab.runs', { n: p.runs_completed })}{p.last_outcome && mod.id === 'retire' ? <> · {t('lab.last')}: {t(`state.${p.last_outcome}`)}</> : null}</>
                    : t('lab.notYet')}
                </p>
              )}
            </>
          )
          return (
            <li key={mod.id} className={mod.id === 'retire' ? 'md:col-span-2' : ''}>
              {mod.to
                ? <Link to={mod.to} className="hud block h-full p-5 transition-transform hover:-translate-y-0.5 sm:p-6">{mod.id === 'retire' && <Label className="mb-3 block !text-rust">{t('lab.start')}</Label>}{body}</Link>
                : <div className="hud h-full p-5 opacity-75 sm:p-6" aria-disabled="true">{body}</div>}
            </li>
          )
        })}
      </ul>
      {failed && <p role="alert" className="text-[14px] text-rust">{t('lab.loadFail')}</p>}
      <section className="max-w-2xl text-[15px] leading-relaxed text-soft">
        <h2 className="text-[1.3rem] text-ink">{t('lab.whyT')}</h2>
        <p className="mt-2">{t('lab.whyD')}</p>
      </section>
    </div>
  )
}
