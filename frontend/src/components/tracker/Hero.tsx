import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Info, Plus } from '../ui/icons'
import { Label, StateChip } from '../ui/kit'
import CountUp, { useTween } from '../../ui/CountUp'
import { spring } from '../../ui/motion'
import { useI18n } from '../../lib/i18n'
import { rupeesShort } from '../../lib/format'
import { VAULT_TITLES, vaultTitle } from '../../lib/vaultTitles'
import type { Readiness } from '../../lib/readiness'
import { Character, type CharState } from '../../game/character/Character'
import { getLook } from '../../game/character/roster'
import Monument from './Monument'
import { tc } from './strings'

const MOOD: Record<Readiness['grade'], CharState> = { zero: 'idle', critical: 'tired', struggling: 'walk', stable: 'celebrate', thriving: 'celebrate' }

/** Tracker hero: segmented score ring, mood-matched Future You, honest stat chips and the pillar monument. */
export default function Hero({ r, stats, age, started, hasAssets, onAct, onAsk, onStart }: {
  r: Readiness; stats: { now: number; future: number; real: number }; age: number; started: boolean; hasAssets: boolean
  onAct: (k: Readiness['parts'][number]['key']) => void; onAsk: (k: Readiness['parts'][number]['key']) => void; onStart: (step: 1 | 2 | 3) => void
}) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const next = [...VAULT_TITLES].reverse().find(b => b.min > r.score)
  const chips: [string, number, string, boolean][] = [[t('tr.now'), stats.now, 'i_now', started], [t('tr.at', { age }), stats.future, 'i_at', hasAssets], [t('tr.real'), stats.real, 'i_real', hasAssets]]
  return (
    <section className="band p-6 sm:p-9" aria-labelledby="hero-h">
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col items-center">
          {started ? <Ring r={r} open={open} onTap={() => setOpen(!open)} /> : <span aria-hidden className="grid h-[176px] w-[176px] place-items-center rounded-full border-2 border-dashed border-ink/25 font-serif text-4xl text-ink/50">?</span>}
          {started && <p className="label mt-2 text-center">{next ? tc('toNext', lang, { n: next.min - r.score, b: t(`vt.${next.key}`) }) : tc('top', lang)}</p>}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3"><Label>{started ? t(`vt.${vaultTitle(r.score)}`) : t('tr.score')}</Label>{started && <StateChip state={r.grade} />}</div>
          <div className="mt-2 flex items-end gap-3">
            <h1 id="hero-h" className="min-w-0 flex-1 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.08]">{started ? t(`tr.g.${r.grade}`, { age }) : t('tr.waiting')}</h1>
            <span className="shrink-0"><Character state={started ? MOOD[r.grade] : 'idle'} look={getLook()} size={70} /></span>
          </div>
          {started ? (
            <dl className="mt-5 grid gap-2 sm:grid-cols-3">
              {chips.map(([k, v, info, known]) => (
                <div key={k} className="tile group relative px-3 py-3 transition-transform hover:-translate-y-0.5">
                  <dt className="label flex items-start justify-between gap-1 leading-snug">{k}
                    <button className="tip-host -m-2 grid h-8 w-8 shrink-0 place-items-center rounded text-ink/60 hover:text-ink focus-visible:text-ink" aria-label={`${tc('info', lang)}: ${k}`}><Info size={14} />
                      <span role="tooltip" className="tip pointer-events-none absolute left-0 right-0 top-full z-20 mt-1 rounded-md bg-[#000000] p-2.5 text-left text-[13px] normal-case tracking-normal text-ink opacity-0 shadow-lg transition-opacity">{tc(info, lang)}</span></button></dt>
                  <dd className="mt-1">{known ? <span className="num text-[clamp(1.2rem,2vw,1.6rem)] leading-none"><CountUp value={v} format={rupeesShort} /></span>
                    : <span className="mt-1 inline-block rounded border border-dashed border-ink/35 px-2 py-1 text-[13px] text-ink/70">{tc('addHold', lang)}</span>}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-5 rounded-xl border border-ink/15 bg-ink/5 p-4">
              <Label>{tc('startT', lang)}</Label>
              <ol className="mt-2 space-y-2">{([1, 2, 3] as const).map(n => (
                <li key={n}><button onClick={() => onStart(n)} className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-2 text-left transition-transform hover:translate-x-1 hover:bg-ink/5 focus-visible:bg-ink/10 active:scale-[0.99]">
                  <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[#0A0A0A]">{n}</span><span className="flex-1 text-[15px]">{tc(`s${n}`, lang)}</span><Plus size={16} aria-hidden /></button></li>
              ))}</ol>
            </div>
          )}
        </div>
        {started && <div className="lg:col-span-2 xl:col-span-1"><Monument parts={r.parts} onAct={onAct} onAsk={onAsk} /></div>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <m.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring} className="relative z-10 mt-6 grid gap-x-8 gap-y-2 border-t border-ink/15 pt-4 md:grid-cols-2" aria-label={t('tr.how')}>
            {r.parts.map(p => (
              <li key={p.key}><button onClick={() => onAct(p.key)} className="flex w-full items-baseline justify-between gap-4 rounded px-2 py-1.5 text-left hover:bg-ink/5 focus-visible:bg-ink/10">
                <span><span className="label block">{t(`tr.p.${p.key}`)}</span><span className="text-[15px] text-ink/85">{t(`tr.d.${p.key}`, p.vars)}</span></span>
                <span className="num shrink-0 text-lg">{p.got.toFixed(1)}<span className="label"> / {p.max}</span></span></button></li>
            ))}
            <li className="label md:col-span-2">{tc('note', lang)}</li>
          </m.ul>
        )}
      </AnimatePresence>
    </section>
  )
}

/** Score ring split into one arc per pillar (arc length = the pillar's max). Tap to open the breakdown. */
function Ring({ r, open, onTap }: { r: Readiness; open: boolean; onTap: () => void }) {
  const { t, lang } = useI18n()
  const v = useTween(r.score, 900), R = 44, C = 2 * Math.PI * R, gap = 2
  let at = 0
  return (
    <button onClick={onTap} aria-expanded={open} aria-label={`${t('tr.score')} ${r.score} / 100. ${tc(open ? 'ringClose' : 'ringTap', lang)}`} className="group relative h-[176px] w-[176px] rounded-full transition-transform hover:scale-[1.03] active:scale-[0.98]">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        {r.parts.map((p, i) => {
          const len = (p.max / 100) * C - gap, start = at; at += (p.max / 100) * C
          return (
            <g key={p.key}>
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="8" strokeDasharray={`${len} ${C}`} strokeDashoffset={-start} />
              <m.circle cx="50" cy="50" r={R} fill="none" stroke={i % 2 ? '#E9A866' : '#FFFFFF'} strokeWidth="8" strokeDasharray={`${Math.max(len * (p.got / p.max), 0.01)} ${C}`} strokeDashoffset={-start}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.08 }} />
            </g>
          )
        })}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center"><span><span className="num block text-[60px] leading-none text-ink" aria-live="polite">{Math.round(v)}</span><span className="label">/ 100</span></span></span>
    </button>
  )
}
