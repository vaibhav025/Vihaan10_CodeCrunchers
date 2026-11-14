import { lazy, Suspense, useEffect, useState } from 'react'
import WorldStill from './WorldStill'
import { idleAfterPaint } from '../../lib/idle'
import { prefersLessMotion } from '../../lib/motionPref'
import type { SurveyId, WorldValues } from './Scene'

const loadScene = () => import('./Scene')
const Scene = lazy(loadScene)

/**
 * Whether this device should run the live 3D scene. The still drawing is used instead when
 * the user asks for less motion or data, there is no WebGL, or it is a small low-power device.
 */
let live: boolean | null = null
export function canRunLive() {
  if (live !== null && !prefersLessMotion()) return live
  if (prefersLessMotion()) return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  const reduced = prefersLessMotion()
  const lowEnd = window.innerWidth < 640 && (navigator.hardwareConcurrency ?? 8) <= 4
  let webgl = false
  if (!reduced && !nav.connection?.saveData && !lowEnd) {
    try {
      const c = document.createElement('canvas')
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch { webgl = false }
  }
  live = webgl
  return live
}

/** Follows the page theme so the scene can switch to night. */
function useIsDark() {
  const [dark, setDark] = useState(() => !!document.documentElement.dataset.theme)
  useEffect(() => {
    const o = new MutationObserver(() => setDark(!!document.documentElement.dataset.theme))
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => o.disconnect()
  }, [])
  return dark
}

interface Props extends WorldValues {
  /** Plain-language description of what the scene shows, for screen readers. */
  label: string
  onSurvey?: (id: SurveyId) => void
  className?: string
}

/**
 * The diorama. The still drawing paints first (it is the page's largest element); the 3D scene
 * loads when the browser is idle and fades in over it.
 */
export default function World({ label, onSurvey, className = '', ...values }: Props) {
  const [failed, setFailed] = useState(false)
  const [mount, setMount] = useState(false)
  const [ready, setReady] = useState(false)
  const night = useIsDark()
  const wantLive = !failed && canRunLive()

  useEffect(() => (wantLive ? idleAfterPaint(() => setMount(true)) : undefined), [wantLive])

  const showLive = wantLive && mount
  return (
    <div role="img" aria-label={label} className={`relative ${className}`}>
      {/* soft ground shadow under the floating tile */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[12%] bottom-[9%] h-[14%] rounded-[50%] bg-ink/15 blur-2xl" />
      <WorldStill vitality={values.vitality} road={values.road}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 will-change-[opacity] ${ready ? 'opacity-0' : 'opacity-100'}`} />
      {wantLive && !ready && <Building />}
      {showLive && (
        <Suspense fallback={null}>
          <div className={`absolute inset-0 transition-opacity duration-500 will-change-[opacity] ${ready ? 'opacity-100' : 'opacity-0'}`}>
            <Scene values={{ ...values, night }} onSurvey={onSurvey} onReady={() => setReady(true)} onFail={() => { setFailed(true); setReady(false) }} />
          </div>
        </Suspense>
      )}
    </div>
  )
}

/** Warms the 3D chunk without mounting it. */
export const prefetchWorld = () => { if (canRunLive()) void loadScene() }

/** Shown over the still drawing until the 3D scene is ready. */
function Building() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex flex-col items-center gap-2" role="status">
      <span className="label rounded border border-line bg-card/90 px-2.5 py-1.5 !text-ink">Building world</span>
      <span className="loadbar h-[2px] w-28 overflow-hidden rounded bg-line" />
    </div>
  )
}

export type { SurveyId, WorldValues }
