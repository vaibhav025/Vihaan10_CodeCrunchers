import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// One shared theme for the whole app, so the header toggle and the Profile setting stay in sync.
const listeners = new Set<() => void>()
let current: Theme = (() => {
  const s = localStorage.getItem('pq.theme')
  if (s === 'light' || s === 'dark') return s
  return 'dark'
})()

function apply(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#000000' : '#371931')
}
apply(current)

export function setTheme(t: Theme) {
  const root = document.documentElement
  root.classList.add('theme-switch')
  setTimeout(() => root.classList.remove('theme-switch'), 200)
  current = t
  localStorage.setItem('pq.theme', t)
  apply(t)
  listeners.forEach(l => l())
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return [theme, setTheme] as const
}
