import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from '../components/ui/icons'
import { Label, Range } from '../components/ui/kit'
import { LabHead, LabNote, LineChart, Stat, useLabSave } from '../components/lab/kit'
import Segmented from '../ui/Segmented'
import { useI18n } from '../lib/i18n'
import { rupees, rupeesShort } from '../lib/format'
import { ACTIVE_FUND, INDEX_ETF } from '../sim/fund'
import { SIP_CRASH_MONTH, basketVsBets, etfCloses, feeDrag, intraday, sipVsLump } from '../sim/funds'

const YEARS = 30
const savedSeed = () => { try { return Number(localStorage.getItem('pq.lab.seed')) || 2026 } catch { return 2026 } }
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`

/** One question after an experiment. Answering it (right or wrong) reveals the takeaway. */
function Checkpoint({ id, options, answer, picked, onPick }: { id: string; options: string[]; answer: number; picked: number | undefined; onPick: (i: number) => void }) {
  const { t } = useI18n()
  const done = picked !== undefined
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p id={`ck-${id}`} className="text-[15px] font-medium text-ink">{t(`lab.f.${id}.q`)}</p>
      <div role="radiogroup" aria-labelledby={`ck-${id}`} className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button key={o} role="radio" aria-checked={picked === i} disabled={done} onClick={() => onPick(i)}
            className={`min-h-[44px] rounded-md border px-3.5 text-[15px] ${done && i === answer ? 'border-forest bg-haze font-medium text-ink' : picked === i ? 'border-rust text-ink' : 'border-line bg-card text-soft hover:border-forest'} disabled:cursor-default`}>
            {done && i === answer && <Check size={14} strokeWidth={2} aria-hidden className="mr-1.5 inline text-forest" />}
            {done && picked === i && i !== answer && <X size={14} strokeWidth={2} aria-hidden className="mr-1.5 inline text-rust" />}
            {t(`lab.f.${id}.${o}`)}
          </button>
        ))}
      </div>
      {done && <p role="status" className="mt-3 text-[15px] leading-relaxed text-ink"><span className="font-medium">{t(picked === answer ? 'lab.nr.right' : 'lab.nr.wrong')}.</span> {t(`lab.f.${id}.take`)}</p>}
    </div>
  )
}

function Section({ id, n, children }: { id: string; n: number; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby={`f-${id}`} className="hud p-5 sm:p-6">
      <Label>{t('lab.f.part', { n })}</Label>
      <h2 id={`f-${id}`} className="mt-1.5 text-[1.6rem] leading-tight text-ink">{t(`lab.f.${id}.t`)}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-soft">{t(`lab.f.${id}.d`)}</p>
      {children}
    </section>
  )
}

export default function LabFunds() {
  const { t } = useI18n()
  const save = useLabSave()
  const [seed] = useState(savedSeed)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const pick = (id: string, i: number) => setPicked(p => ({ ...p, [id]: i }))
  const ANSWERS: Record<string, number> = { fee: 1, sip: 0, nav: 1, basket: 0 }
  const ids = Object.keys(ANSWERS)
  const answered = ids.filter(id => picked[id] !== undefined).length
  const right = ids.filter(id => picked[id] === ANSWERS[id]).length

  // save once, when all four checkpoints are answered
  const saved = useRef(false)
  useEffect(() => {
    if (answered === ids.length && !saved.current) { saved.current = true; void save('funds', (right / ids.length) * 100, 'funds_done', ids) }
  }, [answered, right, ids, save])

  // 1. fee drag
  const [monthly, setMonthly] = useState(5000)
  const [fee, setFee] = useState(ACTIVE_FUND.expense * 100)
  const drag = useMemo(() => feeDrag(seed, YEARS, monthly, fee / 100), [seed, monthly, fee])
  const end = (s: number[]) => s[s.length - 1]
  const yearly = (s: number[]) => s.filter((_, i) => i % 12 === 0 || i === s.length - 1)

  // 2. SIP vs lump sum
  const sl = useMemo(() => sipVsLump(seed), [seed])

  // 3. NAV once a day
  const closes = useMemo(() => etfCloses(seed), [seed])
  const [day, setDay] = useState('1')
  const d = Number(day)
  const ticks = useMemo(() => intraday(closes[d - 1], closes[d], seed + d), [closes, d, seed])

  // 4. baskets and bets
  const [bets, setBets] = useState<ReturnType<typeof basketVsBets> | null>(null)

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('lab.f.title')} sub={t('lab.f.sub')} />
      <LabNote />

      <Section id="fee" n={1}>
        <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Range label={t('lab.f.monthly')} value={monthly} min={1000} max={20000} step={1000} onChange={setMonthly} format={rupees} />
          <Range label={t('lab.f.activeFee')} value={fee} min={0.5} max={2.5} step={0.1} onChange={setFee} format={v => `${v.toFixed(1)}%`} />
        </div>
        <div className="mt-3">
          <LineChart label={t('lab.f.fee.chart', { years: YEARS })} format={rupeesShort} height={190}
            series={[
              { name: t('lab.f.etf', { fee: pct1(INDEX_ETF.expense) }), values: yearly(drag.etf) },
              { name: t('lab.f.active', { fee: `${fee.toFixed(1)}%` }), values: yearly(drag.active), tone: 'amber', dashed: true },
              { name: t('lab.f.noFee'), values: yearly(drag.noFee), tone: 'soft', dashed: true },
            ]} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t('lab.f.paid')} value={rupeesShort(drag.paid)} sub={t('lab.f.over', { years: YEARS })} />
          <Stat label={t('lab.f.activeEnd')} value={rupeesShort(end(drag.active))} />
          <Stat label={t('lab.f.feeCost')} value={<span className="text-rust">{rupeesShort(drag.feeCost)}</span>} sub={t('lab.f.feeCostD', { pct: Math.round((drag.feeCost / end(drag.noFee)) * 100) })} />
          <Stat label={t('lab.f.etfEnd')} value={rupeesShort(end(drag.etf))} sub={t('lab.f.etfEndD')} />
        </dl>
        <Checkpoint id="fee" options={['a', 'b', 'c']} answer={ANSWERS.fee} picked={picked.fee} onPick={i => pick('fee', i)} />
      </Section>

      <Section id="sip" n={2}>
        <div className="mt-4">
          <LineChart label={t('lab.f.sip.chart')} format={rupeesShort} height={170}
            series={[{ name: t('lab.f.sipLine'), values: sl.sip }, { name: t('lab.f.lumpLine'), values: sl.lump, tone: 'amber', dashed: true }]}
            marks={[{ at: SIP_CRASH_MONTH, text: t('lab.f.crash') }]} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t('lab.f.lumpPrice')} value="₹ 100.00" sub={t('lab.f.lumpPriceD')} />
          <Stat label={t('lab.f.sipPrice')} value={`₹ ${sl.avgCost.toFixed(2)}`} sub={t('lab.f.sipPriceD', { low: sl.lowest.toFixed(0) })} />
          <Stat label={t('lab.f.lumpEnd')} value={rupees(end(sl.lump))} />
          <Stat label={t('lab.f.sipEnd')} value={rupees(end(sl.sip))} sub={t('lab.f.sameTotal', { v: rupees(sl.total) })} />
        </dl>
        <p className="mt-3 text-[14px] text-soft">{t('lab.f.sip.note')}</p>
        <Checkpoint id="sip" options={['a', 'b', 'c']} answer={ANSWERS.sip} picked={picked.sip} onPick={i => pick('sip', i)} />
      </Section>

      <Section id="nav" n={3}>
        <div className="mt-3 max-w-md">
          <Segmented label={t('lab.f.day')} value={day} onChange={setDay} options={[1, 2, 3, 4, 5].map(n => ({ id: String(n), name: t('lab.f.dayN', { n }) }))} />
        </div>
        <div className="mt-4">
          <LineChart label={t('lab.f.nav.chart')} format={n => `₹ ${n.toFixed(1)}`} height={170}
            series={[
              { name: t('lab.f.etfTicks'), values: ticks },
              { name: t('lab.f.navLine'), values: ticks.map(() => closes[d]), tone: 'amber', dashed: true },
            ]} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t('lab.f.etfLow')} value={`₹ ${Math.min(...ticks).toFixed(2)}`} />
          <Stat label={t('lab.f.etfHigh')} value={`₹ ${Math.max(...ticks).toFixed(2)}`} />
          <Stat label={t('lab.f.navToday')} value={`₹ ${closes[d].toFixed(2)}`} sub={t('lab.f.navTodayD')} />
        </dl>
        <Checkpoint id="nav" options={['a', 'b', 'c']} answer={ANSWERS.nav} picked={picked.nav} onPick={i => pick('nav', i)} />
      </Section>

      <Section id="basket" n={4}>
        {!bets ? <button className="btn-quiet mt-4" onClick={() => setBets(basketVsBets(40, 10, seed))}>{t('lab.f.basket.run')}</button> : (
          <div role="status" className="mt-4 space-y-4">
            {([['single', bets.singleLoss, bets.singleRange], ['basket', bets.basketLoss, bets.basketRange]] as const).map(([k, loss, range]) => {
              const max = Math.max(bets.singleRange[1], bets.basketRange[1])
              return (
                <div key={k}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-[15px] font-medium text-ink">{t(`lab.f.${k}`)}</span>
                    <span className="text-[14px] text-soft">{t('lab.f.lost', { pct: Math.round(loss * 100) })} · {t('lab.f.range', { lo: rupees(range[0] * 100), hi: rupees(range[1] * 100) })}</span>
                  </div>
                  {/* the span from a poor outcome (10th percentile) to a good one (90th), on a shared scale */}
                  <div className="relative mt-1.5 h-3 rounded-sm bg-mist" aria-hidden>
                    <span className={`absolute inset-y-0 rounded-sm ${k === 'basket' ? 'bg-forest' : 'bg-amber'}`} style={{ left: `${(range[0] / max) * 100}%`, width: `${((range[1] - range[0]) / max) * 100}%` }} />
                    <span className="absolute inset-y-[-3px] w-px bg-ink" style={{ left: `${(1 / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-[13px] text-soft">{t('lab.f.basket.note')}</p>
          </div>
        )}
        <Checkpoint id="basket" options={['a', 'b', 'c']} answer={ANSWERS.basket} picked={picked.basket} onPick={i => pick('basket', i)} />
      </Section>

      {answered === ids.length && (
        <section className="band p-6 sm:p-8" role="status">
          <div className="relative z-10">
            <h2 className="text-[clamp(1.7rem,4vw,2.4rem)] leading-tight">{t('lab.nr.score', { n: right, total: ids.length })}</h2>
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-[#F7F5E8]/80">{t('lab.f.done')}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link to="/tracker" className="btn !bg-[#F0B67A] !text-[#243B2C]">{t('lab.f.toPlan')}</Link>
              <Link to="/lab/retire" className="link !text-[#F7F5E8]">{t('lab.m.retire')}</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
