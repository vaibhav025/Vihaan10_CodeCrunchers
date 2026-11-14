import { useSyncExternalStore } from 'react'

/** Habit-linked micro-saving: skip a habit, put its price toward NPS. Kept on this device. */
export interface Habit { id: string; price: number; custom?: string }
export const HABITS: Habit[] = [
  { id: 'coffee', price: 150 }, { id: 'delivery', price: 250 }, { id: 'cab', price: 200 },
  { id: 'smoke', price: 120 }, { id: 'impulse', price: 500 }, { id: 'eatout', price: 400 },
]
interface State { picked: string[]; log: { id: string; amt: number; at: string }[]; logged: number; custom: Habit[] }
const KEY = 'pq.habits'
let cache: State = { picked: ['coffee', 'delivery'], log: [], logged: 0, custom: [], ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
const subs = new Set<() => void>()
export function setHabits(p: Partial<State>) { cache = { ...cache, ...p }; localStorage.setItem(KEY, JSON.stringify(cache)); subs.forEach(f => f()) }
export const useHabits = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cache)

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7)
export function monthTotal(s: State, key = monthKey()) { return s.log.filter(l => l.at.startsWith(key)).reduce((a, l) => a + l.amt, 0) }
/** Days in a row with at least one skip, ending today or yesterday. */
export function skipStreak(s: State) {
  const days = new Set(s.log.map(l => l.at.slice(0, 10)))
  let n = 0; const d = new Date()
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1) }
  return n
}
