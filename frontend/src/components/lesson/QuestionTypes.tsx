import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from '../ui/icons'
import { Range } from '../ui/kit'
import { api } from '../../lib/api'
import { rupeesShort } from '../../lib/format'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'
import { monthlyIncome } from '../../lib/game'
import type { LocalQ } from '../../lib/questions'
import { play } from '../../lib/sound'

export type Answer = boolean | number | number[] | Record<number, number> | string | null

/** Deterministic shuffle, so the order is stable for a question. */
const shuffle = <X,>(a: X[], seed: string) => {
  let h = [...seed].reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7)
  return a.map((v, i) => ({ v, i, k: ((h = (h * 1103515245 + 12345) | 0) >>> 0) })).sort((x, y) => x.k - y.k).map(x => x.i)
}

export function isReady(q: LocalQ, a: Answer) {
  if (q.type === 'match') return a !== null && Object.keys(a as object).length === q.pairs.length
  if (q.type === 'order') return Array.isArray(a) && a.length === q.steps.length
  return a !== null
}

export function isCorrect(q: LocalQ, a: Answer, planBest?: 'a' | 'b') {
  switch (q.type) {
    case 'tf': return a === q.answer
    case 'match': return Object.entries(a as Record<number, number>).every(([l, r]) => +l === r)
    case 'order': return (a as number[]).every((v, i) => v === i)
    case 'slider': return Math.abs((a as number) - q.answer) <= q.tolerance
    case 'spot': return a === q.wrong
    case 'plan': return a === planBest
  }
}

/** The correct answer as text, for the feedback sheet. */
export function answerText(q: LocalQ, lang: 'en' | 'hi' | 'mr', yes: string, no: string, planBest?: 'a' | 'b') {
  switch (q.type) {
    case 'tf': return q.answer ? yes : no
    case 'match': return q.pairs.map(([l, r]) => `${l[lang]} → ${r[lang]}`).join(' · ')
    case 'order': return q.steps.map((s, i) => `${i + 1}. ${s[lang]}`).join('  ')
    case 'slider': return q.unit === '₹' ? `₹ ${q.answer.toLocaleString('en-IN')}` : `${q.answer}${q.unit}`
    case 'spot': return q.lines[q.wrong][lang]
    case 'plan': return planBest === 'a' ? 'A' : 'B'
  }
}

export function LocalQuestion({ q, value, onChange, locked, onPlanBest }: {
  q: LocalQ; value: Answer; onChange: (a: Answer) => void; locked: boolean; onPlanBest: (b: 'a' | 'b') => void
}) {
  const { t, lang } = useI18n()
  const pick = (a: Answer) => { if (!locked) { onChange(a); play('tick') } }

  if (q.type === 'tf') return <TrueFalse q={q} value={value as boolean | null} pick={pick} locked={locked} />

  if (q.type === 'match') return <MatchQ q={q} value={value} pick={pick} locked={locked} />

  if (q.type === 'order') return <OrderQ q={q} value={value} pick={pick} locked={locked} />

  if (q.type === 'slider') {
    const v = (value as number | null) ?? q.min
    const fmt = (n: number) => (q.unit === '₹' ? `₹ ${n.toLocaleString('en-IN')}` : `${n}${q.unit}`)
    return (
      <div>
        <Prompt>{q.prompt[lang]}</Prompt>
        <div className="hud mt-8 p-6"><Range label={t('qt.yourAnswer')} value={v} min={q.min} max={q.max} step={q.step} onChange={n => pick(n)} format={fmt} /></div>
      </div>
    )
  }

  if (q.type === 'spot') return (
    <div>
      <Prompt>{q.prompt[lang]}</Prompt>
      <div role="radiogroup" className="mt-6 space-y-2.5">{q.lines.map((l, i) => (
        <button key={i} role="radio" aria-checked={value === i} disabled={locked} onClick={() => pick(i)} className="row !min-h-[58px] font-serif text-[17px]"><span className="py-3">{l[lang]}</span></button>
      ))}</div>
    </div>
  )

  return <PlanQ q={q} value={value as 'a' | 'b' | null} pick={pick} locked={locked} onBest={onPlanBest} />
}

function TrueFalse({ q, value, pick, locked }: { q: Extract<LocalQ, { type: 'tf' }>; value: boolean | null; pick: (a: Answer) => void; locked: boolean }) {
  const { t, lang } = useI18n()
  const start = useRef<number | null>(null)
  const [dx, setDx] = useState(0)
  return (
    <div>
      <Prompt>{t('qt.tf')}</Prompt>
      {/* swipe right for true, left for false; the buttons do the same */}
      <div className="hud mt-6 touch-pan-y select-none p-7 text-center font-serif text-2xl leading-snug text-ink transition-transform"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)` }}
        onPointerDown={e => { if (!locked) start.current = e.clientX }}
        onPointerMove={e => { if (start.current !== null) setDx(e.clientX - start.current) }}
        onPointerUp={() => { if (Math.abs(dx) > 80) pick(dx > 0); start.current = null; setDx(0) }}
        onPointerCancel={() => { start.current = null; setDx(0) }}>
        {q.statement[lang]}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button disabled={locked} aria-pressed={value === false} onClick={() => pick(false)} className="row !min-h-[56px] justify-center gap-2"><X size={18} aria-hidden />{t('qt.false')}</button>
        <button disabled={locked} aria-pressed={value === true} onClick={() => pick(true)} className="row !min-h-[56px] justify-center gap-2"><Check size={18} aria-hidden />{t('qt.true')}</button>
      </div>
      <p className="label mt-3 text-center">{t('qt.swipe')}</p>
    </div>
  )
}

/** Two plans, both run through the calculator API. */
function PlanQ({ q, value, pick, locked, onBest }: { q: Extract<LocalQ, { type: 'plan' }>; value: 'a' | 'b' | null; pick: (a: Answer) => void; locked: boolean; onBest: (b: 'a' | 'b') => void }) {
  const { t, lang } = useI18n()
  const { user } = useSession()
  const [res, setRes] = useState<{ a: number; b: number } | null>(null)
  useEffect(() => {
    const base = { current_age: q.age, retirement_age: 60, annual_return_pct: 10, risk_profile: 'moderate', annual_income: monthlyIncome(user?.income_range) * 12 }
    Promise.all([api.simulate({ ...base, monthly_contribution: q.a }), api.simulate({ ...base, monthly_contribution: q.b })])
      .then(([a, b]) => { setRes({ a: a.projected_corpus, b: b.projected_corpus }); onBest(a.projected_corpus >= b.projected_corpus ? 'a' : 'b') })
      .catch(() => {})
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <Prompt>{q.prompt[lang]}</Prompt>
      <div role="radiogroup" className="mt-6 grid grid-cols-2 gap-3">
        {(['a', 'b'] as const).map(k => (
          <button key={k} role="radio" aria-checked={value === k} disabled={locked || !res} onClick={() => pick(k)} className="row !min-h-[150px] flex-col !items-start justify-center gap-1 !p-5">
            <span className="label">{t('qt.plan')} {k.toUpperCase()} · {t('common.years')} {60 - q.age}</span>
            <span className="num text-2xl text-ink">₹ {q[k].toLocaleString('en-IN')}{t('common.perMonth')}</span>
            {/* the corpus is revealed after checking, so the choice is the player's reasoning */}
            <span className="label">{locked && res ? `${t('sim.corpus')}: ${rupeesShort(res[k])}` : t('qt.calc')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const Prompt = ({ children }: { children: React.ReactNode }) => <h1 className="text-[clamp(1.5rem,4vw,2rem)] leading-tight text-ink">{children}</h1>
const Badge = ({ n }: { n: number }) => <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-sm text-on-forest">{n + 1}</span>

function MatchQ({ q, value, pick, locked }: { q: Extract<LocalQ, { type: 'match' }>; value: Answer; pick: (a: Answer) => void; locked: boolean }) {
  const { t, lang } = useI18n()
    const right = useMemo(() => shuffle(q.pairs, q.id), [q])
    const m = (value ?? {}) as Record<number, number>
    const [sel, setSel] = useState<number | null>(null)
    const pairedR = new Set(Object.values(m))
    return (
      <div>
        <Prompt>{q.prompt[lang]}</Prompt>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="space-y-2.5">{q.pairs.map(([l], i) => (
            <button key={i} disabled={locked} aria-pressed={sel === i || i in m} onClick={() => {
              if (i in m) { const n = { ...m }; delete n[i]; pick(Object.keys(n).length ? n : null) } else setSel(i)
            }} className={`row !min-h-[56px] ${sel === i ? '!border-amber' : ''}`}>
              {i in m && <Badge n={i} />}<span className="py-2">{l[lang]}</span>
            </button>))}
          </div>
          <div className="space-y-2.5">{right.map(r => {
            const left = Object.entries(m).find(([, v]) => v === r)?.[0]
            return (
              <button key={r} disabled={locked || pairedR.has(r) || sel === null} aria-pressed={pairedR.has(r)}
                onClick={() => { if (sel !== null) { pick({ ...m, [sel]: r }); setSel(null) } }}
                className="row !min-h-[56px] disabled:cursor-default">
                {left !== undefined && <Badge n={+left} />}<span className="py-2">{q.pairs[r][1][lang]}</span>
              </button>)
          })}</div>
        </div>
        <p className="label mt-3">{t('qt.matchHint')}</p>
      </div>
    )
}

function OrderQ({ q, value, pick, locked }: { q: Extract<LocalQ, { type: 'order' }>; value: Answer; pick: (a: Answer) => void; locked: boolean }) {
  const { t, lang } = useI18n()
    const pool = useMemo(() => shuffle(q.steps, q.id), [q])
    const seq = (value ?? []) as number[]
    return (
      <div>
        <Prompt>{q.prompt[lang]}</Prompt>
        <ol className="mt-6 min-h-[64px] space-y-2 rounded-md border border-dashed border-line p-2" aria-label={t('qt.yourOrder')}>
          {seq.map((s, i) => (
            <li key={s}><button disabled={locked} className="row !min-h-[48px] !bg-haze" onClick={() => pick(seq.length > 1 ? seq.filter(x => x !== s) : null)}>
              <span className="num w-6 text-lg">{i + 1}</span><span className="py-2">{q.steps[s][lang]}</span></button></li>
          ))}
          {!seq.length && <li className="label p-3">{t('qt.orderHint')}</li>}
        </ol>
        <div className="mt-3 space-y-2">{pool.filter(s => !seq.includes(s)).map(s => (
          <button key={s} disabled={locked} className="row !min-h-[48px]" onClick={() => pick([...seq, s])}><span className="py-2">{q.steps[s][lang]}</span></button>
        ))}</div>
      </div>
    )
}
