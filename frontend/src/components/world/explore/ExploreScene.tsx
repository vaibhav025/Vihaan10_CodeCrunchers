import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Ctx, useExplore, type ExploreLive } from './state'
import { nearestU } from './loop'
import Island from './Island'
import Road from './Road'
import Character from './Character'
import CameraRig from './CameraRig'
import type { WorldState } from '../worldFromProfile'

/** The explorable district. Renders a WorldState; the page controls opening and input through `live`. */
export default function ExploreScene({ live, onReady }: { live: React.MutableRefObject<ExploreLive>; onReady: () => void; world: WorldState }) {
  return (
    <Canvas shadows="soft" flat frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 35, near: 0.1, far: 200, position: [0, 3, 7] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} onCreated={() => requestAnimationFrame(() => requestAnimationFrame(onReady))} aria-hidden>
      <Ctx.Provider value={live}>
        <Scene />
      </Ctx.Provider>
    </Canvas>
  )
}

function Scene() {
  const scene = useThree(s => s.scene)
  const invalidate = useThree(s => s.invalidate)
  const grid = useRef<THREE.GridHelper>(null!)
  return <Inner scene={scene} invalidate={invalidate} grid={grid} />
}

function Inner({ scene, invalidate, grid }: { scene: THREE.Scene; invalidate: () => void; grid: React.MutableRefObject<THREE.GridHelper> }) {
  const live = useExplore()
  const c = useMemo(() => ({ night: new THREE.Color('#101A14'), day: new THREE.Color('#F2EFDF') }), [])
  if (!scene.fog) scene.fog = new THREE.Fog('#101A14', 20, 60)

  // render on demand: every frame while something moves, 24 fps for the idle bob, nothing when hidden
  const was = useRef(true)
  useFrame((_, dt) => {
    const L = live.current
    if (L.openTo > L.open) L.open = Math.min(L.openTo, L.open + dt / 2) // about two seconds
    const e = L.open
    ;(scene.fog as THREE.Fog).color.lerpColors(c.night, c.day, e)
    ;(scene.fog as THREE.Fog).near = 18 + e * 10; (scene.fog as THREE.Fog).far = 40 + e * 40
    const gm = grid.current.material as THREE.Material
    gm.opacity = 0.18 * (1 - e); grid.current.visible = e < 0.99
    was.current = L.busy || L.moving; L.busy = false
  })
  useEffect(() => {
    let raf = 0, last = 0
    const loop = (now: number) => {
      if (document.visibilityState === 'visible' && (was.current || now - last > 1000 / 24)) { invalidate(); last = now }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [invalidate])

  return (
    <>
      <hemisphereLight args={['#E4EEF2', '#C9BDA2', 1.6]} />
      <directionalLight position={[8, 14, 6]} intensity={2.2} color="#FFE3BC" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006}>
        <orthographicCamera attach="shadow-camera" args={[-18, 18, 18, -18, 0.5, 60]} />
      </directionalLight>
      {/* faint perspective grid under the intro island */}
      <gridHelper ref={grid} args={[80, 80, '#3F5B3A', '#2A3B30']} position={[0, -2.6, 0]} material-transparent material-opacity={0.18} />
      <Island />
      <Road />
      <Character />
      <CameraRig />
      {/* tap the ground to walk there (on the nearest point of the road) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={false}
        onPointerDown={e => { const L = live.current; if (L.open >= 1) { e.stopPropagation(); L.goal = nearestU(e.point); L.busy = true } }}>
        <circleGeometry args={[16, 32]} />
      </mesh>
    </>
  )
}
