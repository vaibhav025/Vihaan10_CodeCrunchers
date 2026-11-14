import { useSyncExternalStore } from 'react'

/** The in-app "Reduce motion" setting, on top of the system preference. */
const KEY = 'pq.reduceMotion'
const subs = new Set<() => void>()
const apply = (on: boolean) => { document.documentElement.dataset.reduceMotion = on ? 'true' : 'false' }
export const reduceMotionSetting = () => localStorage.getItem(KEY) === '1'
export const prefersLessMotion = () => reduceMotionSetting() || window.matchMedia('(prefers-reduced-motion: reduce)').matches
apply(reduceMotionSetting())
export function setReduceMotion(on: boolean) { localStorage.setItem(KEY, on ? '1' : '0'); apply(on); subs.forEach(f => f()) }
export const useReduceMotion = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, reduceMotionSetting)
