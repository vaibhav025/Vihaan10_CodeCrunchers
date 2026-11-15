import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import Pillars from './Pillars'
import ScoreRing from '../../ui/ScoreRing'
import { Label, Range } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { getMoney, setMoney, type AssetType, type Money } from '../../lib/tracker'
import { readiness } from '../../lib/readiness'
import { vaultTitle } from '../../lib/vaultTitles'
import { rupees } from '../../lib/format'
import { spring } from '../../ui/motion'
import { play } from '../../lib/sound'

const STEPS = [
  { key: 'pay', presets: [25000, 50000, 100000], max: 300000 },
  { key: 'exp', presets: [15000, 30000, 60000], max: 200000 },
  { key: 'asset', presets: [50000, 200000, 500000], max: 2000000 },
] as const
const KINDS: AssetType[] = ['cash', 'fd', 'mf', 'epf', 'nps']

/** First run: three questions, one per screen, then the score reveal. */
export default function QuickScore({ years, onDone }: { years: number; onDone: () => void }) {
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [v, setV] = useState([0, 0, 0])
  const [kind, setKind] = useState<AssetType>('cash')
  const draft: Money = { ...getMoney(), income: v[0], expenses: v[1], assets: v[2] ? [{ id: 'q1', type: kind, value: v[2], monthly: 0 }] : [] }
  const r = readiness(draft, years)
  const set = (n: number) => setV(x => x.map((y, i) => (i === step ? n : y)))
  const next = (skip = false) => {
    if (skip) set(0)
    play('tick')
    if (step < 2) { setStep(step + 1); return }
    const m0 = getMoney()
    setMoney({ income: v[0], expenses: v[1], assets: !skip && v[2] ? draft.assets : [], unlocked: [...m0.unlocked, 'quick'] })
    setStep(3); play('level')
  }
  const s = STEPS[Math.min(step, 2)]
  return (
    <div data-guide="tracker-quick" className="fixed inset-0 z-[60] overflow-y-auto bg-paper text-ink">
      <div className="band mx-auto flex min-h-full max-w-[720px] flex-col justify-center !rounded-none !bg-none !shadow-none px-6 py-8">
        {step < 3 ? (
          <div className="relative z-10">
            <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>{[0, 1, 2].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-ink/15'}`} />)}</div>
            <Pillars parts={r.parts} className="mt-8 !h-[120px] opacity-80" />
            <AnimatePresence mode="wait">
              <m.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring} className="mt-8">
                <Label>{t('qs.step', { n: step + 1 })}</Label>
                <h1 className="mt-2 text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.08]">{t(`qs.${s.key}`)}</h1>
                {step === 2 && (
                  <div role="radiogroup" aria-label={t('tr.type')} className="mt-4 flex flex-wrap gap-2">
                    {KINDS.map(k => <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`min-h-[44px] rounded-md border px-3 text-[15px] ${kind === k ? 'border-ink bg-ink text-[#0A0A0A]' : 'border-ink/20 hover:border-ink/50'}`}>{t(`as.${k}`)}</button>)}
                  </div>
                )}
                <p className="num mt-6 text-[clamp(3rem,9vw,4.6rem)] leading-none text-ink">{rupees(v[step])}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.presets.map(p => <button key={p} onClick={() => { set(p); play('tick') }} className={`min-h-[44px] rounded-md border px-4 font-mono text-[13px] ${v[step] === p ? 'border-ink text-ink' : 'border-ink/20 hover:border-ink/50'}`}>{rupees(p)}</button>)}
                </div>
                <div className="quick-range mt-2"><Range label={t(`qs.${s.key}L`)} value={v[step]} min={0} max={s.max} step={s.max / 200} onChange={set} format={rupees} /></div>
              </m.div>
            </AnimatePresence>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <button className="min-h-[44px] text-[15px] text-ink/75 underline underline-offset-4 hover:text-ink" onClick={() => next(true)}>{step === 2 ? t('qs.none') : t('qs.skip')}</button>
              <button className="btn game-btn min-w-[170px] !bg-ink !text-[#0A0A0A]" disabled={!v[step]} onClick={() => next()}>{step === 2 ? t('qs.reveal') : t('common.continue')}</button>
            </div>
          </div>
        ) : (
          <m.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="relative z-10 text-center" role="status">
            <Label>{t('tr.score')}</Label>
            <div className="mt-4 flex justify-center"><ScoreRing score={r.score} dark size={190} label={t('tr.score')} /></div>
            <m.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-5 text-[clamp(2rem,6vw,3rem)] leading-tight">{t(`vt.${vaultTitle(r.score)}`)}</m.h1>
            <Pillars parts={r.parts} reveal className="mx-auto mt-6 max-w-[520px]" />
            <p className="label mt-4">{t('common.disclaimer')}</p>
            <button className="btn game-btn mt-6 min-w-[200px] !bg-ink !text-[#0A0A0A]" onClick={onDone} autoFocus>{t('qs.open')}</button>
          </m.div>
        )}
      </div>
    </div>
  )
}
