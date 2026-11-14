import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from './session'
import { levelInfo } from './game'
import { play } from './sound'

export interface GameEvent { kind: 'level' | 'badge'; title: string; detail: string; level?: number }

const Ctx = createContext<{ current: GameEvent | null; push: (e: GameEvent) => void; dismiss: () => void }>(null!)
export const useGameEvents = () => useContext(Ctx)

/** Queue of moments worth stopping for: a new level, a new insignia. */
export function GameEventsProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<GameEvent[]>([])
  const { user } = useSession()
  const seen = useRef<{ id: string; level: number } | null>(null)

  const push = useCallback((e: GameEvent) => setQueue(q => [...q, e]), [])
  const dismiss = useCallback(() => setQueue(q => q.slice(1)), [])

  // a level-up is detected from XP, wherever the XP came from
  useEffect(() => {
    if (!user) { seen.current = null; return }
    const lv = levelInfo(user.total_xp)
    if (seen.current && seen.current.id === user.id && lv.level > seen.current.level) {
      push({ kind: 'level', title: lv.title, detail: '', level: lv.level })
    }
    seen.current = { id: user.id, level: lv.level }
  }, [user, push])

  const current = queue[0] ?? null
  useEffect(() => { if (current) play('level') }, [current])

  const value = useMemo(() => ({ current, push, dismiss }), [current, push, dismiss])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
