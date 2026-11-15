import { lazy, type ComponentType } from 'react'

/**
 * A code-split page. Renders lazily the first time, but once its chunk has been loaded
 * (preloaded for the first route, or prefetched while idle) it renders synchronously, so
 * React never shows a Suspense fallback for it. React 19 keeps a fallback on screen for at
 * least 300 ms once shown, which would otherwise delay the page's first content.
 */
function page(load: () => Promise<{ default: ComponentType }>) {
  let Loaded: ComponentType | null = null
  const fetch = () => load().then(m => { Loaded = m.default; return m })
  const Lazy = lazy(fetch)
  function Page() {
    return Loaded ? <Loaded /> : <Lazy />
  }
  return Object.assign(Page, { preload: () => fetch().then(() => undefined) })
}

export const PathPage = page(() => import('./pages/Path'))
export const Lesson = page(() => import('./pages/Lesson'))
export const Play = page(() => import('./pages/Play'))
export const Wardrobe = page(() => import('./pages/Wardrobe'))
export const Story = page(() => import('./pages/Story'))
export const Explore = page(() => import('./pages/Explore'))
export const ScamShield = page(() => import('./pages/ScamShield'))
export const EmployerCheck = page(() => import('./pages/EmployerCheck'))
export const Habits = page(() => import('./pages/Habits'))
export const MotionDebug = page(() => import('./pages/MotionDebug'))
export const Onboarding = page(() => import('./pages/Onboarding'))
export const Login = page(() => import('./pages/Login'))
export const HomePage = page(() => import('./pages/Home'))
export const Quest = page(() => import('./pages/Quest'))
export const Tracker = page(() => import('./pages/Tracker'))
export const Coach = page(() => import('./pages/Coach'))
export const Profile = page(() => import('./pages/Profile'))
export const Privacy = page(() => import('./pages/Privacy'))
export const Lab = page(() => import('./pages/Lab'))
export const LabStocks = page(() => import('./pages/LabStocks'))
export const LabReplay = page(() => import('./pages/LabReplay'))
export const LabRetire = page(() => import('./pages/LabRetire'))
export const LabFunds = page(() => import('./pages/LabFunds'))
export const LabSchemes = page(() => import('./pages/LabSchemes'))

const BY_PATH: Record<string, { preload: () => Promise<void> }> = {
  '/start': Onboarding, '/login': Login, '/home': PathPage, '/quest': Quest, '/tracker': Tracker, '/coach': Coach, '/profile': Profile, '/lab': Lab, '/lab/stocks': LabStocks, '/lab/replay': LabReplay, '/lab/retire': LabRetire, '/lab/funds': LabFunds, '/lab/schemes': LabSchemes,
}

/** Loads the chunk for the page being opened, before the first render. */
export const preloadRoute = (path: string) => BY_PATH[path]?.preload().catch(() => {}) ?? Promise.resolve()

/** Warms the chunks for the next step once the landing page is idle. */
export const prefetchNext = () => { void Onboarding.preload(); void HomePage.preload() }
