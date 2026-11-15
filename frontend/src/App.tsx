import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Compass as Home, FlaskConical, Menu, X, Lock, LogOut, MessageSquare, Moon, ScrollText, SlidersHorizontal, Sun, UserRound } from './components/ui/icons'
import { I18nProvider, LANGS, useI18n, type Lang } from './lib/i18n'
import { SessionProvider, useSession } from './lib/session'
import { api } from './lib/api'
import { useTheme } from './lib/theme'
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ToastProvider } from './ui/Toast'
import { page as pageMotion } from './ui/motion'
import { useReduceMotion } from './lib/motionPref'
import { Disclaimer, Label } from './components/ui/kit'
import { Boot, Celebration, HudBar } from './components/ui/game'
import Launcher from './guide/Launcher'
import { GuideProvider } from './guide/GuideProvider'
import { GameEventsProvider } from './lib/events'
import Landing from './pages/Landing'
import Cursor from './ui/Cursor'

import { Coach, EmployerCheck, Habits, ScamShield, Explore, Lesson, Play, Wardrobe, MotionDebug, Story, Onboarding, Login, PathPage, Privacy, Profile, Quest, Tracker, Lab, LabStocks, LabReplay, LabRetire, LabFunds, LabSchemes } from './routes'
import { useRepriceHoldings } from './lib/marketDay'

const TABS = [
  { to: '/home', key: 'nav.path', icon: Home },
  { to: '/tracker', key: 'nav.tracker', icon: SlidersHorizontal },
  { to: '/lab', key: 'nav.lab', icon: FlaskConical },
  { to: '/coach', key: 'nav.coach', icon: MessageSquare },
  { to: '/profile', key: 'nav.profile', icon: UserRound },
]

function Wordmark() {
  return (
    <Link to="/" className="flex min-h-[44px] items-center gap-2.5" aria-label="SixtyFy">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-forest" />
        <path d="M8 22 16 9l8 13" fill="none" className="stroke-on-forest" strokeWidth="2.200" strokeLinejoin="round" />
        <path d="M16 9v13" className="stroke-on-forest" strokeOpacity="0.45" strokeWidth="1.800" />
      </svg>
      <span className="text-[19px] font-semibold leading-none tracking-[-0.03em] text-ink">SixtyFy</span>
    </Link>
  )
}

export function LangSelect() {
  const { lang, setLang, t } = useI18n()
  const { user } = useSession()
  return (
    <select data-guide="lang"
      aria-label={t('pro.lang')}
      value={lang}
      onChange={e => {
        const l = e.target.value as Lang
        setLang(l)
        if (user) api.update({ language: l }).catch(() => {})
      }}
      className="label h-11 cursor-pointer rounded-full border border-ink/15 bg-transparent px-3 !text-ink transition-colors hover:border-ink/40"
    >
      {LANGS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  )
}

function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-pressed={dark}
      aria-label={t('pro.theme')} title={dark ? t('pro.light') : t('pro.dark')}
      className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink transition-transform hover:border-ink/40 active:scale-95"
    >
      {/* the icon turns as it swaps */}
      <span key={theme} className="theme-swap grid place-items-center">
        {dark ? <Sun size={18} strokeWidth={1.5} aria-hidden /> : <Moon size={18} strokeWidth={1.5} aria-hidden />}
      </span>
    </button>
  )
}

/** Desktop tabs with an underline that slides to the active tab (transform only). */
function TopTabs() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const nav = useRef<HTMLElement>(null)
  const [bar, setBar] = useState({ x: 0, w: 0 })
  useLayoutEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]')
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth })
  }, [pathname, t])
  return (
    <nav ref={nav} aria-label="Main" className="relative hidden items-center gap-1 md:flex">
      {TABS.map(tab => (
        <NavLink key={tab.to} to={tab.to} data-guide={`nav-${tab.to.slice(1)}`} className={({ isActive }) => `relative z-10 flex h-11 items-center px-4 text-[15px] transition-colors hover:text-ink ${isActive ? 'text-ink' : 'text-ink/70'}`}>{t(tab.key)}</NavLink>
      ))}
      <m.span aria-hidden className="absolute left-0 top-1 h-9 rounded-full bg-ink/10" initial={false}
        animate={{ x: bar.x, width: bar.w, opacity: bar.w ? 1 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} />
    </nav>
  )
}

/** Top-right account button: who is signed in, a shortcut to the profile, the theme switch and log out. */
function AccountMenu() {
  const { t } = useI18n()
  const { user, reset } = useSession()
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const { pathname } = useLocation()
  const dark = theme === 'dark'
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  if (!user) return null
  const item = 'flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-ink hover:bg-haze'
  return (
    <div ref={box} className="relative">
      <button type="button" data-guide="account" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={t('nav.account')}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-forest font-semibold text-on-forest transition-transform active:scale-95 ${open ? 'ring-2 ring-ink/40 ring-offset-2 ring-offset-paper' : ''}`}>
        {user.name.trim().charAt(0).toUpperCase() || <UserRound size={18} strokeWidth={1.5} aria-hidden />}
      </button>
      {open && (
        <div role="menu" className="surface-float absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <span className="label block">{t('nav.signedIn')}</span>
            <span className="block truncate font-medium text-ink">{user.name}</span>
            <span className="block truncate text-sm text-soft">{user.email}</span>
          </div>
          <Link role="menuitem" to="/profile" className={item}><UserRound size={16} strokeWidth={1.5} aria-hidden />{t('nav.profile')}</Link>
          <Link role="menuitem" to="/privacy" className={item}><Lock size={16} strokeWidth={1.5} aria-hidden />{t('nav.privacy')}</Link>
          <button role="menuitem" type="button" className={item} onClick={() => setTheme(dark ? 'light' : 'dark')}>
            {dark ? <Sun size={16} strokeWidth={1.5} aria-hidden /> : <Moon size={16} strokeWidth={1.5} aria-hidden />}{dark ? t('pro.light') : t('pro.dark')}
          </button>
          <button role="menuitem" type="button" className={`${item} border-t border-line`} onClick={() => { setOpen(false); reset(); nav('/') }}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden />{t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { t, ready } = useI18n()
  useRepriceHoldings()
  const { user, loading } = useSession()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  useEffect(() => { setMenu(false) }, [pathname])
  // lessons are full-screen focus mode: no header, HUD or tabs
  if (pathname.startsWith('/lesson') || pathname.startsWith('/play') || pathname.startsWith('/story') || pathname === '/world') return <main id="main">{children}</main>
  const inGame = !!user && pathname !== '/' && pathname !== '/start'
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      {/* the one ambient effect: a slow light behind the page's hero */}
      <m.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-3 top-3 z-40 mx-auto flex h-[56px] max-w-[1100px] items-center justify-between gap-3 rounded-full border border-ink/20 bg-paper/50 pl-5 pr-2 backdrop-blur-xl sm:inset-x-6 sm:top-[18px]">
        <Wordmark />
        {inGame && <TopTabs />}
        {!inGame && pathname === '/' && <nav aria-label="Main" className="hidden items-center gap-7 md:flex"><a href="#how" className="text-[15px] text-ink/85 transition-colors hover:text-ink">{t('land.how')}</a></nav>}
        <div className="flex items-center gap-2">
          <LangSelect />
          {!inGame && <ThemeToggle />}
          {!inGame && !user && !loading && pathname !== '/login' && <Link to="/login" className="btn hidden !min-h-[44px] !px-5 sm:inline-flex">{t('land.signin')}</Link>}
          {inGame && <AccountMenu />}
          {!inGame && <button type="button" onClick={() => setMenu(true)} aria-label="Menu" aria-expanded={menu} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink md:hidden"><Menu size={18} strokeWidth={1.5} aria-hidden /></button>}
        </div>
      </m.header>

      <AnimatePresence>
        {menu && (
          <m.div role="dialog" aria-modal="true" aria-label="Menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col bg-paper/95 px-6 pb-10 pt-5 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between"><Wordmark />
              <button type="button" autoFocus onClick={() => setMenu(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink"><X size={18} strokeWidth={1.5} aria-hidden /></button>
            </div>
            <nav aria-label="Main" className="mt-14 flex flex-1 flex-col">
              {[['/', 'SixtyFy'], ['/#how', t('land.how')], ...(user ? [] : [['/login', t('land.signin')]]), ['/privacy', t('nav.privacy')]].map(([to, label], i) => (
                <m.div key={to} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="border-b border-ink/10">
                  {to === '/#how'
                    ? <a href={to} onClick={() => setMenu(false)} className="flex min-h-[72px] items-center text-[32px] font-semibold tracking-[-0.035em] text-ink">{label}</a>
                    : <Link to={to} onClick={() => setMenu(false)} className="flex min-h-[72px] items-center text-[32px] font-semibold tracking-[-0.035em] text-ink">{label}</Link>}
                </m.div>
              ))}
            </nav>
            <Link to={user ? '/home' : '/start'} onClick={() => setMenu(false)} className="btn w-full">{user ? t('land.resume') : t('land.cta')}</Link>
          </m.div>
        )}
      </AnimatePresence>

      <main id="main" className="relative flex-1 pt-[88px] sm:pt-[104px]">
        {inGame && <div className="mb-5"><HudBar /></div>}
        <div>{children}</div>
      </main>

      <footer className={`relative mx-auto mt-24 w-full max-w-[1200px] overflow-hidden border-t border-line px-6 pt-8 sm:px-12 ${inGame ? 'pb-28 md:pb-8' : 'pb-8'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Disclaimer className="max-w-xl" />
          <Link to="/privacy" className="label inline-flex min-h-[44px] shrink-0 items-center gap-1.5 hover:text-ink"><Lock size={12} strokeWidth={1.5} aria-hidden />{t('nav.privacy')}</Link>
        </div>
        {!inGame && <p aria-hidden className="grad pointer-events-none mt-10 select-none text-center text-[clamp(72px,21vw,280px)] font-semibold leading-[0.8] tracking-[-0.06em] opacity-[0.16]">SixtyFy</p>}
      </footer>

      {inGame && (
        <nav aria-label="Main" className="fixed inset-x-3 z-40 overflow-hidden rounded-full border border-ink/20 bg-paper/70 backdrop-blur-xl md:hidden" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <ul className="grid grid-cols-5">
            {TABS.map(tab => (
              <li key={tab.to}>
                <NavLink to={tab.to} data-guide={`nav-${tab.to.slice(1)}`}
                  className={({ isActive }) => `flex h-[60px] flex-col items-center justify-center gap-0.5 transition-colors ${isActive ? 'bg-ink/10 text-ink' : 'text-soft'}`}>
                  <tab.icon size={20} strokeWidth={1.5} aria-hidden />
                  <span className="text-[11px] font-medium tracking-wide">{t(tab.key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  const { t } = useI18n()
  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Label>{t('common.loading')}</Label></div>
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function Routed() {
  const location = useLocation()
  const { loading } = useSession()
  const { ready } = useI18n()
  const { t } = useI18n()
  const wait = <div className="grid min-h-[50vh] place-items-center"><Label>{t('common.loading')}</Label></div>
  return (
    <>
    <Shell>
      <Suspense fallback={wait}>
        {/* the outgoing page keeps its own location while it fades out */}
        <AnimatePresence mode="wait" initial={false}>
        <m.div key={location.pathname} {...pageMotion}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/home" element={<Guard><PathPage /></Guard>} />
          <Route path="/lesson/:id" element={<Guard><Lesson /></Guard>} />
          <Route path="/play/:id" element={<Guard><Play /></Guard>} />
          <Route path="/wardrobe" element={<Guard><Wardrobe /></Guard>} />
          <Route path="/story/:id" element={<Guard><Story /></Guard>} />
          <Route path="/world" element={<Guard><Explore /></Guard>} />
          <Route path="/shield" element={<Guard><ScamShield /></Guard>} />
          <Route path="/employer" element={<Guard><EmployerCheck /></Guard>} />
          <Route path="/habits" element={<Guard><Habits /></Guard>} />
          <Route path="/quest" element={<Guard><Quest /></Guard>} />
          <Route path="/tracker" element={<Guard><Tracker /></Guard>} />
          <Route path="/simulator" element={<Navigate to="/tracker" replace />} />
          <Route path="/coach" element={<Guard><Coach /></Guard>} />
          <Route path="/lab" element={<Guard><Lab /></Guard>} />
          <Route path="/lab/stocks" element={<Guard><LabStocks /></Guard>} />
          <Route path="/lab/replay" element={<Guard><LabReplay /></Guard>} />
          <Route path="/lab/retire" element={<Guard><LabRetire /></Guard>} />
          <Route path="/lab/funds" element={<Guard><LabFunds /></Guard>} />
          <Route path="/lab/schemes" element={<Guard><LabSchemes /></Guard>} />
          <Route path="/profile" element={<Guard><Profile /></Guard>} />
          {import.meta.env.DEV && <Route path="/motion-debug" element={<MotionDebug />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </m.div>
        </AnimatePresence>
      </Suspense>
    </Shell>
    <Launcher />
    <Cursor />
    <Celebration />
    <Boot ready={!loading && ready} />
    </>
  )
}

const Help = lazy(() => import('./pages/Help'))
const motionFeatures = () => import('./lib/motionFeatures').then(r => r.default)

export default function App() {
  const reduce = useReduceMotion()
  // pause the ambient light while the tab is hidden
  useEffect(() => {
    const on = () => { document.documentElement.dataset.hidden = String(document.visibilityState === 'hidden') }
    document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
    <LazyMotion features={motionFeatures} strict>
    <ToastProvider>
    <BrowserRouter>
      <I18nProvider>
        <SessionProvider>
          <GameEventsProvider>
            <GuideProvider><Routed /></GuideProvider>
          </GameEventsProvider>
        </SessionProvider>
      </I18nProvider>
    </BrowserRouter>
    </ToastProvider>
    </LazyMotion>
    </MotionConfig>
  )
}
