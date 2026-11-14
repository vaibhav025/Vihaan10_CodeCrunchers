import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Build-in animation. Each zone has a clock: `start` is the scene time its unlock sequence
 * begins (-Infinity when it is already built, Infinity when it has not started).
 */
export interface ZoneClock { start: number }
export const ClockCtx = createContext<{ clock: ZoneClock; busy: { current: boolean } }>(null!)

const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
/** Rise with a slight overshoot, like a spring settling. */
export const springOut = (x: number) => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }

const RING = new THREE.RingGeometry(0.55, 0.75, 24).rotateX(-Math.PI / 2)
const DUST = new THREE.MeshBasicMaterial({ color: '#E9DFC6', transparent: true, depthWrite: false })

/** One piece of a zone: rises from the ground at `at` seconds, then kicks up a dust ring. */
export function Piece({ at, dur = 0.55, h = 1, dust = 1, children, ...rest }: {
  at: number; dur?: number; h?: number; dust?: number; children: ReactNode
} & ThreeElements['group']) {
  const g = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const mat = useRef(DUST.clone())
  const { clock, busy } = useContext(ClockCtx)
  useFrame(state => {
    const t = state.clock.elapsedTime - clock.start - at
    const p = t / dur, e = springOut(p)
    g.current.visible = p > 0
    g.current.position.y = -h * (1 - e)
    g.current.scale.setScalar(0.55 + 0.45 * Math.min(e, 1.08))
    const d = (t - dur * 0.7) / 0.6
    const showDust = dust > 0 && d > 0 && d < 1
    ring.current.visible = showDust
    if (showDust) { ring.current.scale.setScalar(dust * (0.4 + d * 1.4)); mat.current.opacity = (1 - d) * 0.55 }
    if (t > -0.1 && t < dur + 0.7) busy.current = true
  })
  return (
    <group {...rest}>
      <group ref={g}>{children}</group>
      <mesh ref={ring} geometry={RING} material={mat.current} position={[0, 0.03, 0]} />
    </group>
  )
}

/** A light sweep across the zone once its sequence completes. */
export function Sweep({ at, r = 4 }: { at: number; r?: number }) {
  const m = useRef<THREE.Mesh>(null!)
  const mat = useRef(new THREE.MeshBasicMaterial({ color: '#F0B67A', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  const { clock, busy } = useContext(ClockCtx)
  useFrame(state => {
    const d = (state.clock.elapsedTime - clock.start - at) / 0.9
    const on = d > 0 && d < 1
    m.current.visible = on
    if (on) { m.current.scale.setScalar(r * (0.2 + d)); mat.current.opacity = (1 - d) * 0.6; busy.current = true }
  })
  return <mesh ref={m} geometry={RING} material={mat.current} position={[0, 0.05, 0]} />
}

export function Flat(props: ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial flatShading roughness={0.95} {...props} />
}
