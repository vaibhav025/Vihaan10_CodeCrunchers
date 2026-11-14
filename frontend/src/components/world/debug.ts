import { useSyncExternalStore } from 'react'
import type { Profile } from './worldFromProfile'

// Dev-only overrides so any level can be previewed without playing. Never active in production builds.
let overrides: Partial<Profile> = {}
const subs = new Set<() => void>()
export const setDebug = (o: Partial<Profile>) => { overrides = { ...overrides, ...o }; subs.forEach(f => f()) }
export const clearDebug = () => { overrides = {}; subs.forEach(f => f()) }
let night = false
export const setDebugNight = (n: boolean) => { night = n; subs.forEach(f => f()) }
export const useDebugNight = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => night)

export function useDebugOverrides() {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => overrides)
}
