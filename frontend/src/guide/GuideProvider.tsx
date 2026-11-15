import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** What Dada Ji remembers on this device. Nothing sensitive: choices and which help was seen. */
export interface Saved {
  welcomed: boolean; opened: boolean
  comfort: 'new' | 'ok' | 'pro'
  /** 0, 1, 2 = 100%, 118%, 135% */
  scale: 0 | 1 | 2
  tips: boolean
  done: string[]; seen: string[]; nudgeAt: number
  fb: Record<string, 1 | -1>; reward: boolean
}
export type Mode = 'home' | 'page' | 'tours' | 'guidebook' | 'search' | 'list' | 'settings'
export interface ActiveTour { id: string; i: number; route?: string }
interface Guide extends Saved {
  open: boolean; setOpen: (o: boolean) => void
  mode: Mode; setMode: (m: Mode) => void
  tour: ActiveTour | null; startTour: (id: string) => void; setStep: (i: number) => void; endTour: (finished: boolean) => void
  /** spotlight one element; `@id` tours are single-step */
  showMe: (target: string, route?: string) => void
  explain: boolean; setExplain: (on: boolean) => void
  query: string; ask: (q: string) => void
  save: (p: Partial<Saved>) => void
}
const KEY = 'pq.guide'
// on a narrow phone the larger steps are gentler, so nothing is pushed off the screen
const scales = () => (typeof innerWidth !== 'undefined' && innerWidth < 640 ? [1, 1.1, 1.2] : [1, 1.18, 1.35])
const BASE: Saved = { welcomed: false, opened: false, comfort: 'ok', scale: 0, tips: true, done: [], seen: [], nudgeAt: 0, fb: {}, reward: false }
const read = (): Saved => { try { return { ...BASE, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return BASE } }

const Ctx = createContext<Guide>(null!)
export const useGuide = () => useContext(Ctx)

export function GuideProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Saved>(read)
  const [open, setOpenRaw] = useState(false)
  const [mode, setMode] = useState<Mode>('home')
  const [tour, setTour] = useState<ActiveTour | null>(null)
  const [explain, setExplainRaw] = useState(false)
  const [query, setQuery] = useState('')
  const save = useCallback((p: Partial<Saved>) => setS(cur => { const next = { ...cur, ...p }; try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ } return next }), [])
  // text size for the whole app; fixed bars and overlays scale with it
  useEffect(() => { document.documentElement.style.setProperty('zoom', String(scales()[s.scale] ?? 1)) }, [s.scale])

  const value = useMemo<Guide>(() => ({
    ...s, save, open, mode, setMode, tour, explain, query,
    setOpen: o => { setOpenRaw(o); if (o) { setMode('home'); save({ opened: true }) } },
    startTour: id => { setOpenRaw(false); setExplainRaw(false); setTour({ id, i: 0 }) },
    setStep: i => setTour(cur => (cur ? { ...cur, i } : cur)),
    endTour: finished => { setTour(cur => { if (cur && finished && !cur.id.startsWith('@')) save({ done: [...new Set([...s.done, cur.id])] }); return null }) },
    showMe: (target, route) => { setOpenRaw(false); setExplainRaw(false); setTour({ id: `@${target}`, i: 0, route }) },
    setExplain: on => { setExplainRaw(on); if (on) { setOpenRaw(false); setTour(null) } },
    ask: q => { setQuery(q); setMode('search') },
  }), [s, save, open, mode, tour, explain, query])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
