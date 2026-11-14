import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useLive } from './sceneState'
import type { FutureState } from '../../design-tokens'

// State = how the world feels. Light warmth, fog density and vegetation health; never what is built.
const FEEL: Record<FutureState, { warm: number; fog: number; life: number }> = {
  thriving: { warm: 1, fog: 1, life: 1 },
  stable: { warm: 0.8, fog: 0.85, life: 0.85 },
  struggling: { warm: 0.5, fog: 0.65, life: 0.6 },
  critical: { warm: 0.25, fog: 0.45, life: 0.35 },
  zero: { warm: 0, fog: 0.3, life: 0.15 },
}

export const foliage = { color: new THREE.Color('#2b3530') }

export default function Atmosphere() {
  const live = useLive()
  const scene = useThree(s => s.scene)
  const key = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const c = useMemo(() => ({
    warm: new THREE.Color('#FFE9D2'), cold: new THREE.Color('#C7CED3'), moon: new THREE.Color('#aab4c6'),
    paper: new THREE.Color('#F7F5E8'), night: new THREE.Color('#050506'),
    green: new THREE.Color('#2f3a33'), gold: new THREE.Color('#FFB866'), goldFog: new THREE.Color('#F6DDB5'), overcast: new THREE.Color('#D3D6D1'), dull: new THREE.Color('#2a2b2b'), tmp: new THREE.Color(),
  }), [])
  const cur = useRef({ warm: 0.5, fog: 0.5, life: 0.5, dim: 1, dark: 0 })
  if (!scene.fog) scene.fog = new THREE.Fog('#F7F5E8', 24, 60)

  useFrame((state, dt) => {
    const L = live.current, f = FEEL[L.world.futureYouState], k = Math.min(dt * 2, 1), s = cur.current
    // level 1 starts in fog; each level pushes it back
    const fogAmt = f.fog * (0.55 + L.world.level * 0.065)
    const dimPulse = Math.max(0, 1 - Math.abs(state.clock.elapsedTime - L.dimAt - 0.3) / 0.3) * 0.25
    const dim = (L.mode === 'quest' ? 0.85 : 1) - dimPulse
    const before = s.warm + s.fog + s.dim + s.dark
    s.warm += (f.warm - s.warm) * k; s.fog += (fogAmt - s.fog) * k; s.life += (f.life - s.life) * k
    s.dim += (dim - s.dim) * Math.min(dt * 6, 1); s.dark += ((L.dark ? 1 : 0) - s.dark) * k
    if (Math.abs(before - (s.warm + s.fog + s.dim + s.dark)) > 0.0005) L.busy.current = true

    // the shadow light travels with whatever the camera is looking at
    const at = L.cine.active ? L.cine.target : L.charPos
    key.current.position.set(at.x + 9, 12, at.z + 4)
    key.current.target.position.copy(at); key.current.target.updateMatrixWorld()
    key.current.color.lerpColors(c.cold, c.warm, s.warm).lerp(c.moon, s.dark * 0.8)
    // Legend: golden hour
    if (L.world.level >= 7) key.current.color.lerp(c.gold, 0.6 * (1 - s.dark))
    key.current.intensity = (1.5 + s.warm * 1.3) * s.dim * (1 - s.dark * 0.45)
    hemi.current.intensity = 1.9 * s.dim * (1 - s.dark * 0.45)
    const fog = scene.fog as THREE.Fog
    fog.color.lerpColors(c.paper, c.night, s.dark).lerp(c.overcast, (1 - s.warm) * 0.5 * (1 - s.dark))
    if (L.world.level >= 7) fog.color.lerp(c.goldFog, 0.35 * (1 - s.dark))
    fog.near = 14 + s.fog * 14; fog.far = 30 + s.fog * 36
    foliage.color.lerpColors(c.dull, c.green, s.life)
  })

  return (
    <>
      <Rain />
      <hemisphereLight ref={hemi} args={['#dfe6f0', '#3a3c42', 1.9]} />
      <directionalLight ref={key} position={[9, 12, 4]} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006}>
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 0.5, 60]} />
      </directionalLight>
    </>
  )
}

const DROPS = 140
/** Drizzle over the camera's focus when Future You is struggling or worse. Off in Lite mode. */
function Rain() {
  const live = useLive()
  const ref = useRef<THREE.InstancedMesh>(null!)
  const seeds = useMemo(() => Array.from({ length: DROPS }, () => [Math.random() * 24 - 12, Math.random() * 8, Math.random() * 24 - 12]), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  useFrame((state) => {
    const L = live.current, on = !L.lite && ['struggling', 'critical', 'zero'].includes(L.world.futureYouState)
    ref.current.visible = on
    if (!on) return
    const t = state.clock.elapsedTime, f = L.cine.active ? L.cine.target : L.charPos
    seeds.forEach(([x, y, z], i) => {
      const yy = 8 - ((y + t * 9) % 8)
      ref.current.setMatrixAt(i, m4.makeTranslation(f.x + x, yy, f.z + z))
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, DROPS]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.32, 0.012]} /><meshBasicMaterial color="#9AA7B0" transparent opacity={0.45} />
    </instancedMesh>
  )
}
