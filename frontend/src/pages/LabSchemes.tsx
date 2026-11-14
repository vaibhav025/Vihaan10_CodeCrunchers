import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Info, X } from '../components/ui/icons'
import { Label, Range } from '../components/ui/kit'
import { LabHead, LabNote, Stat, useLabSave } from '../components/lab/kit'
import Segmented from '../ui/Segmented'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { recordLesson } from '../lib/meta'
import { rupees, rupeesShort } from '../lib/format'
import { buildQuiz } from '../sim/quiz'
import { ALL_FACTS, APY, EPF, NPS, PPF, apy, epf, lifecycleEquity, npsExit, npsTaxSaved, ppf, type Fact } from '../sim/schemes'

type Scheme = 'nps' | 'apy' | 'ppf' | 'epf'
const SCHEMES: Scheme[] = ['nps', 'apy', 'ppf', 'epf']
const pct = (x: number) => `${Math.round(x * 100)}%`
/** Quiz options that are words, not figures, and so need translating. */
const WORD_OPTIONS = new Set(['up', 'down', 'same', 'market', 'fixed', 'none', 'early', 'late'])

/** Marks a figure that has not been checked against the official source. */
function Verify({ fact }: { fact: Fact<unknown> }) {
  const { t } = useI18n()
  if (!fact.verify) return null
  return <span className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded border border-rust/50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-rust" title={fact.source}><Info size={11} strokeWidth={2} aria-hidden />{t('lab.g2.verify')}</span>
}

function Rule({ children, fact }: { children: ReactNode; fact: Fact<unknown> }) {
  return <li className="flex gap-2.5 py-2 text-[15px] leading-relaxed text-ink"><span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-forest" /><span>{children}<Verify fact={fact} /></span></li>
}

function Card({ id, rules, children }: { id: Scheme; rules: ReactNode; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div role="tabpanel" aria-labelledby={`sch-${id}`} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="hud p-5 sm:p-6">
        <h2 id={`sch-${id}`} className="text-[1.6rem] leading-tight text-ink">{t(`lab.g2.${id}.t`)}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-soft">{t(`lab.g2.${id}.d`)}</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">{rules}</ul>
      </section>
      <section className="hud p-5 sm:p-6">
        <Label>{t('lab.g2.calc')}</Label>
        {children}
      </section>
    </div>
  )
}

export default function LabSchemes() {
  const { t } = useI18n()
  const { user } = useSession()
  const [tab, setTab] = useState<Scheme>('nps')
  const age0 = Math.min(Math.max(user?.age ?? 25, 18), 55)

  // NPS
  const [profile, setProfile] = useState<'LC75' | 'LC50' | 'LC25'>('LC50')
  const [npsAge, setNpsAge] = useState(age0)
  const [corpus, setCorpus] = useState(5000000)
  const [lumpShare, setLumpShare] = useState(60)
  const [slab, setSlab] = useState('0.2')
  const exit = npsExit(corpus, lumpShare / 100)
  // APY
  const [joinAge, setJoinAge] = useState(Math.min(age0, APY.maxJoinAge.value))
  const [pension, setPension] = useState('3000')
  const a = apy(joinAge, Number(pension))
  const late = apy(Math.min(joinAge + 10, APY.maxJoinAge.value), Number(pension))
  // PPF
  const [ppfYearly, setPpfYearly] = useState(60000)
  const p = ppf(ppfYearly)
  // EPF
  const [basic, setBasic] = useState(25000)
  const [epfYears, setEpfYears] = useState(25)
  const e = epf(basic, epfYears)

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('lab.g2.title')} sub={t('lab.g2.sub')} />
      <LabNote />
      <p className="flex items-start gap-2.5 rounded-md border border-rust/50 bg-paper px-3.5 py-2.5 text-[14px] leading-snug text-ink" role="note">
        <Info size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-rust" />
        <span>{t('lab.g2.verifyNote')}</span>
      </p>

      <div className="max-w-xl">
        <Segmented label={t('lab.g2.pick')} value={tab} onChange={setTab} options={SCHEMES.map(s => ({ id: s, name: t(`lab.g2.${s}.n`) }))} />
      </div>

      {tab === 'nps' && (
        <Card id="nps" rules={<>
          <Rule fact={NPS.minContribution}>{t('lab.g2.nps.r1', { min: rupees(NPS.minContribution.value), year: rupees(NPS.minYearly.value) })}</Rule>
          <Rule fact={NPS.autoEquityCap}>{t('lab.g2.nps.r2', { cap: pct(NPS.autoEquityCap.value) })}</Rule>
          <Rule fact={NPS.maxLumpShare}>{t('lab.g2.nps.r3', { lump: pct(NPS.maxLumpShare.value), ann: pct(NPS.minAnnuityShare.value), age: NPS.maturityAge.value })}</Rule>
          <Rule fact={NPS.partialWithdrawShare}>{t('lab.g2.nps.r4', { share: pct(NPS.partialWithdrawShare.value), years: NPS.partialWithdrawAfterYears.value })}</Rule>
          <Rule fact={NPS.tax80CCD1B}>{t('lab.g2.nps.r5', { amt: rupees(NPS.tax80CCD1B.value) })}</Rule>
          <Rule fact={NPS.tax80CCD2Other}>{t('lab.g2.nps.r6', { govt: pct(NPS.tax80CCD2Govt.value), other: pct(NPS.tax80CCD2Other.value) })}</Rule>
        </>}>
          <h3 className="mt-2 text-[1.2rem] text-ink">{t('lab.g2.nps.auto')}</h3>
          <Segmented label={t('lab.g2.nps.profile')} value={profile} onChange={setProfile} options={(['LC75', 'LC50', 'LC25'] as const).map(k => ({ id: k, name: t(`lab.g2.nps.${k}`) }))} />
          <div className="mt-3"><Range label={t('lab.g2.age')} value={npsAge} min={18} max={60} onChange={setNpsAge} format={String} /></div>
          {/* equity share by age: the bar carries the value, the figures name it */}
          <div className="mt-1 flex h-4 overflow-hidden rounded-sm bg-mist" role="img" aria-label={t('lab.g2.nps.mix', { eq: pct(lifecycleEquity(profile, npsAge)), safe: pct(1 - lifecycleEquity(profile, npsAge)) })}>
            <span className="bg-forest" style={{ width: `${lifecycleEquity(profile, npsAge) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[14px] text-ink">{t('lab.g2.nps.mix', { eq: pct(lifecycleEquity(profile, npsAge)), safe: pct(1 - lifecycleEquity(profile, npsAge)) })}<Verify fact={NPS.taperStartAge} /></p>

          <h3 className="mt-6 border-t border-line pt-4 text-[1.2rem] text-ink">{t('lab.g2.nps.exit')}</h3>
          <div className="mt-2 space-y-1">
            <Range label={t('lab.g2.nps.corpus')} value={corpus} min={500000} max={30000000} step={500000} onChange={setCorpus} format={rupeesShort} />
            <Range label={t('lab.g2.nps.lumpShare')} value={lumpShare} min={0} max={Math.round(NPS.maxLumpShare.value * 100)} step={5} onChange={setLumpShare} format={v => `${v}%`} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-4">
            <Stat label={t('lab.g2.nps.lump')} value={rupeesShort(exit.lump)} />
            <Stat label={t('lab.g2.nps.pension')} value={rupees(exit.pension)} sub={<>{t('lab.g2.nps.pensionD', { v: rupeesShort(exit.annuity), rate: pct(NPS.annuityRate.value) })}<Verify fact={NPS.annuityRate} /></>} />
          </dl>

          <h3 className="mt-6 border-t border-line pt-4 text-[1.2rem] text-ink">{t('lab.g2.nps.tax')}</h3>
          <Segmented label={t('lab.g2.nps.slab')} value={slab} onChange={setSlab} options={[['0.05', '5%'], ['0.2', '20%'], ['0.3', '30%']].map(([id, name]) => ({ id, name }))} />
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{t('lab.g2.nps.taxD', { amt: rupees(NPS.tax80CCD1B.value), saved: rupees(npsTaxSaved(NPS.tax80CCD1B.value, Number(slab))) })}</p>
          <p className="mt-1 text-[13px] text-soft">{t('lab.g2.nps.taxNote')}</p>
        </Card>
      )}

      {tab === 'apy' && (
        <Card id="apy" rules={<>
          <Rule fact={APY.minJoinAge}>{t('lab.g2.apy.r1', { min: APY.minJoinAge.value, max: APY.maxJoinAge.value })}</Rule>
          <Rule fact={APY.pensions}>{t('lab.g2.apy.r2', { lo: rupees(APY.pensions.value[0]), hi: rupees(APY.pensions.value[APY.pensions.value.length - 1]), age: APY.pensionAge.value })}</Rule>
          <Rule fact={APY.base}>{t('lab.g2.apy.r3')}</Rule>
          <Rule fact={APY.corpusPer1000}>{t('lab.g2.apy.r4')}</Rule>
        </>}>
          <div className="mt-2"><Range label={t('lab.g2.apy.join')} value={joinAge} min={APY.minJoinAge.value} max={APY.maxJoinAge.value} onChange={setJoinAge} format={String} /></div>
          <span className="label">{t('lab.g2.apy.pension')}</span>
          <Segmented label={t('lab.g2.apy.pension')} value={pension} onChange={setPension} options={APY.pensions.value.map(v => ({ id: String(v), name: `₹${v / 1000}k` }))} />
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Stat label={t('lab.g2.apy.monthly')} value={<>{rupees(a.monthly)}<Verify fact={APY.base} /></>} sub={t('lab.g2.apy.forYears', { n: a.years })} />
            <Stat label={t('lab.g2.apy.paid')} value={rupeesShort(a.paid)} />
            <Stat label={t('lab.g2.apy.get')} value={rupees(Number(pension)) + t('common.perMonth')} sub={t('lab.g2.apy.fromAge', { age: APY.pensionAge.value })} />
            <Stat label={t('lab.g2.apy.nominee')} value={<>{rupeesShort(a.nominee)}<Verify fact={APY.corpusPer1000} /></>} />
          </dl>
          {late.age > a.age && <p className="mt-4 border-t border-line pt-3 text-[15px] leading-relaxed text-ink">{t('lab.g2.apy.late', { age: late.age, amt: rupees(late.monthly), more: rupees(late.monthly - a.monthly) })}</p>}
        </Card>
      )}

      {tab === 'ppf' && (
        <Card id="ppf" rules={<>
          <Rule fact={PPF.maxYearly}>{t('lab.g2.ppf.r1', { min: rupees(PPF.minYearly.value), max: rupees(PPF.maxYearly.value) })}</Rule>
          <Rule fact={PPF.years}>{t('lab.g2.ppf.r2', { years: PPF.years.value })}</Rule>
          <Rule fact={PPF.rate}>{t('lab.g2.ppf.r3', { rate: (PPF.rate.value * 100).toFixed(1) })}</Rule>
          <Rule fact={PPF.taxFree}>{t('lab.g2.ppf.r4')}</Rule>
        </>}>
          <div className="mt-2"><Range label={t('lab.g2.ppf.yearly')} value={ppfYearly} min={PPF.minYearly.value} max={PPF.maxYearly.value} step={500} onChange={setPpfYearly} format={rupees} /></div>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Stat label={t('lab.g2.ppf.paid')} value={rupeesShort(p.paid)} sub={t('lab.g2.ppf.overYears', { n: PPF.years.value })} />
            <Stat label={t('lab.g2.ppf.value')} value={<>{rupeesShort(p.value)}<Verify fact={PPF.rate} /></>} sub={t('lab.g2.ppf.interest', { v: rupeesShort(p.interest) })} />
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-[15px] leading-relaxed text-ink">{t('lab.g2.ppf.take')}</p>
        </Card>
      )}

      {tab === 'epf' && (
        <Card id="epf" rules={<>
          <Rule fact={EPF.employeeShare}>{t('lab.g2.epf.r1', { share: pct(EPF.employeeShare.value) })}</Rule>
          <Rule fact={EPF.epsShare}>{t('lab.g2.epf.r2')}</Rule>
          <Rule fact={EPF.rate}>{t('lab.g2.epf.r3', { rate: (EPF.rate.value * 100).toFixed(2) })}</Rule>
          <Rule fact={EPF.employerShare}>{t('lab.g2.epf.r4')}</Rule>
        </>}>
          <div className="mt-2 space-y-1">
            <Range label={t('lab.g2.epf.basic')} value={basic} min={10000} max={150000} step={1000} onChange={setBasic} format={rupees} />
            <Range label={t('lab.g2.epf.years')} value={epfYears} min={1} max={40} onChange={setEpfYears} format={String} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Stat label={t('lab.g2.epf.you')} value={rupees(e.month.employee)} sub={t('lab.g2.epf.perMonth')} />
            <Stat label={t('lab.g2.epf.employer')} value={<>{rupees(e.month.employerEpf)}<Verify fact={EPF.epsShare} /></>} sub={t('lab.g2.epf.toEps', { v: rupees(e.month.eps) })} />
            <Stat label={t('lab.g2.epf.balance')} value={<>{rupeesShort(e.balance)}<Verify fact={EPF.rate} /></>} sub={t('lab.g2.epf.after', { n: epfYears })} />
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-[15px] leading-relaxed text-ink">{t('lab.g2.epf.take')} <Link to="/employer" className="underline underline-offset-4">{t('lab.g2.epf.check')}</Link></p>
        </Card>
      )}

      <Quiz />

      <details className="hud p-5 sm:p-6">
        <summary className="cursor-pointer text-[1.2rem] font-serif text-ink">{t('lab.g2.sources')}</summary>
        <p className="mt-2 text-[14px] text-soft">{t('lab.g2.sourcesD')}</p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {Object.entries(ALL_FACTS).map(([k, f]) => (
            <li key={k} className="py-2 text-[13px] leading-relaxed">
              <span className="font-mono text-ink">{k}</span>{f.verify && <Verify fact={f} />}
              <span className="block text-soft">{f.source} · {t('lab.g2.checked', { d: f.lastChecked })}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

/** Ten questions, one at a time. Finishing feeds the same XP and daily-lesson counters as a lesson. */
function Quiz() {
  const { t } = useI18n()
  const save = useLabSave()
  const questions = useMemo(buildQuiz, [])
  const [at, setAt] = useState(-1)           // -1 = not started
  const [picks, setPicks] = useState<number[]>([])
  const q = questions[at]
  const picked = picks[at]
  const right = picks.filter((p, i) => p === questions[i].answer).length
  const finished = at >= questions.length
  const label = (o: string) => (WORD_OPTIONS.has(o) ? t(`lab.qo.${o}`) : o)

  const next = () => {
    if (at === questions.length - 1) {
      const score = Math.round((right / questions.length) * 100)
      void save('schemes', score, 'quiz_done', questions.filter((x, i) => picks[i] !== x.answer).map(x => x.id).slice(0, 8)).then(r => {
        // count it toward today's lesson quests, like any other lesson
        recordLesson({ accuracy: score, xp: r?.xp_earned ?? 0 })
      })
    }
    setAt(a => a + 1)
  }

  return (
    <section aria-labelledby="quiz" className="hud p-5 sm:p-7">
      <Label>{t('lab.q.k')}</Label>
      <h2 id="quiz" className="mt-1.5 text-[1.6rem] leading-tight text-ink">{t('lab.q.title')}</h2>
      {at === -1 && (
        <>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-soft">{t('lab.q.sub', { n: questions.length })}</p>
          <button className="btn mt-4" onClick={() => setAt(0)}>{t('lab.q.start')}</button>
        </>
      )}
      {q && (
        <div className="mt-3">
          <div className="flex gap-1" role="progressbar" aria-valuenow={at + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-label={t('lab.q.progress', { n: at + 1, total: questions.length })}>
            {questions.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-sm ${i <= at ? 'bg-forest' : 'bg-line'}`} />)}
          </div>
          <p id="quiz-q" className="mt-4 text-[1.2rem] leading-snug text-ink">{t(`lab.q.${q.id}`, q.vars)}</p>
          <div role="radiogroup" aria-labelledby="quiz-q" className="mt-3 space-y-2">
            {q.options.map((o, i) => {
              const isRight = picked !== undefined && i === q.answer, isWrong = picked === i && i !== q.answer
              return (
                <button key={o} role="radio" aria-checked={picked === i} disabled={picked !== undefined}
                  onClick={() => setPicks(ps => { const n = [...ps]; n[at] = i; return n })}
                  className={`row py-3 ${isRight ? '!border-forest !bg-haze' : ''} ${isWrong ? '!border-rust nudge' : ''} ${picked !== undefined && !isRight && !isWrong ? 'opacity-60' : ''}`}>
                  <span className="flex-1 text-[16px] text-ink">{label(o)}</span>
                  {isRight && <Check size={18} strokeWidth={2} className="text-forest" aria-label={t('lab.nr.right')} />}
                  {isWrong && <X size={18} strokeWidth={2} className="text-rust" aria-label={t('lab.nr.wrong')} />}
                </button>
              )
            })}
          </div>
          {picked !== undefined && (
            <div role="status" className="mt-4">
              <p className="text-[15px] leading-relaxed text-ink"><span className="font-medium">{t(picked === q.answer ? 'lab.nr.right' : 'lab.nr.wrong')}.</span> {t(`lab.q.${q.id}.x`, q.vars)}
                {q.facts.some(f => ALL_FACTS[f].verify) && <Verify fact={ALL_FACTS[q.facts.find(f => ALL_FACTS[f].verify)!]} />}</p>
              <button className="btn mt-4" onClick={next} autoFocus>{t(at === questions.length - 1 ? 'lab.q.finish' : 'q.next')}</button>
            </div>
          )}
        </div>
      )}
      {finished && (
        <div role="status" className="mt-3">
          <p className="font-serif text-[2rem] leading-none text-ink">{t('lab.nr.score', { n: right, total: questions.length })}</p>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-soft">{t('lab.q.done')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/tracker" className="btn">{t('lab.f.toPlan')}</Link>
            <button className="link" onClick={() => { setPicks([]); setAt(0) }}>{t('lab.q.again')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
