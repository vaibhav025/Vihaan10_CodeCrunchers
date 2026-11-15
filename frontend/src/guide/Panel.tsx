import { useEffect, useRef, useState, type ReactNode } from 'react'
import { m } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Check, ChevronRight, Compass, Info, MessageSquare, Play, ScanSearch, Target, X } from '../components/ui/icons'
import { LANGS, useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useMeta } from '../lib/useMeta'
import { useMoney } from '../lib/tracker'
import { api } from '../lib/api'
import { useGuide, type Mode } from './GuideProvider'
import { fill } from './content'
import type { Content, Pose } from './types'
import DadaJi from './DadaJi'
import { Book, Results } from './Guidebook'
import { useAloud } from './readAloud'

const REWARD = 50
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Dada Ji's speech bubble. The text types out quickly; a click shows it all. Screen readers get the whole line at once. */
export function Bubble({ text, onTyping, mark }: { text: string; onTyping?: (on: boolean) => void; mark?: [number, number] | null }) {
  const [n, setN] = useState(reduced() ? text.length : 0)
  useEffect(() => {
    if (reduced()) { setN(text.length); return }
    setN(0); onTyping?.(true)
    const id = setInterval(() => setN(c => { if (c + 2 >= text.length) { clearInterval(id); onTyping?.(false); return text.length } return c + 2 }), 22)
    return () => { clearInterval(id); onTyping?.(false) }
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = text.slice(0, n)
  return (
    <div className="gd-bubble min-h-[76px] cursor-pointer px-4 py-3 font-serif text-[16px] leading-[1.45]" onClick={() => setN(text.length)}>
      <span aria-hidden>{mark && n >= text.length ? <>{text.slice(0, mark[0])}<mark>{text.slice(mark[0], mark[1])}</mark>{text.slice(mark[1])}</> : shown}<span className="invisible">{text.slice(n)}</span></span>
      <span className="sr-only" aria-live="polite">{text}</span>
    </div>
  )
}

export default function Panel({ c }: { c: Content }) {
  const g = useGuide(), u = c.ui
  const { lang, setLang } = useI18n()
  const { user, progress, saveProgress } = useSession()
  const meta = useMeta(), money = useMoney()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [ws, setWs] = useState(0)                 // welcome step
  const [typing, setTyping] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const close = useRef<HTMLButtonElement>(null)
  const [q, setQ] = useState('')
  const aloud = useAloud(lang)
  const welcome = !g.welcomed
  useEffect(() => { close.current?.focus() }, [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') g.setOpen(false) }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [g])
  useEffect(() => { setNote(null) }, [g.mode])

  const page = c.pages[pathname] ?? c.pages[Object.keys(c.pages).find(r => pathname.startsWith(r + '/')) ?? '']
  const list = [
    { k: 'l_lang', ok: g.welcomed }, { k: 'l_score', ok: money.income > 0 || money.assets.length > 0 },
    { k: 'l_lab', ok: meta.labDay !== '' }, { k: 'l_dadi', ok: meta.coachDay !== '' }, { k: 'l_tour', ok: g.done.includes('welcome') },
  ]
  const allDone = list.every(x => x.ok)
  // the checklist reward is given once, in coins from the existing game economy
  useEffect(() => { if (allDone && !g.reward && user) { g.save({ reward: true }); saveProgress({ coins: progress.coins + REWARD }) } }, [allDone, g.reward]) // eslint-disable-line react-hooks/exhaustive-deps

  const say = note ?? (welcome ? [u.hello, u.w_size, u.w_comfort, u.w_go][ws]
    : g.mode === 'home' ? u.helloBack : g.mode === 'page' ? (page ? page.cards[0].b : u.pageNone) : g.mode === 'tours' ? u.pickTour
    : g.mode === 'list' ? (allDone ? fill(u.listDone, { n: REWARD }) : u.listSay) : g.mode === 'settings' ? u.settingsSay : g.mode === 'guidebook' ? u.bookSay : u.results)
  const pose: Pose = typing || aloud.on ? 'talk' : welcome && ws === 0 ? 'wave' : g.mode === 'list' && allDone ? 'cheer' : g.mode === 'page' ? 'point' : g.mode === 'tours' ? 'thumbsUp' : 'idle'

  const act = (icon: ReactNode, label: string, run: () => void) => <button key={label} type="button" className="gd-act" onClick={run}>{icon}<span>{label}</span></button>
  const go = (mode: Mode) => () => g.setMode(mode)
  const big = 'flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-[16px] font-medium transition-transform active:scale-[.98]'
  const sizes = [u.sizeA, u.sizeB, u.sizeC]
  const SizePick = (
    <div role="radiogroup" aria-label={u.size} className="grid grid-cols-3 gap-2">
      {sizes.map((name, i) => (
        <button key={name} type="button" role="radio" aria-checked={g.scale === i} onClick={() => g.save({ scale: i as 0 | 1 | 2 })}
          className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border ${g.scale === i ? 'border-[#E9A23B] bg-[#E9A23B]/15 text-ink' : 'border-ink/15 text-soft hover:border-ink/40'}`}>
          <span className="font-serif leading-none text-ink" style={{ fontSize: 16 + i * 5 }}>A{'+'.repeat(i)}</span><span className="mt-1 text-[12px]">{name}</span>
        </button>
      ))}
    </div>
  )

  return (
    <m.aside role="dialog" aria-label={`${u.name}. ${u.role}`} initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="gd-panel fixed inset-x-0 bottom-0 z-[70] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-[28px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-h-[min(760px,calc(100dvh-48px))] sm:w-[400px] sm:rounded-[28px]">
      <header className="flex items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-2">
          {!welcome && g.mode !== 'home' && <button type="button" onClick={go('home')} aria-label={u.home} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink/40"><ChevronRight size={18} className="rotate-180" aria-hidden /></button>}
          <p><span className="block font-serif text-[1.15rem] leading-tight text-ink">{u.name}</span><span className="label">{u.role}</span></p>
        </div>
        <button ref={close} type="button" onClick={() => g.setOpen(false)} aria-label={u.close} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink/40"><X size={18} strokeWidth={1.6} aria-hidden /></button>
      </header>

      {/* the stage: Dada Ji on his pedestal, speaking */}
      <div className="gd-stage relative mt-1 grid grid-cols-[118px_minmax(0,1fr)] items-end gap-2 px-4 pb-3">
        <span className="gd-ped" aria-hidden />
        <div className="relative"><DadaJi pose={pose} talking={typing || aloud.on} size={112} /></div>
        <div className="pb-2">
          <Bubble text={say} onTyping={setTyping} mark={aloud.mark} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3">
            <button type="button" className="link !min-h-[44px] text-[13.5px] text-soft" aria-pressed={aloud.on} onClick={() => aloud.toggle(say)}>{aloud.on ? u.stopRead : u.readAloud}</button>
            <button type="button" className="link !min-h-[44px] text-[13.5px] text-soft" aria-pressed={aloud.slow} onClick={() => aloud.setSlow(!aloud.slow)}>{aloud.slow ? u.normal : u.slower}</button>
          </div>
          {aloud.issue && <p role="status" className="text-[12.5px] leading-snug text-soft">{aloud.issue === 'none' ? u.noSpeech : u.noVoice}</p>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {welcome ? (
          <div className="space-y-3">
            {ws === 0 && <>
              <p className="label">{u.w_lang}</p>
              <div className="grid grid-cols-2 gap-2">{LANGS.map(l => (
                <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => { setLang(l.id); if (user) api.update({ language: l.id }).catch(() => {}) }}
                  className={`min-h-[56px] rounded-2xl border text-[17px] ${lang === l.id ? 'border-[#E9A23B] bg-[#E9A23B]/15 text-ink' : 'border-ink/15 text-soft hover:border-ink/40'}`}>{l.name}</button>))}
              </div>
            </>}
            {ws === 1 && SizePick}
            {ws === 2 && <div role="radiogroup" aria-label={u.w_comfort} className="grid gap-2">{(['new', 'ok', 'pro'] as const).map(k => (
              <button key={k} type="button" role="radio" aria-checked={g.comfort === k} onClick={() => g.save({ comfort: k })}
                className={`flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 text-left ${g.comfort === k ? 'border-[#E9A23B] bg-[#E9A23B]/15' : 'border-ink/15 hover:border-ink/40'}`}>
                <span className="text-[16px] text-ink">{u[`c_${k}`]}</span><span className="text-[13px] text-soft">{u[`c_${k}D`]}</span>
              </button>))}</div>}
            {ws < 3
              ? <button type="button" className={`${big} bg-[#E9A23B] text-[#1B2622]`} onClick={() => setWs(ws + 1)}>{u.next}<ChevronRight size={18} aria-hidden /></button>
              : <>
                <button type="button" className={`${big} bg-[#E9A23B] text-[#1B2622]`} onClick={() => { g.save({ welcomed: true }); g.startTour('welcome') }}>{u.tourGo}</button>
                <button type="button" className={`${big} border border-ink/20 text-ink`} onClick={() => { g.save({ welcomed: true }); setNote(u.exploreSay) }}>{u.explore}</button>
              </>}
            {ws > 0 && <button type="button" className="link !min-h-[44px] text-soft" onClick={() => setWs(ws - 1)}>← {u.back}</button>}
          </div>
        ) : (<>
          {g.mode === 'home' && (
            <div className="grid grid-cols-2 gap-2">
              {act(<Compass size={20} strokeWidth={1.6} aria-hidden />, u.a_tour, go('tours'))}
              {act(<Info size={20} strokeWidth={1.6} aria-hidden />, u.a_page, go('page'))}
              {act(<ScanSearch size={20} strokeWidth={1.6} aria-hidden />, u.a_explain, () => g.setExplain(true))}
              {act(<Play size={20} strokeWidth={1.6} aria-hidden />, u.a_play, () => g.startTour((pathname.match(/^\/lab\/(retire|stocks|funds|schemes)/)?.[1]) ?? 'lab'))}
              {act(<BookOpen size={20} strokeWidth={1.6} aria-hidden />, u.a_book, go('guidebook'))}
              {act(<MessageSquare size={20} strokeWidth={1.6} aria-hidden />, u.a_dadi, () => { g.setOpen(false); nav('/coach') })}
              {act(<Target size={20} strokeWidth={1.6} aria-hidden />, `${u.a_list} · ${list.filter(x => x.ok).length}/5`, go('list'))}
              {act(<X size={20} strokeWidth={1.6} className="rotate-45" aria-hidden />, u.a_settings, go('settings'))}
            </div>
          )}
          {g.mode === 'page' && (page ? (
            <div className="space-y-2">
              <p className="label">{page.title}</p>
              {page.cards.map((k, i) => <div key={k.t} className="gd-card"><p className="font-serif text-[16px] text-ink">{i + 1}. {k.t}</p><p className="mt-1 text-[14.5px] leading-snug text-soft">{k.b}</p></div>)}
              <div className="grid gap-2 pt-1">{page.actions.map(a => act(<Target size={18} strokeWidth={1.6} aria-hidden />, `${u.show}: ${a.label}`, () => g.showMe(a.target)))}</div>
            </div>
          ) : <div className="grid gap-2">{act(<BookOpen size={20} strokeWidth={1.6} aria-hidden />, u.a_book, go('guidebook'))}</div>)}
          {g.mode === 'tours' && (
            <div className="grid gap-2">{Object.entries(c.tours).map(([id, t]) => (
              <button key={id} type="button" className="gd-act justify-between" onClick={() => g.startTour(id)}>
                <span className="flex items-center gap-2.5">{g.done.includes(id) ? <Check size={18} aria-hidden /> : <Compass size={18} strokeWidth={1.6} aria-hidden />}<span>{t.title}</span></span><span className="label shrink-0">{t.minutes}</span>
              </button>))}</div>
          )}
          {g.mode === 'list' && (
            <ul className="space-y-2">{list.map(x => (
              <li key={x.k} className="gd-card flex items-center gap-3">
                <m.span initial={false} animate={{ scale: x.ok ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${x.ok ? 'border-up bg-up text-black' : 'border-soft/60'}`}>{x.ok && <Check size={14} strokeWidth={3} aria-hidden />}</m.span>
                <span className={`text-[15px] ${x.ok ? 'text-soft line-through' : 'text-ink'}`}>{u[x.k]}</span>
              </li>))}</ul>
          )}
          {g.mode === 'settings' && (
            <div className="space-y-4">
              <div><p className="label mb-2">{u.size}</p>{SizePick}</div>
              <label className="gd-card flex min-h-[56px] cursor-pointer items-center justify-between gap-3">
                <span><span className="block text-[15px] text-ink">{u.tips}</span><span className="block text-[13px] text-soft">{u.tipsD}</span></span>
                <input type="checkbox" className="h-6 w-6 accent-[#E9A23B]" checked={g.tips} onChange={e => g.save({ tips: e.target.checked })} />
              </label>
              <button type="button" className={`${big} border border-ink/20 text-ink`} onClick={() => { setWs(0); g.save({ welcomed: false }) }}>{u.replay}</button>
            </div>
          )}
          {g.mode === 'guidebook' && <Book c={c} />}
          {g.mode === 'search' && <Results c={c} q={g.query} />}
          <p className="mt-4 text-center text-[13px] text-soft">{u.reassure}</p>
        </>)}
      </div>
      {!welcome && (
        <form className="flex gap-2 border-t border-ink/10 p-3" onSubmit={e => { e.preventDefault(); if (q.trim()) g.ask(q.trim()) }}>
          <label htmlFor="gd-q" className="sr-only">{u.search}</label>
          <input id="gd-q" className="field min-h-[48px] min-w-0 flex-1" value={q} onChange={e => setQ(e.target.value)} placeholder={u.search} />
          <button className="min-h-[48px] shrink-0 rounded-full bg-[#E9A23B] px-4 text-[15px] font-medium text-[#1B2622]">{u.searchGo}</button>
        </form>
      )}
    </m.aside>
  )
}
