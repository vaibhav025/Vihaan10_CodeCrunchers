import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'

const STOPS = ['/home', '/tracker', '/lab', '/coach']
const key = (id: string) => `pq.tour.${id}`
const seen = (id: string) => { try { return localStorage.getItem(key(id)) === '1' } catch { return true } }

/** First-login tour: four stops, each one lights up its tab. Shown once per user on the Dashboard. */
export default function Tour() {
  const { t } = useI18n()
  const { user } = useSession()
  const { pathname } = useLocation()
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const uid = user?.id
  useEffect(() => { if (uid && pathname === '/home' && !seen(uid)) { setStep(0); setOpen(true) } }, [uid, pathname])
  const close = useCallback(() => { setOpen(false); if (uid) try { localStorage.setItem(key(uid), '1') } catch { /* private mode */ } }, [uid])

  // light up the visible tab (top tabs on desktop, bottom bar on phones)
  const place = useCallback(() => {
    const el = [...document.querySelectorAll<HTMLElement>(`nav[aria-label="Main"] a[href="${STOPS[step]}"]`)].find(e => e.offsetParent !== null || e.getClientRects().length > 0)
    if (!el) return setBox(null)
    const r = el.getBoundingClientRect()
    setBox({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 })
  }, [step])
  useLayoutEffect(() => {
    if (!open) return
    place()
    const id = setTimeout(place, 750) // the header slides in on first load
    addEventListener('resize', place)
    return () => { clearTimeout(id); removeEventListener('resize', place) }
  }, [open, place])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, close])

  const last = step === STOPS.length - 1
  return (
    <AnimatePresence>
      {open && (
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-[80]">
          {box ? <span aria-hidden className="tour-ring" style={box} /> : <span aria-hidden className="absolute inset-0 bg-black/70" />}
          <div className="absolute inset-0 grid place-items-center px-4">
            <m.div role="dialog" aria-modal="true" aria-labelledby="tour-h" aria-describedby="tour-d"
              initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="surface-float relative z-[82] w-full max-w-md p-6 sm:p-7">
              <p className="label" aria-live="polite">{t('tour.of', { n: step + 1 })}</p>
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <h2 id="tour-h" className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-[-0.02em] text-ink">{t(`tour.${step + 1}.t`)}</h2>
                  <p id="tour-d" className="mt-2 min-h-[4.5em] text-[16px] leading-relaxed text-soft">{t(`tour.${step + 1}.d`)}</p>
                </m.div>
              </AnimatePresence>
              <div className="mt-4 flex gap-1.5" aria-hidden>
                {STOPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-ink' : 'bg-ink/15'}`} />)}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" className="link !min-h-[44px] text-soft" onClick={close}>{t('tour.skip')}</button>
                <div className="flex gap-2">
                  {step > 0 && <button type="button" className="btn-quiet" onClick={() => setStep(s => s - 1)}>{t('tour.back')}</button>}
                  <button type="button" autoFocus className="btn" onClick={() => (last ? close() : setStep(s => s + 1))}>{t(last ? 'tour.done' : 'tour.next')}</button>
                </div>
              </div>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
