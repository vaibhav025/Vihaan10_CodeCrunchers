import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import WorldStill from './WorldStill'
import { canRunLive } from './World'
import { worldFromProfile, ZONES, type Profile } from './worldFromProfile'
import { clearDebug, setDebug, setDebugNight, useDebugNight, useDebugOverrides } from './debug'
import { useMeta } from '../../lib/useMeta'
import type { ScenePulse } from './LifeScene'
import { idleAfterPaint } from '../../lib/idle'
import { useI18n } from '../../lib/i18n'
import { useGameEvents } from '../../lib/events'
import { useTheme } from '../../lib/theme'
import { stateVitality, STATES, type FutureState } from '../../design-tokens'

const LifeScene = lazy(() => import('./LifeScene'))

/**
 * The Life Road. Takes the player's profile, maps it through worldFromProfile, and decides
 * which newly reached zones play their build sequence (once per level, remembered per device).
 */
export default function LifeWorld({ profile, userId, mode = 'home', scrollS = 0, pulse, label, className = '', onGhostTap, backdrop }: {
  profile: Profile; userId: string; mode?: 'home' | 'quest' | 'landing'; scrollS?: number; pulse?: ScenePulse | null
  /** Behind other content: no controls, no debug panel. */ backdrop?: boolean
  label: string; className?: string; onGhostTap?: (zone: number) => void
}) {
  const { t } = useI18n()
  const [theme] = useTheme()
  const { current: celebration } = useGameEvents()
  const debug = useDebugOverrides()
  const night = useDebugNight()
  const meta = useMeta()
  const world = useMemo(() => worldFromProfile({ ...profile, ...debug }), [profile, debug])

  const seenKey = `pq.seenLevel.${userId}`
  const [seen, setSeen] = useState(() => Number(localStorage.getItem(seenKey) ?? 0))
  // the landing fly-through builds zones as you scroll, never as a cinematic
  const play = useMemo(() => mode === 'landing' ? [] : Array.from({ length: Math.max(world.level - seen, 0) }, (_, i) => seen + i), [world.level, seen, mode])
  const [announce, setAnnounce] = useState('')
  const onPlayed = useCallback(() => {
    localStorage.setItem(seenKey, String(world.level))
    const z = ZONES[world.level - 1]
    setAnnounce(t('w.unlocked', { n: z.level, title: z.title, zone: t(`zone.${z.key}`) }))
    setSeen(world.level)
  }, [seenKey, world.level, t])

  const [mount, setMount] = useState(false)
  const [ready, setReady] = useState(false)
  const [cine, setCine] = useState(false)
  const [away, setAway] = useState(false)
  const [skip, setSkip] = useState(0)
  const [recenter, setRecenter] = useState(0)
  const live = canRunLive()
  useEffect(() => (live ? idleAfterPaint(() => setMount(true)) : undefined), [live])

  return (
    <div className={`relative ${className}`}>
      <div role="img" aria-label={label} className="absolute inset-0">
        <WorldStill vitality={stateVitality[world.futureYouState]} road={world.pavedSegments / 30} level={world.level}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? 'opacity-0' : 'opacity-100'}`} />
        {live && mount && (
          <Suspense fallback={null}>
            <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
              <LifeScene world={world} mode={mode} scrollS={scrollS} dark={theme === 'dark' || night} cosmetics={meta.equipped} pulse={pulse} play={play} canPlay={!celebration}
                recenter={recenter} skip={skip} onPlayed={onPlayed} onCinematic={setCine} onLookAway={setAway}
                onGhostTap={onGhostTap} onReady={() => setReady(true)} />
            </div>
          </Suspense>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
      {!backdrop && <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center gap-2">
        {cine && <button className="link pointer-events-auto rounded border border-line bg-card/95 px-3 !no-underline" onClick={() => setSkip(s => s + 1)}>{t('w.skip')}</button>}
        {away && !cine && <button className="link pointer-events-auto rounded border border-line bg-card/95 px-3 !no-underline" onClick={() => setRecenter(r => r + 1)}>{t('w.recenter')}</button>}
      </div>}
      {import.meta.env.DEV && !backdrop && <DebugPanel world={world} onReplay={() => { localStorage.setItem(seenKey, '0'); setSeen(0) }} />}
    </div>
  )
}

/** Dev only: preview any level, streak or state without playing. */
function DebugPanel({ world, onReplay }: { world: ReturnType<typeof worldFromProfile>; onReplay: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute right-2 top-2 z-20 text-[12px]">
      <button className="label rounded border border-line bg-card px-2 py-1" onClick={() => setOpen(!open)}>Debug</button>
      {open && (
        <div className="hud mt-1 w-56 space-y-2 p-3">
          <label className="block">XP {world.xp}<input type="range" min={0} max={32000} step={50} value={world.xp} onChange={e => setDebug({ xp: +e.target.value })} /></label>
          <label className="block">Quests {world.questsCompleted}<input type="range" min={0} max={30} value={world.questsCompleted} onChange={e => setDebug({ questsCompleted: +e.target.value })} /></label>
          <label className="block">Streak {world.streakDays}<input type="range" min={0} max={30} value={world.streakDays} onChange={e => setDebug({ streakDays: +e.target.value })} /></label>
          <select className="field !min-h-0 py-1" value={world.futureYouState} onChange={e => setDebug({ futureYouState: e.target.value as FutureState })}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={useDebugNight()} onChange={e => setDebugNight(e.target.checked)} />Night (time of day)</label>
          <div className="flex gap-3"><button className="link" onClick={onReplay}>Replay unlocks</button><button className="link" onClick={clearDebug}>Reset</button></div>
        </div>
      )}
    </div>
  )
}
