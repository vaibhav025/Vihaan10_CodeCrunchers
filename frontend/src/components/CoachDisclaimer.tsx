import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'
import { TriangleAlert, X } from './ui/icons'
import { useI18n } from '../lib/i18n'

/** Flags for the Coach's financial disclaimer. */
export const DISCLAIMER = { showUnreadBadge: true, showOnFirstVisit: false }
const KEY = 'pq.coach.disclaimer'
const seen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }
const RED = 'rgb(var(--down))' // the existing clear red, used here only as the alert colour

/** "Disclaimer" button for the Coach header, and the dialog that shows the financial disclaimer word for word. */
export default function CoachDisclaimer() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(() => !seen())
  const btn = useRef<HTMLButtonElement>(null), box = useRef<HTMLDivElement>(null)
  const show = () => { setOpen(true); setUnread(false); try { localStorage.setItem(KEY, '1') } catch { /* private mode */ } }
  useEffect(() => { if (DISCLAIMER.showOnFirstVisit && !seen()) show() }, [])
  // while open: lock background scroll, keep focus inside, close on Esc, and give focus back afterwards
  useEffect(() => {
    if (!open) return
    const back = btn.current, prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.querySelector<HTMLElement>('[data-first]')?.focus()
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key !== 'Tab' || !box.current) return
      const f = [...box.current.querySelectorAll<HTMLElement>('button')], i = f.indexOf(document.activeElement as HTMLElement)
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus()
    }
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; back?.focus() }
  }, [open])
  const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <>
      <button ref={btn} type="button" onClick={show} aria-label={t('coach.disclaimer.aria')} aria-haspopup="dialog"
        className="relative inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-down/35 px-3 text-ink transition-[transform,box-shadow,border-color] duration-200 hover:border-down/80 hover:shadow-[0_0_18px_rgb(var(--down)/0.25)] active:scale-[0.97] sm:min-h-[40px]">
        <span className="relative"><TriangleAlert size={18} strokeWidth={1.7} aria-hidden style={{ color: RED }} />
          {DISCLAIMER.showUnreadBadge && unread && <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full" style={{ background: RED }} />}</span>
        <span className="label hidden !text-[12px] !text-ink min-[600px]:inline" aria-hidden>{t('coach.disclaimer.btn')}</span>
      </button>
      {/* in a portal, so it sits above the page's own layers (the phone tab bar included) */}
      {createPortal(<AnimatePresence>
        {open && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)}
            className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 backdrop-blur-[3px] sm:items-center sm:p-6">
            <m.div ref={box} role="dialog" aria-modal="true" aria-labelledby="cd-title" onClick={e => e.stopPropagation()}
              initial={calm ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="surface-float flex max-h-[85dvh] w-full flex-col overflow-hidden !rounded-b-none !rounded-t-[24px] sm:max-w-[640px] sm:!rounded-[24px]">
              <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/25 sm:hidden" />
              <header className="flex items-center gap-3 border-b-2 border-down/30 px-5 py-4 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-down/[0.14]"><TriangleAlert size={20} strokeWidth={1.7} aria-hidden style={{ color: RED }} /></span>
                <h2 id="cd-title" className="flex-1 font-serif text-[1.45rem] leading-tight text-ink">{t('coach.disclaimer.title')}</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('coach.disclaimer.close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink/40"><X size={18} strokeWidth={1.6} aria-hidden /></button>
              </header>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[16px] leading-[1.65] text-ink sm:px-6">
                <p>{t('coach.disclaimer.p1')}</p><p>{t('coach.disclaimer.p2')}</p><p>{t('coach.disclaimer.p3')}</p>
              </div>
              <footer className="border-t border-ink/10 px-5 py-4 sm:px-6"><button type="button" data-first className="btn w-full sm:w-auto" onClick={() => setOpen(false)}>{t('coach.disclaimer.ok')}</button></footer>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  )
}
