import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Check, ChevronRight, Lightbulb, Lock, X } from '../ui/icons'
import { Label } from '../ui/kit'
import CountUp from '../../ui/CountUp'
import { spring } from '../../ui/motion'
import { useI18n } from '../../lib/i18n'
import { rupees, rupeesShort } from '../../lib/format'
import { setMoney, totals, TYPES, type AssetType, type Money } from '../../lib/tracker'
import { readiness, type Part, type Readiness } from '../../lib/readiness'
import { recordLesson } from '../../lib/meta'
import { play } from '../../lib/sound'
import { tc } from './strings'

type K = Part['key']
const ORDER: K[] = ['funding', 'saving', 'emergency', 'protection', 'debt', 'spread']
const gainOf = (r: Readiness) => [...r.parts].filter(p => p.max - p.got >= 0.5).sort((a, b) => (b.max - b.got) - (a.max - a.got))

/** What a sheet value does to the money model. Pure, so the preview and the confirm use the same change. */
function apply(m0: Money, k: K, v: number, kind: AssetType, cover: { health: boolean; term: boolean }): Partial<Money> {
  const at = Date.now()
  if (k === 'funding' || k === 'saving') { const plan = m0.assets.find(a => a.id === 'plan'); return { assets: [...m0.assets.filter(a => a.id !== 'plan'), { id: 'plan', type: 'mf', value: plan?.value ?? 0, monthly: v, name: plan?.name, at } as Money['assets'][number]] } }
  if (k === 'emergency') { const ef = m0.assets.find(a => a.id === 'ef'); return { assets: [...m0.assets.filter(a => a.id !== 'ef'), { id: 'ef', type: 'cash', value: (ef?.value ?? 0) + v, monthly: ef?.monthly ?? 0, at } as Money['assets'][number]] } }
  if (k === 'debt') return { emi: v }
  if (k === 'protection') return cover
  return { assets: [...m0.assets, { id: 'a' + at, type: kind, value: v, monthly: 0, at } as Money['assets'][number]] }
}

/** Bottom sheet for one move: slider, presets and a live preview of the pillar and score before you confirm. */
export function ActionSheet({ k, money, years, start, onClose, onDone }: { k: K; money: Money; years: number; start?: number; onClose: () => void; onDone: (delta: number) => void }) {
  const { t, lang } = useI18n()
  const plan = money.assets.find(a => a.id === 'plan')?.monthly ?? 0
  const free = TYPES.filter(x => !money.assets.some(a => a.type === x))
  const cfg = k === 'funding' || k === 'saving' ? { min: 0, max: Math.max(30000, Math.round(money.income * 0.5)), step: 500, presets: [1000, 2500, 5000, 10000], init: start ?? (plan || 2500) }
    : k === 'emergency' ? { min: 0, max: Math.max(money.expenses * 6, 100000), step: 1000, presets: [10000, 25000, 50000, 100000], init: 25000 }
    : k === 'debt' ? { min: 0, max: Math.max(money.income, 10000), step: 500, presets: [0, Math.round(money.income * 0.2), Math.round(money.income * 0.3)], init: money.emi }
    : { min: 0, max: 200000, step: 5000, presets: [10000, 25000, 50000], init: 25000 }
  const [v, setV] = useState(cfg.init)
  const [kind, setKind] = useState<AssetType>(free[0] ?? 'other')
  const [cover, setCover] = useState({ health: money.health, term: money.term })
  const before = readiness(money, years), after = readiness({ ...money, ...apply(money, k, v, kind, cover) }, years)
  const pb = before.parts.find(p => p.key === k)!, pa = after.parts.find(p => p.key === k)!
  useEffect(() => { const e = (x: KeyboardEvent) => { if (x.key === 'Escape') onClose() }; addEventListener('keydown', e); return () => removeEventListener('keydown', e) }, [onClose])
  const confirm = () => { setMoney(apply(money, k, v, kind, cover)); recordLesson({ accuracy: 1, xp: 10 }); play('good'); navigator.vibrate?.(15); onDone(after.score - before.score) }
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid items-end bg-[#000000]/60 sm:place-items-center" onClick={onClose}>
      <m.div role="dialog" aria-modal="true" aria-labelledby="as-h" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={spring} onClick={e => e.stopPropagation()} className="surface-float max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3"><h2 id="as-h" className="text-[1.6rem] leading-tight text-ink">{tc(`a_${k}`, lang)}</h2>
          <button onClick={onClose} aria-label={t('ls.close')} className="grid h-11 w-11 shrink-0 place-items-center rounded text-soft hover:text-ink"><X size={20} /></button></div>
        {k === 'protection' ? (
          <div className="mt-4 grid grid-cols-2 gap-2">{(['health', 'term'] as const).map(c => (
            <button key={c} role="switch" aria-checked={cover[c]} onClick={() => setCover({ ...cover, [c]: !cover[c] })} className="row !min-h-[52px] gap-2 !px-3"><span className={`grid h-5 w-5 place-items-center rounded-sm border ${cover[c] ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>{cover[c] && <Check size={13} />}</span>{t(`tr.${c}`)}</button>
          ))}</div>
        ) : (
          <>
            {k === 'spread' && <div className="mt-3 flex flex-wrap gap-1.5">{free.slice(0, 6).map(x => <button key={x} aria-pressed={kind === x} onClick={() => setKind(x)} className={`min-h-[40px] rounded-full border px-3 text-[14px] ${kind === x ? 'border-forest bg-forest text-on-forest' : 'border-line hover:border-forest'}`}>{t(`as.${x}`)}</button>)}</div>}
            <p className="num mt-4 text-[2.2rem] leading-none text-ink">{rupees(v)}{k === 'funding' || k === 'saving' || k === 'debt' ? <span className="label"> {t('common.perMonth')}</span> : null}</p>
            <input type="range" aria-label={tc(`a_${k}`, lang)} min={cfg.min} max={cfg.max} step={cfg.step} value={v} onChange={e => setV(+e.target.value)} className="mt-3 h-8 w-full accent-[rgb(var(--forest))]" />
            <div className="mt-2 flex flex-wrap gap-1.5">{cfg.presets.map(pv => <button key={pv} onClick={() => setV(pv)} aria-pressed={v === pv} className={`min-h-[40px] rounded-full border px-3 font-mono text-[13px] ${v === pv ? 'border-forest bg-haze text-forest' : 'border-line hover:border-forest'}`}>{rupeesShort(pv)}</button>)}</div>
          </>
        )}
        <div className="mt-5 rounded-lg bg-haze p-4" aria-live="polite">
          <Label>{tc('preview', lang)}</Label>
          <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[15px] text-ink">{t(`tr.p.${k}`)}</span><span className="num text-ink">{pb.got.toFixed(1)} → <b>{pa.got.toFixed(1)}</b><span className="label"> / {pa.max}</span></span></div>
          <span className="mt-1.5 block h-2 overflow-hidden rounded bg-mist"><span className="block h-full w-full origin-left bg-forest transition-transform duration-300" style={{ transform: `scaleX(${pa.got / pa.max})` }} /></span>
          <div className="mt-3 flex items-center justify-between"><span className="text-[15px] text-ink">{t('tr.score')}</span><span className="num text-xl text-ink">{before.score} → <CountUp value={after.score} />{after.score !== before.score && <span className={`ml-2 text-[15px] ${after.score > before.score ? 'text-forest' : 'text-rust'}`}>{after.score > before.score ? '+' : ''}{after.score - before.score}</span>}</span></div>
        </div>
        <p className="label mt-3">{tc('note', lang)}</p>
        <button autoFocus className="btn game-btn mt-4 w-full" onClick={confirm}>{tc('confirm', lang)}</button>
      </m.div>
    </m.div>
  )
}

/** Next Best Move: one primary card, two more on request. */
export function NextMoves({ r, started, onAct, onStart }: { r: Readiness; started: boolean; onAct: (k: K) => void; onStart: () => void }) {
  const { t, lang } = useI18n()
  const [more, setMore] = useState(false)
  const list = gainOf(r)
  if (!started || !list.length) return (
    <section className="hud mt-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><p className="min-w-[220px] flex-1 font-serif text-[1.4rem] text-ink">{t('tr.empty')}</p><button className="btn game-btn min-w-[150px]" onClick={onStart}>{t('path.start')}</button></section>
  )
  const [p0, ...rest] = list
  return (
    <section className="mt-5" aria-labelledby="nbm">
      <button onClick={() => onAct(p0.key)} className="hud pressable flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left hover:-translate-y-0.5 hover:!border-forest sm:p-6">
        <span className="min-w-[220px] flex-1"><Label><span id="nbm">{t('tr.nbm')}</span></Label><span className="mt-1 block font-serif text-[1.5rem] leading-snug text-ink">{t(`tr.fix.${p0.key}`, { n: Math.round(p0.max - p0.got) })}</span></span>
        <span className="btn game-btn min-w-[150px]">{t('tr.do')} · +{Math.round(p0.max - p0.got)}</span>
      </button>
      <AnimatePresence initial={false}>{more && rest.slice(0, 2).map((p, i) => (
        <m.button key={p.key} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...spring, delay: i * 0.06 }} onClick={() => onAct(p.key)} className="row mt-2 w-full justify-between gap-3 !px-4 text-left">
          <span className="min-w-0 flex-1 text-[15px]">{t(`tr.fix.${p.key}`, { n: Math.round(p.max - p.got) })}</span><span className="label shrink-0 rounded bg-forest px-1.5 py-0.5 !text-on-forest">+{Math.round(p.max - p.got)}</span>
        </m.button>
      ))}</AnimatePresence>
      {rest.length > 0 && <button className="link mt-2" aria-expanded={more} onClick={() => setMore(!more)}>{tc(more ? 'less' : 'more2', lang)}</button>}
    </section>
  )
}

/** Lessons from your numbers: 2 or 3 deterministic cards from the score parts. Locked behind a blurred example until 3 numbers exist. */
export function Lessons({ r, filled, onAct, onAsk }: { r: Readiness; filled: number; onAct: (k: K) => void; onAsk: (k: K) => void }) {
  const { lang } = useI18n()
  const cards = gainOf(r).filter(p => p.got / p.max < 0.8).slice(0, 3)
  return (
    <section aria-labelledby="lessons">
      <h2 id="lessons" className="flex items-center gap-2 text-[1.8rem] text-ink"><Lightbulb size={22} strokeWidth={1.5} className="text-rust" />{tc('lessons', lang)}</h2>
      {filled < 3 ? (
        <div className="relative mt-4">
          <div aria-hidden className="hud select-none p-5 blur-[3px]"><p className="font-serif text-xl text-ink">{tc('L_emergency', lang, { n: '0.5' })}</p><span className="mt-3 block h-2 w-1/2 rounded bg-rust/50" /></div>
          <p className="absolute inset-0 grid place-items-center"><span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 font-medium text-ink shadow-paper"><Lock size={15} />{tc('lock', lang)} · {filled} / 3</span></p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {cards.map((p, i) => (
            <m.li key={p.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.06 }} className="hud flex flex-col p-5 transition-transform hover:-translate-y-0.5">
              <p className="font-serif text-xl leading-snug text-ink">{tc(`L_${p.key}`, lang, p.vars)}</p>
              <span className="mt-3 block h-2 overflow-hidden rounded bg-mist" role="img" aria-label={`${Math.round((p.got / p.max) * 100)}%`}><m.span className={`block h-full w-full origin-left ${p.got / p.max < 0.4 ? 'bg-rust' : 'bg-amber'}`} initial={{ scaleX: 0 }} animate={{ scaleX: p.got / p.max }} transition={spring} /></span>
              <div className="mt-4 flex flex-wrap gap-2"><button className="btn game-btn !min-h-[40px] !px-4 text-[14px]" onClick={() => onAct(p.key)}>{tc('fix', lang)} · +{Math.round(p.max - p.got)}</button><button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => onAsk(p.key)}>{tc('askThis', lang)}</button></div>
            </m.li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** What if you invested more: a two-line chart from the tracker model, a delta chip, pillar changes, and Apply. */
export function WhatIf({ money, years, r, age, extra, setExtra, onApply }: { money: Money; years: number; r: Readiness; age: number; extra: number; setExtra: (n: number) => void; onApply: () => void }) {
  const { t, lang } = useI18n()
  const plus = { ...money, assets: [...money.assets, { id: 'x', type: 'mf' as AssetType, value: 0, monthly: extra }] }
  const ys = Array.from({ length: Math.max(years, 1) + 1 }, (_, y) => y)
  const a = ys.map(y => totals(money, y).future), b = ys.map(y => totals(plus, y).future)
  const max = Math.max(...b, 1), W = 320, H = 120
  const line = (s: number[]) => s.map((v, i) => `${(i / (ys.length - 1)) * W},${H - (v / max) * H}`).join(' ')
  const boosted = readiness(plus, years), changed = boosted.parts.filter((p, i) => Math.round(p.got - r.parts[i].got) > 0)
  return (
    <section className="hud p-6" aria-labelledby="whatif">
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="whatif" className="text-[1.6rem] text-ink">{t('tr.whatif')}</h2>
        {extra > 0 && <m.span key={Math.round(b[b.length - 1] - a[a.length - 1])} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="num rounded-full bg-forest px-3 py-1 text-[15px] text-on-forest">{tc('wiDelta', lang, { v: rupeesShort(b[b.length - 1] - a[a.length - 1]), a: age })}</m.span>}</div>
      <label htmlFor="wi" className="label mt-3 block">{t('tr.extra')}: <span className="num text-[15px] !text-ink">{rupees(extra)}{t('common.perMonth')}</span></label>
      <input id="wi" type="range" min={0} max={30000} step={500} value={extra} onChange={e => setExtra(+e.target.value)} className="mt-2 h-10 w-full accent-[rgb(var(--forest))]" />
      <div className="mt-3 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <svg viewBox={`0 -6 ${W} ${H + 12}`} className="w-full" role="img" aria-label={`${tc('cur', lang)} ${rupeesShort(a[a.length - 1])}, ${tc('withX', lang)} ${rupeesShort(b[b.length - 1])}`}>
          <line x1="0" y1={H} x2={W} y2={H} stroke="rgb(var(--line))" />
          <polyline points={line(a)} fill="none" stroke="rgb(var(--soft))" strokeWidth="2" strokeDasharray="5 4" />
          <polyline points={line(b)} fill="none" stroke="rgb(var(--forest))" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="min-w-[180px] space-y-1.5">
          <p className="flex items-center gap-2 text-[14px] text-soft"><span className="h-0.5 w-5 border-t-2 border-dashed border-soft" />{tc('cur', lang)} <span className="num ml-auto text-ink">{rupeesShort(a[a.length - 1])}</span></p>
          <p className="flex items-center gap-2 text-[14px] text-ink"><span className="h-1 w-5 rounded bg-forest" />{tc('withX', lang)} <span className="num ml-auto">{rupeesShort(b[b.length - 1])}</span></p>
          {changed.map(p => <p key={p.key} className="label">{t(`tr.p.${p.key}`)} +{Math.round(p.got - r.parts.find(x => x.key === p.key)!.got)}</p>)}
          <p className="num text-ink">{t('tr.score')} {r.score} → {boosted.score}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="label">{tc('note', lang)}</span><button className="btn game-btn" disabled={!extra} onClick={onApply}>{tc('apply', lang)}</button></div>
    </section>
  )
}

const week = () => Math.floor((Date.now() - Date.UTC(2024, 0, 1)) / 604800000)
const WK = 'pq.wk'
const readWk = (): { w: number; streak: number } => { try { return JSON.parse(localStorage.getItem(WK) ?? '{"w":-9,"streak":0}') } catch { return { w: -9, streak: 0 } } }
/** Marks this week's check-in; the streak grows only on consecutive weeks. */
export function markWeek() { const s = readWk(), w = week(); if (s.w === w) return; try { localStorage.setItem(WK, JSON.stringify({ w, streak: s.w === w - 1 ? s.streak + 1 : 1 })) } catch { /* storage off */ } }
export function Weekly({ onOpen }: { onOpen: () => void }) {
  const { lang } = useI18n(), s = readWk(), done = s.w === week()
  return (
    <button onClick={onOpen} className="hud pressable flex w-full items-center gap-4 p-5 text-left hover:-translate-y-0.5 hover:!border-forest">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${done ? 'bg-forest text-on-forest' : 'border-2 border-dashed border-forest text-forest'}`}>{done ? <Check size={22} /> : <span className="num">{s.streak}</span>}</span>
      <span className="min-w-0 flex-1"><Label>{tc('wk', lang)}</Label><span className="mt-0.5 block font-serif text-[1.15rem] leading-snug text-ink">{done ? tc('wkDone', lang) : tc('wkSub', lang)}</span><span className="label mt-1 block">{tc('wkStreak', lang, { n: s.streak })}</span></span>
      <ChevronRight size={18} className="shrink-0 text-soft" />
    </button>
  )
}

/** Accuracy stepper: each number expands inline to an input. */
export function Accuracy({ money, openKey, setOpenKey, save }: { money: Money; openKey: string | null; setOpenKey: (k: string | null) => void; save: (p: Partial<Money>) => void }) {
  const { t, lang } = useI18n()
  const rows = ['income', 'expenses', 'emi', 'loans', 'tax', 'health', 'term'] as const
  const n = rows.filter(k => (typeof money[k] === 'boolean' ? money[k] : (money[k] as number) > 0)).length
  return (
    <section className="hud p-5" aria-labelledby="acc-h">
      <Label><span id="acc-h">{tc('accOf', lang, { n })}</span></Label>
      <span className="mt-2 flex gap-1" aria-hidden>{rows.map((k, i) => <span key={k} className={`h-2 flex-1 rounded-full ${i < n ? 'bg-forest' : 'bg-mist'}`} />)}</span>
      <ul className="mt-3 divide-y divide-line">
        {rows.map(k => {
          const v = money[k], has = typeof v === 'boolean' ? v : (v as number) > 0, isOpen = openKey === k
          return (
            <li key={k}>
              {typeof v === 'boolean'
                ? <button role="switch" aria-checked={v} onClick={() => { save({ [k]: !v } as Partial<Money>); play('tick') }} className="flex min-h-[48px] w-full items-center gap-3 rounded px-1 text-left hover:bg-haze focus-visible:bg-haze"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${has ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>{has && <Check size={12} />}</span><span className="flex-1 text-[15px] text-ink">{t(`tr.${k}`)}</span></button>
                : <>
                  <button aria-expanded={isOpen} onClick={() => setOpenKey(isOpen ? null : k)} className="flex min-h-[48px] w-full items-center gap-3 rounded px-1 text-left hover:bg-haze focus-visible:bg-haze">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${has ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>{has && <Check size={12} />}</span>
                    <span className="flex-1 text-[15px] text-ink">{t(`tr.${k}`)}</span><span className="num text-soft">{has ? rupeesShort(v as number) : '+'}</span></button>
                  <AnimatePresence initial={false}>{isOpen && (
                    <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-3 pl-8">
                      <label htmlFor={`acc-${k}`} className="sr-only">{t(`tr.${k}`)}</label>
                      <div className="relative"><span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft">₹</span>
                        <input id={`acc-${k}`} autoFocus inputMode="numeric" className="field !min-h-[44px] !pl-8" value={(v as number) || ''} placeholder="0" onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setOpenKey(null) }} onChange={e => save({ [k]: Number(e.target.value.replace(/[^\d]/g, '')) } as Partial<Money>)} /></div>
                    </m.div>
                  )}</AnimatePresence>
                </>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Tracker quests as small cards with progress rings; tapping jumps to the matching action. */
export function Quests({ list, coins, onGo }: { list: { key: string; done: boolean; text: string; have: number; of: number }[]; coins: number; onGo: (key: string) => void }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="tq">
      <h2 id="tq" className="text-[1.4rem] text-ink">{t('tr.quests')}</h2>
      <ul className="mt-3 space-y-2">
        {list.map(q => {
          const f = Math.min(q.have / q.of, 1), C = 2 * Math.PI * 15
          return (
            <li key={q.key}><button disabled={q.done} onClick={() => onGo(q.key)} className="hud pressable flex w-full items-center gap-3 p-3 text-left hover:-translate-y-0.5 hover:!border-forest disabled:hover:translate-y-0">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden><circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--mist))" strokeWidth="4" /><circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--forest))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} /></svg>
                {q.done ? <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="grid h-6 w-6 place-items-center rounded-full bg-forest text-on-forest"><Check size={14} /></m.span> : <span className="num text-[11px] text-ink">{q.have}/{q.of}</span>}
              </span>
              <span className={`min-w-0 flex-1 text-[15px] ${q.done ? 'text-soft line-through' : 'text-ink'}`}>{q.text}</span>
              {!q.done && <span className="label shrink-0">+{coins}</span>}
            </button></li>
          )
        })}
      </ul>
    </section>
  )
}
export { ORDER }
