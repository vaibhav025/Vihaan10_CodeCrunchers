import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { Calculator, Gift, Lock, Package, RotateCcw, Star } from '../../components/ui/icons'
import { Label } from '../../components/ui/kit'
import CountUp from '../../ui/CountUp'
import { spring } from '../../ui/motion'
import type { Lang } from '../../lib/i18n'
import { play } from '../../lib/sound'
import { prefersLessMotion } from '../../lib/motionPref'
import { COMING, lessonOf } from '../content'
import { gt } from '../strings'
import { buzz } from '../stages/kit'
import type { Lesson, StageDef, StageResult } from '../types'

export interface Res extends StageResult { total: number; doubled: boolean; xp: number }

/** Shared results flow for every engine: stars, coins and XP, the insight, a Mistake Museum line, Go deeper and Try with your numbers. */
export function Results({ stage, lang, res, box, onNext, onReplay, onTry }: { stage: StageDef; lang: Lang; res: Res; box: 'chest' | 'mega' | null; onNext: () => void; onReplay: () => void; onTry: () => void }) {
  const { insight, deep } = lessonOf(stage)
  useEffect(() => { play('level') }, [])
  return (
    <div className="h-full overflow-y-auto px-5 py-6">
      <div className="mx-auto w-full max-w-lg text-center" role="status">
        <Label>{gt(res.skipped ? 'skipped' : 'cleared', lang)}</Label>
        <div className="mt-4 flex justify-center gap-3" role="img" aria-label={`${res.stars} / 3`}>
          {[1, 2, 3].map(k => <m.span key={k} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.2 + k * 0.25 }}><Star size={48} strokeWidth={1.4} className={k <= res.stars ? 'fill-amber text-amber drop-shadow-[0_0_12px_rgba(242,181,68,0.7)]' : 'text-line'} /></m.span>)}
        </div>
        <p className="mt-4 text-[16px] text-soft">{res.detail}</p>
        {insight && <m.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-3 font-serif text-[clamp(1.4rem,4vw,2rem)] leading-snug text-ink">{insight[lang]}</m.p>}
        <p className="num mt-4 text-[2rem] leading-none text-ink">+<CountUp value={res.total} /> <span className="label">{gt('coins', lang)}{res.doubled ? ' ×2' : ''}</span>{res.xp > 0 && <> · +<CountUp value={res.xp} /> <span className="label">XP</span></>}</p>
        {res.stars < 3 && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-4 rounded-lg border border-dashed border-line px-4 py-3 text-left">
            <Label>{gt('mm', lang)}</Label><p className="mt-1 text-[15px] italic text-ink">{gt(`mm_${stage.engine}`, lang)}</p>
          </m.div>
        )}
        {deep && deep.steps.length > 0 && <DeepDive deep={deep} lang={lang} />}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button autoFocus className="btn game-btn min-w-[200px] gap-2" onClick={onNext}>{box ? <>{box === 'mega' ? <Gift size={18} /> : <Package size={18} />}{gt('open', lang)}</> : gt('cont', lang)}</button>
          <button className="row !min-h-[48px] gap-1.5" onClick={onReplay}><RotateCcw size={15} />{gt('replay', lang)}</button>
          <button className="row !min-h-[48px] gap-1.5" onClick={onTry}><Calculator size={15} />{gt('tryNums', lang)}</button>
        </div>
        <p className="label mt-5">{gt('note', lang)}</p>
      </div>
    </div>
  )
}

/** Go deeper: a 20-second explainer in three timed steps, then a worked example. */
function DeepDive({ deep, lang }: { deep: Lesson; lang: Lang }) {
  const calm = prefersLessMotion()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  useEffect(() => { if (!open || calm || i >= deep.steps.length - 1) return; const t = setTimeout(() => setI(i + 1), 6500); return () => clearTimeout(t) }, [open, i, calm, deep.steps.length])
  if (!open) return <button className="hud mt-4 flex w-full items-center justify-between p-4 text-left hover:border-forest" onClick={() => setOpen(true)}><span className="font-serif text-[18px] text-ink">{gt('deep', lang)}</span><span className="label">20 s</span></button>
  const shown = calm ? deep.steps : [deep.steps[i]]
  return (
    <div className="hud mt-4 p-4 text-left">
      <Label>{gt('deep', lang)}</Label>
      {!calm && <div className="mt-2 flex gap-1.5" aria-hidden>{deep.steps.map((_, k) => <span key={k} className="h-1 flex-1 overflow-hidden rounded bg-mist"><m.span className="block h-full origin-left bg-forest" initial={{ scaleX: k < i ? 1 : 0 }} animate={{ scaleX: k <= i ? 1 : 0 }} transition={{ duration: k === i ? 6.5 : 0, ease: 'linear' }} /></span>)}</div>}
      {shown.map((s, k) => <m.p key={calm ? k : i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 font-serif text-[20px] leading-snug text-ink">{s[lang]}</m.p>)}
      {(calm || i === deep.steps.length - 1) && deep.example[lang] && <div className="mt-3 rounded-md bg-haze px-3 py-2.5"><Label>{gt('ex', lang)}</Label><p className="num mt-1 text-[15px] text-ink">{deep.example[lang]}</p></div>}
      {deep.sourceUrl && <a href={deep.sourceUrl} target="_blank" rel="noreferrer" className="label mt-3 block underline underline-offset-4">{gt('src', lang, { d: deep.lastReviewed ?? '' })}</a>}
    </div>
  )
}

/** Chest and Mega Box: contents shown first, then shake, crack, reveal, collect. Contents are fixed in economy.ts. */
export function LootBox({ mega, lines, lang, onDone }: { mega: boolean; lines: string[]; lang: Lang; onDone: () => void }) {
  const calm = prefersLessMotion()
  const [step, setStep] = useState(0) // 0 shake, 1 crack, 2 reveal, 3 collect
  const open = () => { setStep(1); play('good'); buzz([20, 60, 40]); setTimeout(() => { setStep(2); play('level') }, calm ? 0 : 750) }
  const collect = () => { setStep(3); play('coin'); setTimeout(onDone, calm ? 0 : 900) }
  const Icon = mega ? Gift : Package
  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-[linear-gradient(135deg,#0E0E10,#000000)] px-5 py-6 text-[#FFFFFF]">
      <div className="text-center" role="status">
        <p className="label !text-[#F2B544]">{gt(mega ? 'mega' : 'chest', lang)}</p>
        <div className="relative mx-auto mt-4 h-44 w-44">
          <m.button aria-label={gt('open', lang)} disabled={step > 0} onClick={open}
            animate={calm ? {} : step === 0 ? { rotate: [0, -6, 6, -6, 0] } : step === 1 ? { scale: [1, 1.15, 0.92, 1.12] } : { scale: 1.05, y: step === 3 ? 30 : 0, opacity: step === 3 ? 0 : 1 }}
            transition={step === 0 ? { duration: 0.8, repeat: Infinity, repeatDelay: 0.5 } : { duration: 0.7 }}
            className={`grid h-full w-full place-items-center rounded-3xl text-[#0A0A0A] ${mega ? 'bg-[#F2B544] shadow-[0_10px_0_#B97A35,0_0_90px_rgba(242,181,68,0.6)]' : 'bg-[#F2B544] shadow-[0_10px_0_#A8812F,0_0_60px_rgba(242,181,68,0.4)]'}`}>
            <Icon size={78} strokeWidth={1.2} />
          </m.button>
          {step >= 1 && <m.svg viewBox="0 0 176 176" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: step === 3 ? 0 : 1 }} aria-hidden><path d="M88 6l-10 40 18 16-14 30 12 22M30 70l26 10 4 22M146 60l-24 18 6 26" stroke="#5E3A12" strokeWidth="4" fill="none" strokeLinecap="round" /></m.svg>}
        </div>
        <p className="mt-5 font-serif text-2xl">{gt(step === 0 ? 'inside' : 'loot', lang)}</p>
        <ul className="mt-3 space-y-2">
          {lines.map((l, k) => <m.li key={l} initial={false} animate={step === 3 ? { opacity: 0, y: -50 } : { opacity: step >= 2 ? 1 : 0.55, y: 0, scale: step === 2 ? [0.9, 1.06, 1] : 1 }} transition={{ ...spring, delay: step >= 2 ? k * 0.15 : 0 }} className="tile mx-auto w-fit px-5 py-2.5 text-[17px]">{l}</m.li>)}
        </ul>
        {step === 0 && <button autoFocus className="btn game-btn mt-6 min-w-[200px] !bg-[#FFFFFF] !text-[#0A0A0A]" onClick={open}>{gt('open', lang)}</button>}
        {step === 2 && <button autoFocus className="btn game-btn mt-6 min-w-[200px] !bg-[#FFFFFF] !text-[#0A0A0A]" onClick={collect}>{gt('collect', lang)}</button>}
      </div>
    </div>
  )
}

/** After stage 10: a short world-complete moment, then the next world as a locked preview. */
export function WorldDone({ world, lang, onDone }: { world: number; lang: Lang; onDone: () => void }) {
  const next = COMING.find(c => c.id === world + 1)
  useEffect(() => { play('level'); buzz([30, 50, 30, 50, 80]) }, [])
  return (
    <div className="grid h-full place-items-center bg-[linear-gradient(160deg,#0E0E10,#000000)] px-5 text-center text-[#FFFFFF]">
      <div role="status">
        <m.div className="flex justify-center gap-2" initial="a" animate="b">{[0, 1, 2, 3, 4].map(k => <m.span key={k} variants={{ a: { scale: 0, y: 20 }, b: { scale: 1, y: 0 } }} transition={{ ...spring, delay: k * 0.12 }}><Star size={k === 2 ? 46 : 30} className="fill-[#F2B544] text-[#F2B544]" /></m.span>)}</m.div>
        <m.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-5 font-serif text-[clamp(2rem,6vw,3.2rem)] leading-tight">{gt('w_done', lang, { n: world })}</m.h2>
        {next && (
          <m.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, ...spring }} className="mx-auto mt-7 w-[min(320px,100%)] rounded-2xl border border-white/15 bg-white/5 p-5">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/10 blur-[0.5px]"><Lock size={30} className="text-white/70" /></div>
            <p className="label mt-3 !text-[#F2B544]">{gt('w_next', lang, { n: next.id })}</p>
            <p className="mt-1 font-serif text-2xl text-white/80">{next.name[lang]}</p>
            <p className="label mt-1 !text-white/60">{gt('soon', lang)}</p>
          </m.div>
        )}
        <m.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} autoFocus className="btn game-btn mt-7 min-w-[200px] !bg-[#FFFFFF] !text-[#0A0A0A]" onClick={onDone}>{gt('cont', lang)}</m.button>
      </div>
    </div>
  )
}
