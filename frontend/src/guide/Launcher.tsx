import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useGuide } from './GuideProvider'

const Root = lazy(() => import('./GuideRoot'))

/** If Dada Ji's code cannot load, fall back to the static help page. */
class Fallback extends Component<{ onFail: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  componentDidCatch() { this.props.onFail() }
  render() { return this.state.bad ? null : this.props.children }
}

/** The only part of Dada Ji in the entry chunk: a round badge, bottom right. Everything else loads on first use or when idle. */
export default function Launcher() {
  const g = useGuide()
  const { t } = useI18n()
  const { user } = useSession()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [load, setLoad] = useState(false)
  const inApp = !!user && pathname !== '/' && pathname !== '/start'
  useEffect(() => { const id = setTimeout(() => setLoad(true), 3500); return () => clearTimeout(id) }, [])
  // the first time someone reaches the Dashboard, Dada Ji introduces himself
  useEffect(() => { if (user && pathname === '/home' && !g.welcomed && !g.open && !g.tour) g.setOpen(true) }, [user, pathname, g.welcomed]) // eslint-disable-line react-hooks/exhaustive-deps
  if (pathname === '/help' || pathname === '/start' || pathname === '/login' || /^\/(lesson|play|story|world)/.test(pathname)) return null
  const pill = !g.opened
  return (
    <>
      {!g.open && !g.explain && (
        <button type="button" data-guide="guide-launcher" onClick={() => g.setOpen(true)} aria-label={t('guide.open')}
          className={`gd-launch fixed right-3 z-[65] flex items-center gap-2.5 rounded-full border border-[#E9A23B]/70 bg-card text-ink shadow-[0_10px_30px_rgb(0_0_0/.5)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 sm:right-6 ${pill && !g.tour ? 'pl-1 pr-5' : 'p-1'}`}
          style={{ bottom: pathname === '/coach' ? '46dvh' : inApp ? 'calc(88px + env(safe-area-inset-bottom))' : 'calc(20px + env(safe-area-inset-bottom))' }} /* on the Coach page he sits clear of the Send button */>
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#1B2622]">
            <svg viewBox="40 14 120 120" width="54" height="54" aria-hidden focusable="false">
              <path d="M52 134Q54 112 82 110L118 110Q146 112 148 134Z" fill="#22302B" /><path d="M88 110L100 134L112 110Z" fill="#F3EBDA" />
              <path d="M56 70Q54 22 100 22Q146 22 144 70L146 84Q138 60 100 60Q62 60 54 84Z" fill="#D5D9DE" />
              <ellipse cx="100" cy="78" rx="44" ry="41" fill="#E8B98F" />
              <path d="M58 62Q72 20 122 27Q146 32 143 62Q130 40 104 41Q78 41 58 62Z" fill="#EEF0F3" />
              <ellipse cx="83" cy="80" rx="3.5" ry="4" fill="#2A1D14" /><ellipse cx="117" cy="80" rx="3.5" ry="4" fill="#2A1D14" />
              <path d="M100 99Q90 92 77 101Q88 109 100 103Q112 109 123 101Q110 92 100 99Z" fill="#F7F8FA" />
              <g fill="rgb(132 88 22 / .3)" stroke="#D8B45A" strokeWidth="2.6"><circle cx="83" cy="80" r="14" /><circle cx="117" cy="80" r="14" /></g>
            </svg>
          </span>
          {pill && !g.tour && <span className="text-[15px] font-medium leading-tight">{t('guide.launch')}</span>}
        </button>
      )}
      {(load || g.open || g.tour || g.explain) && <Fallback onFail={() => nav('/help')}><Suspense fallback={null}><Root /></Suspense></Fallback>}
    </>
  )
}
