import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { AnimatePresence, m } from 'framer-motion'
import { X } from '../components/ui/icons'
import { canRunLive } from '../components/world/World'
import { worldFromProfile } from '../components/world/worldFromProfile'
import type { ExploreLive } from '../components/world/explore/state'
import { useLifeProfile } from '../lib/useWorld'
import { useSession } from '../lib/session'
import { useI18n } from '../lib/i18n'
import { NODES, nodeStates } from '../lib/path'
import { prefersLessMotion } from '../lib/motionPref'

const ExploreScene = lazy(() => import('../components/world/explore/ExploreScene'))

/** The explorable world: intro island, "Tap to begin", then a district to walk around. */
export default function Explore() {
  const { t } = useI18n()
  const nav = useNavigate()
  const { progress } = useSession()
  const profile = useLifeProfile()
  const world = useMemo(() => profile && worldFromProfile(profile), [profile])
  const live = useRef<ExploreLive | null>(null)
  const reduced = prefersLessMotion()
  const [begun, setBegun] = useState(reduced)
  const [ready, setReady] = useState(false)
  if (world && !live.current) {
    live.current = { world, open: reduced ? 1 : 0, openTo: reduced ? 1 : 0, u: 0.05, goal: null, keys: new THREE.Vector2(), pos: new THREE.Vector3(),
      heading: new THREE.Vector3(0, 0, 1), moving: false, busy: true, still: reduced }
  }
  if (live.current && world) live.current.world = world

  const begin = () => {
    const L = live.current
    if (!L) return
    if (L.openTo === 1) { L.open = 1; return } // a second tap skips the transition
    L.openTo = 1; L.busy = true; setBegun(true)
  }
  // keyboard: arrows or WASD walk, Enter begins, Esc leaves
  useEffect(() => {
    const k = new Set<string>()
    const apply = () => {
      const L = live.current; if (!L) return
      const x = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0)
      const z = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0)
      L.keys.set(x, z); L.busy = true
    }
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) { e.preventDefault(); k.add(key); apply() }
      if (key === 'enter' && !begun) begin()
      if (key === 'escape') nav('/home')
    }
    const up = (e: KeyboardEvent) => { k.delete(e.key.toLowerCase()); apply() }
    addEventListener('keydown', down); addEventListener('keyup', up)
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up) }
  })

  const current = NODES[nodeStates(progress.nodes).indexOf('current')]
  const questHref = current ? (current.type === 'story' ? `/story/${current.id}` : current.type === 'chest' ? '/home' : `/lesson/${current.id}`) : '/home'
  const live3d = canRunLive()

  return (
    <div className={`fixed inset-0 z-50 transition-colors duration-[2000ms] ${begun ? 'bg-[#F2EFDF]' : 'bg-[#101A14]'}`}>
      {/* still of the intro island while the 3D loads (and for devices without 3D) */}
      {!ready && <IntroStill />}
      {live3d && world && live.current && (
        <Suspense fallback={null}>
          <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            <ExploreScene live={live as React.MutableRefObject<ExploreLive>} world={world} onReady={() => setReady(true)} />
          </div>
        </Suspense>
      )}

      <button onClick={() => nav('/home')} aria-label={t('ls.close')}
        className={`absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded border ${begun ? 'border-line bg-card text-ink' : 'border-white/15 text-[#ECE9DA]'}`}><X size={20} aria-hidden /></button>

      <AnimatePresence>
        {!begun && (
          <m.button key="begin" onClick={begin} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }}
            className="absolute inset-x-0 bottom-[12%] mx-auto w-fit rounded-md border border-[#F0B67A]/50 bg-[#101A14]/80 px-6 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[#F0B67A] backdrop-blur hover:bg-[#101A14]">
            {t('ex.begin')}
          </m.button>
        )}
      </AnimatePresence>

      {begun && (
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 1.8 }}
          className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <p className="label rounded border border-line bg-card/90 px-3 py-2 !normal-case !tracking-normal">{t('ex.hintMove')}</p>
          {/* the primary path never needs the world */}
          <Link to={questHref} className="btn game-btn">{t('ex.quest')}</Link>
        </m.div>
      )}
    </div>
  )
}

function IntroStill() {
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 m-auto h-[50vh] w-full" aria-hidden>
      <defs><radialGradient id="rim" cx="50%" cy="50%" r="50%"><stop offset="80%" stopColor="#F0B67A" stopOpacity="0" /><stop offset="100%" stopColor="#F0B67A" stopOpacity="0.5" /></radialGradient></defs>
      <ellipse cx="200" cy="160" rx="96" ry="34" fill="url(#rim)" />
      <ellipse cx="200" cy="160" rx="84" ry="28" fill="#C6D6A0" />
      <path d="M116 160c10 40 60 70 84 80 24-10 74-40 84-80-20 18-60 28-84 28s-64-10-84-28Z" fill="#B98E66" />
      <rect x="194" y="128" width="12" height="20" rx="2" fill="#4C6A58" /><circle cx="200" cy="122" r="6" fill="#D9B99B" />
    </svg>
  )
}
