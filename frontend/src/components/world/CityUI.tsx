import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { cityBus, type CityPick } from './cityBus'
import { ZONES } from './worldFromProfile'
import { ArrowUpRight, X } from '../ui/icons'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'

/** Glass tooltip that follows the pointer over a building, and the detail panel a click opens. */
export default function CityUI() {
  const { t } = useI18n()
  const { user } = useSession()
  const tip = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<CityPick | null>(null)
  const [sel, setSel] = useState<CityPick | null>(null)
  useEffect(() => {
    const h = (p: CityPick | null) => {
      // position moves outside React; the text only re-renders when the building changes
      if (p && tip.current) tip.current.style.transform = `translate3d(${p.x + 18}px, ${p.y + 18}px, 0)`
      setHover(o => (o?.name === p?.name && o?.zone === p?.zone ? o : p))
    }
    const s = (p: CityPick | null) => setSel(p)
    cityBus.hover.add(h); cityBus.select.add(s)
    return () => { cityBus.hover.delete(h); cityBus.select.delete(s) }
  }, [])
  const close = () => { setSel(null); cityBus.emit(cityBus.reset, undefined) }
  useEffect(() => {
    if (!sel) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [sel])
  const z = sel ? ZONES[sel.zone] : null
  return (
    <>
      <div ref={tip} role="tooltip" className={`surface-float pointer-events-none fixed left-0 top-0 z-[70] !rounded-2xl px-4 py-3 backdrop-blur-xl transition-opacity duration-150 ${hover && !sel ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-[15px] font-medium leading-tight text-ink">{hover?.name}</p>
        <p className="label mt-1">{hover?.means}</p>
      </div>
      <AnimatePresence>
        {sel && z && (
          <>
            <m.button aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}
              className="pointer-events-auto absolute inset-0 z-20 cursor-default bg-[radial-gradient(60%_60%_at_50%_50%,transparent,rgb(var(--paper)/0.6))]" />
            <m.aside role="dialog" aria-label={sel.name} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="surface-float pointer-events-auto absolute right-4 top-1/2 z-30 w-[min(340px,calc(100%-2rem))] -translate-y-1/2 p-6 backdrop-blur-xl sm:right-8">
              <div className="flex items-start justify-between gap-3">
                <span className="badge !px-3 !py-1.5">{t('road.zone', { n: sel.zone + 1 })}</span>
                <button autoFocus onClick={close} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink"><X size={16} aria-hidden /></button>
              </div>
              <h3 className="mt-4 text-[28px] text-ink">{sel.name}</h3>
              <p className="mt-2 text-[17px] text-soft">{sel.means}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-ink/10 pt-5">
                <div><dt className="label">{t(`zone.${z.key}`)}</dt><dd className="num mt-1 text-[22px] text-ink">{z.title}</dd></div>
                <div><dt className="label">XP</dt><dd className="num mt-1 text-[22px] text-ink">{z.xp.toLocaleString('en-IN')}</dd></div>
              </dl>
              <Link to={user ? '/quest' : '/start'} className="btn mt-6 w-full">Start this quest<ArrowUpRight size={16} aria-hidden /></Link>
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
