import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useGuide } from './GuideProvider'
import { GLOBAL, OPTIONAL, TARGETS, findTarget } from './targets'
import type { Content } from './types'

const COOLDOWN = 90_000

/** One small tip per page visit, from the launcher: on the first visit to a page, or after 20 seconds without activity. Stays until dismissed. */
export default function Nudge({ c }: { c: Content }) {
  const g = useGuide(), u = c.ui
  const { user } = useSession()
  const { pathname } = useLocation()
  const [tip, setTip] = useState<string | null>(null)
  const route = c.nudges[pathname] ? pathname : ''
  const game = pathname.match(/^\/lab\/(retire|stocks|funds|schemes)$/)?.[1]
  useEffect(() => {
    setTip(null)
    if (!g.tips || !g.welcomed || !user || !route) return
    let shown = false
    const show = (text: string, seen?: string) => { if (shown || Date.now() - g.nudgeAt < COOLDOWN) return; shown = true; setTip(text); g.save({ nudgeAt: Date.now(), ...(seen ? { seen: [...g.seen, seen] } : {}) }) }
    let idle = 0
    const first = !g.seen.includes(route) ? window.setTimeout(() => show(c.nudges[route], route), 1500) : 0
    const arm = () => { clearTimeout(idle); idle = window.setTimeout(() => show(c.nudges.idle), 20_000) }
    const kinds = ['pointerdown', 'keydown', 'scroll'] as const
    arm(); kinds.forEach(k => addEventListener(k, arm, { passive: true, capture: true }))
    return () => { clearTimeout(first); clearTimeout(idle); kinds.forEach(k => removeEventListener(k, arm, { capture: true })) }
  }, [route, g.tips, g.welcomed, !!user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ?guide=debug lists targets that are missing on this page (development aid)
  const debug = import.meta.env.DEV && new URLSearchParams(location.search).get('guide') === 'debug'
  const [missing, setMissing] = useState<string[]>([])
  useEffect(() => { if (!debug) return; const id = setTimeout(() => setMissing([...GLOBAL, ...(TARGETS[route] ?? [])].filter(t => !OPTIONAL.includes(t) && !findTarget(t))), 1500); return () => clearTimeout(id) }, [debug, route])

  return (<>
    {debug && <pre data-gd-ui className="fixed left-2 top-2 z-[99] max-w-xs rounded-lg bg-black/90 p-3 text-[12px] text-ink">guide targets on {route || pathname}{'\n'}{missing.length ? `missing: ${missing.join(', ')}` : 'all present'}</pre>}
    {tip && !g.open && !g.tour && !g.explain && (
      <m.div role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="gd-panel fixed right-3 z-[65] w-[min(300px,calc(100vw-24px))] rounded-[20px] p-3.5 sm:right-6" style={{ bottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
        <p className="font-serif text-[15.5px] leading-snug text-ink">{tip}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" className="min-h-[48px] rounded-full bg-[#E9A23B] px-4 text-[14.5px] font-medium text-[#1B2622]" onClick={() => { setTip(null); if (game) g.startTour(game); else g.setOpen(true) }}>{game ? u.teach : u.name}</button>
          <button type="button" className="min-h-[48px] rounded-full border border-ink/20 px-4 text-[14.5px] text-ink" onClick={() => setTip(null)}>{u.gotIt}</button>
          <button type="button" className="link !min-h-[48px] px-1 text-[13.5px] text-soft" onClick={() => { setTip(null); g.save({ tips: false }) }}>{u.stopTips}</button>
        </div>
      </m.div>
    )}
  </>)
}
