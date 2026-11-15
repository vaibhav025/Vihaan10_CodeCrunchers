import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
/** What the person chose. 'system' follows the device setting, live. */
export type ThemePref = Theme | 'system'

// One shared theme for the whole app, so the header toggle and the Profile setting stay in sync.
const KEY = 'pq.theme'
const listeners = new Set<() => void>()
const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: light)') : null
const read = (): ThemePref => { try { const s = localStorage.getItem(KEY); return s === 'light' || s === 'dark' ? s : 'system' } catch { return 'system' } }
const resolve = (p: ThemePref): Theme => (p === 'system' ? (mq?.matches ? 'light' : 'dark') : p)
let pref: ThemePref = read()
let current: Theme = resolve(pref)

function apply(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#000000' : '#F5F2E6')
  // canvases and 3D scenes re-read their colours on this
  window.dispatchEvent(new Event('themechange'))
}
apply(current)

function change(next: ThemePref, save: boolean) {
  pref = next
  if (save) try { if (next === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, next) } catch { /* private mode */ }
  const t = resolve(next)
  if (t !== current) {
    current = t
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (!calm && doc.startViewTransition) doc.startViewTransition(() => apply(t))
    else {
      const root = document.documentElement
      if (!calm) { root.classList.add('theme-switch'); setTimeout(() => root.classList.remove('theme-switch'), 220) }
      apply(t)
    }
  }
  listeners.forEach(l => l())
}
export const setTheme = (t: ThemePref) => change(t, true)
// follow the device while set to System, and stay in step with other tabs
mq?.addEventListener('change', () => { if (pref === 'system') change('system', false) })
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === KEY) change(read(), false) })

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** [theme in use, setter, the saved choice]. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  const choice = useSyncExternalStore(subscribe, () => pref)
  return [theme, setTheme, choice] as const
}
