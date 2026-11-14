import { useState } from 'react'
import { m } from 'framer-motion'
import { gt } from '../../strings'
import type { EngineProps, L } from '../../types'
import { api } from '../../../lib/api'
import { rupeesShort } from '../../../lib/format'
import CountUp from '../../../ui/CountUp'
import { spring } from '../../../ui/motion'
import { play } from '../../../lib/sound'
import { Character } from '../../character/Character'
import { getLook } from '../../character/roster'
import { buzz } from '../kit'

interface Opt { label: L; outcome: L; rate: number | null; age?: number; stars: 1 | 2 | 3 }
const COL = ['#C4673A', '#D9A441', '#4F8A5B']

/** Decision scene: pick a path, watch a short comic outcome, then compare every path with figures from the calculator API. */
export default function Fork({ config, lang, reducedMotion: calm, onComplete }: EngineProps) {
  const p = config.params as { q: L; monthly: number; startAge: number; retireAge: number; options: Opt[]; facts?: L[] }
  const [pick, setPick] = useState<number | null>(null)
  const [vals, setVals] = useState<number[] | null>(null)
  const [err, setErr] = useState(false)
  async function choose(i: number) {
    if (pick !== null) return
    setPick(i); play('tick'); buzz(15); setErr(false)
    try {
      const out = await Promise.all(p.options.map(o => o.rate === null ? Promise.resolve(0)
        : api.simulate({ current_age: o.age ?? p.startAge, retirement_age: p.retireAge, monthly_contribution: p.monthly, annual_return_pct: o.rate, risk_profile: 'moderate', annual_income: 0 }).then(r => r.projected_corpus)))
      setVals(out); play(p.options[i].stars === 3 ? 'good' : 'tick')
    } catch { setErr(true) }
  }
  const max = vals ? Math.max(...vals, 1) : 1, o = pick !== null ? p.options[pick] : null
  return (
    <div className="h-full overflow-y-auto px-5 py-6">
      <div className="mx-auto max-w-[760px]">
        <h1 className="text-center text-[clamp(1.5rem,4vw,2.3rem)] leading-tight text-ink">{p.q[lang].replace('{m}', p.monthly.toLocaleString('en-IN'))}</h1>
        {p.facts && <ul className="mx-auto mt-4 max-w-xl space-y-1.5">{p.facts.map((f, k) => <li key={k} className="rounded-md bg-haze px-3 py-2 text-[15px] text-ink">{f[lang]}</li>)}</ul>}
        <div className={`mt-6 grid gap-3 ${p.options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {p.options.map((op, i) => (
            <m.button key={i} disabled={pick !== null} onClick={() => choose(i)} aria-pressed={pick === i} whileHover={calm || pick !== null ? undefined : { y: -4 }}
              className={`hud flex min-h-[120px] flex-col items-start p-4 text-left ${pick === i ? '!border-forest' : ''} ${pick !== null && pick !== i ? 'opacity-60' : ''}`}>
              <span className="h-1.5 w-10 rounded-full" style={{ background: COL[i % 3] }} />
              <span className="mt-2 font-serif text-[1.25rem] leading-snug text-ink">{op.label[lang]}</span>
              <span className="num mt-auto pt-3 text-[clamp(1.1rem,2.6vw,1.5rem)] text-ink">{vals ? <CountUp value={vals[i]} format={rupeesShort} /> : ''}</span>
              {vals && <span className="mt-1 h-2 w-full overflow-hidden rounded bg-mist"><m.span className="block h-full origin-left" style={{ background: COL[i % 3] }} initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(vals[i] / max, 0.02) }} transition={{ ...spring, delay: 0.2 + i * 0.12 }} /></span>}
            </m.button>
          ))}
        </div>
        {o && (
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="hud mt-5 flex items-center gap-4 p-4">
            <Character state={o.stars === 3 ? 'celebrate' : o.stars === 2 ? 'idle' : 'tired'} look={getLook()} size={64} />
            <p className="font-serif text-[1.2rem] leading-snug text-ink">{o.outcome[lang]}</p>
          </m.div>
        )}
        <p className="label mt-4 min-h-[1.5em] text-center" aria-live="polite">{err ? gt('calcOff', lang) : vals ? gt('fk_src', lang, { a: p.retireAge }) : pick !== null ? gt('wait', lang) : ''}</p>
        {err && <button className="row mx-auto mt-2" onClick={() => { const i = pick!; setPick(null); setTimeout(() => choose(i)) }}>{gt('retry', lang)}</button>}
        {o && (vals || err) && <button autoFocus className="btn game-btn mx-auto mt-4 flex min-w-[200px]" onClick={() => onComplete({ stars: o.stars, coins: o.stars * 5, score: vals?.[pick!] ?? 0, detail: vals ? gt('r_fork', lang, { c: rupeesShort(vals[pick!]), b: rupeesShort(max) }) : gt('calcOff', lang) })}>{gt('next', lang)}</button>}
      </div>
    </div>
  )
}
