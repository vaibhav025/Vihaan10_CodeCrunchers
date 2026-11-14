import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type User } from './api'
import { clearMoneyOwner, hydrateMoney, type Money } from './tracker'

/**
 * The backend has no endpoints for streak length or quest history, so the app keeps a small
 * per-device record of them, updated from each quest result.
 */
export interface Progress {
  streak: number
  longest: number
  journal: { title: string; correct: boolean }[]
  simRuns: number
  /** Dates (YYYY-MM-DD) of the last quest answered and the last projection run, for daily missions. */
  questDay: string
  simDay: string
  /** Path: stars (1-3) per completed node, and coins. Per device until the backend stores them. */
  nodes: Record<string, number>
  coins: number
  /** World map: power-ups held and achievements earned. */
  power: { shield: number; double: number }
  achievements: string[]
}
const EMPTY: Progress = { streak: 0, longest: 0, journal: [], simRuns: 0, questDay: '', simDay: '', nodes: {}, coins: 0, power: { shield: 0, double: 0 }, achievements: [] }
export const today = () => new Date().toLocaleDateString('en-CA')
const progressKey = (id: string) => `pq.progress.${id}`
const readProgress = (id: string): Progress => {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(progressKey(id)) ?? '{}') } } catch { return EMPTY }
}

interface Session {
  user: User | null
  loading: boolean
  error: string | null
  progress: Progress
  saveProgress: (p: Partial<Progress>) => void
  setUser: (u: User) => void
  refresh: () => Promise<void>
  signUp: (d: { name: string; phone?: string; age: number; income_range: string; language: string; retirement_age: number; email: string; password: string; financial_data: Money; consent: boolean }) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  reset: () => void
}

const Ctx = createContext<Session>(null!)
export const useSession = () => useContext(Ctx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress>(EMPTY)

  const saveProgress = useCallback((p: Partial<Progress>) => {
    setProgress(prev => {
      const next = { ...prev, ...p }
      if (user) localStorage.setItem(progressKey(user.id), JSON.stringify(next))
      return next
    })
  }, [user])

  const reset = useCallback(() => {
    void api.logout().catch(() => {})
    setUser(null); setProgress(EMPTY); clearMoneyOwner()
  }, [])

  // one request at a time: concurrent callers (and StrictMode's double effect) share it
  const inflight = useRef<Promise<void> | null>(null)
  const refresh = useCallback((): Promise<void> => {
    inflight.current ??= load().finally(() => { inflight.current = null })
    return inflight.current
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    try {
      const profile = await api.profile()
      const money = await api.tracker()
      hydrateMoney(profile.id, money as Partial<Money>)
      setProgress(readProgress(profile.id))
      setUser(profile); setError(null)
    } catch (e) {
      // 401/404: the account no longer exists on the server (for example after a database reset)
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) reset()
      else setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [refresh])

  const signUp = useCallback<Session['signUp']>(async d => {
    const res = await api.register({ ...d, risk_profile: 'moderate' })
    const money = await api.tracker()
    hydrateMoney(res.user.id, money); setProgress(readProgress(res.user.id)); setUser(res.user); setError(null)
  }, [])

  const signIn = useCallback<Session['signIn']>(async (email, password) => {
    const res = await api.login({ email, password })
    const money = await api.tracker()
    hydrateMoney(res.user.id, money); setProgress(readProgress(res.user.id)); setUser(res.user); setError(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, progress, saveProgress, setUser, refresh, signUp, signIn, reset }),
    [user, loading, error, progress, saveProgress, refresh, signUp, signIn, reset],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
