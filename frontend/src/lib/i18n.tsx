import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './locales/en'

export type Lang = 'en' | 'hi' | 'mr'
export const LANGS: { id: Lang; name: string }[] = [
  // Marathi is switched off for now; its strings stay in locales/mr.ts
  { id: 'en', name: 'English' }, { id: 'hi', name: 'हिन्दी' },
]

type Dict = Record<string, string>




// English is bundled as the fallback; Hindi loads when selected.
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Dict }>> = {
  hi: () => import('./locales/hi'),
  mr: () => import('./locales/mr'),
}
const loaded: Partial<Record<Lang, Dict>> = { en }

type T = (key: string, vars?: Record<string, string | number>) => string
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: T; ready: boolean }>(null!)
export const useI18n = () => useContext(Ctx)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const s = localStorage.getItem('pq.lang')
    return s === 'hi' ? s : 'en'
  })
  // bumps when a dictionary arrives, so t() re-renders with it
  const [, setVersion] = useState(0)
  const ready = !!loaded[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    if (lang !== 'en' && !loaded[lang]) {
      LOADERS[lang]().then(m => { loaded[lang] = m.default; setVersion(v => v + 1) }).catch(() => {})
    }
  }, [lang])

  // a saved Marathi preference (from the profile) falls back to English
  const setLang = useCallback((l: Lang) => { const v: Lang = l === 'hi' ? 'hi' : 'en'; localStorage.setItem('pq.lang', v); setLangState(v) }, [])
  const dict = loaded[lang]
  const t = useCallback<T>((key, vars) => {
    // until the chosen language arrives, English is shown
    let s = dict?.[key] ?? en[key] ?? key
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
    return s
  }, [dict])
  const value = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
