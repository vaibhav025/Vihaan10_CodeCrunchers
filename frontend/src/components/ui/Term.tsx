import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { Label } from './kit'

/** A piece of jargon with a dotted underline. Click or tap opens a one-line meaning. Never place inside a link. */
export default function Term({ k, children }: { k: string; children?: ReactNode }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const id = useId(), box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <span ref={box} className="relative inline-block">
      <button type="button" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen(o => !o)}
        className="term">{children ?? t(`term.${k}.n`)}</button>
      {open && <span id={id} role="tooltip" className="term-pop">{t(`term.${k}`)}</span>}
    </span>
  )
}

/** A row of key terms for a page that leans on jargon. */
export function Terms({ keys, className = '' }: { keys: string[]; className?: string }) {
  const { t } = useI18n()
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-soft ${className}`}>
      <Label>{t('term.title')}</Label>
      {keys.map(k => <Term key={k} k={k} />)}
    </p>
  )
}
