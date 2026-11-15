import { useEffect, useState } from 'react'
import type { Content } from '../types'
import { useI18n } from '../../lib/i18n'

const LOAD: Record<string, () => Promise<{ default: Content }>> = { en: () => import('./en'), hi: () => import('./hi') }
const cache: Record<string, Content> = {}

/** Dada Ji's content in the active language (English if that language has none). Null while loading. */
export function useContent(): Content | null {
  const { lang } = useI18n()
  const key = LOAD[lang] ? lang : 'en'
  const [c, setC] = useState<Content | null>(cache[key] ?? null)
  useEffect(() => {
    if (cache[key]) { setC(cache[key]); return }
    let live = true
    LOAD[key]().then(m => { cache[key] = m.default; if (live) setC(m.default) }).catch(() => {})
    return () => { live = false }
  }, [key])
  return c
}
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
