import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ZONES, type WorldState } from './worldFromProfile'
import { ISLAND, zoneCenter } from './layout'
import { ClockCtx, type ZoneClock } from './build'
import { LiveCtx, type Live } from './sceneState'
import Road from './Road'
import Lanterns from './Lanterns'
import Character from './Character'
import CameraRig from './CameraRig'
import Atmosphere, { foliage } from './Atmosphere'
import { makeCity, CITY_GHOSTS as GHOSTS } from './zones/City'
import Trinkets from './Trinkets'
import { world as C } from '../../design-tokens'

/** The seven zones, each with its build sequence. */
const BUILT: { C: ComponentType; total: number }[] = ZONES.map((_, k) => makeCity(k))

export interface ScenePulse { kind: 'correct' | 'wrong'; n: number }

/**
 * Renders a WorldState. No game logic: what to build comes from worldFromProfile, which zones
 * to animate comes from the `play` list.
 */
export default function LifeScene(props: {
  world: WorldState; mode: 'home' | 'quest' | 'landing'; scrollS?: number; dark: boolean; pulse?: ScenePulse | null
  play: number[]; canPlay: boolean; recenter: number
  onPlayed: () => void; onCinematic: (on: boolean) => void; onLookAway: (away: boolean) => void
  onGhostTap?: (zone: number) => void; skip: number; onReady: () => void; cosmetics?: string[]
}) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && document.visibilityState === 'visible'))
    if (host.current) io.observe(host.current)
    const vis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [])
  return (
    <div ref={host} className="h-full w-full">
      <Canvas
        orthographic shadows="soft" flat
        // renders on demand; the Driver asks for frames only while something moves
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [14, 13, 14], near: 0.1, far: 200, zoom: 40 }}
        gl={{ preserveDrawingBuffer: props.mode === 'home', antialias: !matchMedia('(pointer: coarse)').matches, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          requestAnimationFrame(() => requestAnimationFrame(props.onReady))
          // after the world settles, keep a small frame of it for the Future Self card
          if (props.mode === 'home') setTimeout(() => requestAnimationFrame(() => {
            try { const c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * gl.domElement.height / gl.domElement.width); c.getContext('2d')!.drawImage(gl.domElement, 0, 0, c.width, c.height); localStorage.setItem('pq.worldFrame', c.toDataURL('image/webp', 0.8)) } catch { /* storage full */ }
          }), 6000)
        }}
        aria-hidden
      >
        <World {...props} visible={visible} />
      </Canvas>
    </div>
  )
}

function World({ world, mode, scrollS = 0, dark, pulse, play, canPlay, recenter, onPlayed, onCinematic, onLookAway, onGhostTap, skip, visible, cosmetics = [] }:
  Parameters<typeof LifeScene>[0] & { visible: boolean }) {
  const busy = useRef(true)
  const clocks = useMemo<ZoneClock[]>(() => ZONES.map(() => ({ start: -Infinity })), [])
  const live = useRef<Live>({
    world, busy, charS: mode === 'landing' ? 0 : world.progress, charPos: new THREE.Vector3(), look: 0, lookTo: 0, zoomMul: 1, mode, dark, scrollS,
    cine: { active: false, target: new THREE.Vector3(), lookAt: null, lookUntil: 0 }, celebrateAt: -9, nudgeAt: -9, dimAt: -9, lite: startLite(),
  })
  live.current.world = world; live.current.mode = mode; live.current.dark = dark; live.current.scrollS = scrollS
  // landing: each built zone waits until the scroll reaches it, then builds
  useMemo(() => { if (mode === 'landing') clocks.forEach((c, k) => { if (world.zones[k] === 'built' && c.start === -Infinity && scrollS < k * 5 - 3) c.start = Infinity }) }, [mode, world.level]) // eslint-disable-line react-hooks/exhaustive-deps
  const clock = useThree(s => s.clock)
  const invalidate = useThree(s => s.invalidate)
  const queue = useRef<{ k: number; start: number; end: number }[]>([])
  const pending = useRef(false)

  // zones queued to play stay hidden until their turn
  useMemo(() => { play.forEach(k => { clocks[k].start = Infinity }) }, [play, clocks])

  useEffect(() => {
    if (!canPlay || !play.length || pending.current) return
    pending.current = true
    let t = clock.elapsedTime + 0.9 // camera travel first
    queue.current = play.filter(k => BUILT[k]).map(k => {
      const q = { k, start: t, end: t + BUILT[k].total }
      clocks[k].start = t; t = q.end + 0.5
      return q
    })
    play.filter(k => !BUILT[k]).forEach(k => { clocks[k].start = -Infinity })
    if (queue.current.length) { live.current.cine.active = true; onCinematic(true) }
    onPlayed()
    invalidate()
  }, [canPlay, play, clocks, clock, onPlayed, onCinematic, invalidate])

  const finish = useCallback(() => {
    const L = live.current, last = queue.current[queue.current.length - 1]
    queue.current.forEach(q => { if (clocks[q.k].start > clock.elapsedTime - BUILT[q.k].total) clocks[q.k].start = -Infinity })
    queue.current = []
    L.cine.active = false; onCinematic(false)
    // turn to look at the new place, and celebrate
    if (last) { L.cine.lookAt = zoneCenter(last.k); L.cine.lookUntil = clock.elapsedTime + 1.8; L.celebrateAt = clock.elapsedTime + 0.3 }
    invalidate()
  }, [clocks, clock, onCinematic, invalidate])

  useEffect(() => { if (skip && live.current.cine.active) finish() }, [skip, finish])
  useEffect(() => { live.current.lookTo = 0; invalidate() }, [recenter, invalidate])
  useEffect(() => {
    if (!pulse) return
    const t = clock.elapsedTime
    if (pulse.kind === 'correct') live.current.celebrateAt = t + 0.9
    else { live.current.nudgeAt = t; live.current.dimAt = t }
    invalidate()
  }, [pulse, clock, invalidate])

  const lastLevel = useRef(world.level)
  useFrame(state => {
    const L = live.current, q = queue.current
    if (L.mode === 'landing' && world.level !== lastLevel.current) {
      for (let k = lastLevel.current; k < world.level; k++) clocks[k].start = L.scrollS >= k * 5 - 3 ? state.clock.elapsedTime : Infinity
      lastLevel.current = world.level; busy.current = true
    }
    if (L.mode === 'landing') clocks.forEach((c, k) => { if (c.start === Infinity && world.zones[k] === 'built' && L.scrollS >= k * 5 - 3) { c.start = state.clock.elapsedTime; busy.current = true } })
    if (!L.cine.active) return
    const now = state.clock.elapsedTime
    const cur = q.find(x => now < x.end) ?? q[q.length - 1]
    L.cine.target.copy(zoneCenter(cur.k))
    if (now > q[q.length - 1].end + 0.4) finish()
    busy.current = true
  })

  return (
    <LiveCtx.Provider value={live}>
      <Driver busy={busy} visible={visible} live={live} />
      <Atmosphere />
      <CameraRig onSkip={finish} onLookAway={onLookAway} />
      <Island />
      <Road />
      <Lanterns />
      <Trinkets />
      <Character cosmetics={cosmetics} />
      {cosmetics.includes('garden') && world.zones[1] === 'built' && (
        <group position={zoneCenter(1)}>{[[-1.4, 2.3], [-1.0, 2.35], [-0.6, 2.3]].map(([x, z], i) => (
          <mesh key={i} castShadow position={[x, 0.12, z]}><icosahedronGeometry args={[0.14, 0]} /><meshStandardMaterial flatShading color={i === 1 ? '#F3EAD6' : '#D9823F'} /></mesh>))}</group>
      )}
      {ZONES.map((_, k) => {
        const status = world.zones[k]
        const built = BUILT[k] && (status === 'built' || play.includes(k))
        const c = zoneCenter(k)
        return (
          <group key={k} position={c}>
            <mesh receiveShadow position={[0, 0.02, 0.1]}><boxGeometry args={[5, 0.04, 3.6]} /><meshStandardMaterial color="#2a2b2f" roughness={0.9} /></mesh>
            {built ? (
              <ClockCtx.Provider value={{ clock: clocks[k], busy }}>{(() => { const Z = BUILT[k].C; return <Z /> })()}</ClockCtx.Provider>
            ) : status === 'built' ? <Ghost k={k} solid /> : <Ghost k={k} partial={status === 'partial' ? world.partial : 0} onTap={onGhostTap} />}
          </group>
        )
      })}
    </LiveCtx.Provider>
  )
}

/** Renders at full rate while anything animates, at a quiet 24 fps for idle life, and not at all when hidden. */
function Driver({ busy, visible, live }: { busy: { current: boolean }; visible: boolean; live: { current: Live } }) {
  const invalidate = useThree(s => s.invalidate)
  const gl = useThree(s => s.gl)
  const was = useRef(true)
  const probe = useRef({ n: 0, t: 0 })
  useEffect(() => { if (live.current.lite) gl.shadowMap.enabled = false }, [gl, live])
  useFrame((_, dt) => {
    // first-second FPS probe: a device that cannot hold 30 fps while animating drops to Lite
    const p = probe.current
    if (busy.current && p.n < 45 && !live.current.lite) {
      p.n++; p.t += dt
      if (p.n === 45 && p.t / 45 > 1 / 30) { live.current.lite = true; gl.shadowMap.enabled = false }
    }
    was.current = busy.current; busy.current = false
  })
  useEffect(() => {
    if (!visible) return
    let raf = 0, last = 0
    const loop = (now: number) => {
      if (was.current || now - last > 1000 / (live.current.lite ? 12 : 24)) { invalidate(); last = now }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [visible, invalidate])
  return null
}

/** Lite from the start on small or low-memory devices. */
function startLite() {
  const n = navigator as Navigator & { deviceMemory?: number }
  return (navigator.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4
}

const GHOST_FILL = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false })
const GHOST_LINE = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28 })
const BOX = new THREE.BoxGeometry(1, 1, 1)
const EDGES = new THREE.EdgesGeometry(BOX)

/** Blueprint of a zone not yet built. The next zone's foundations fill in with XP. */
function Ghost({ k, partial = 0, solid, onTap }: { k: number; partial?: number; solid?: boolean; onTap?: (k: number) => void }) {
  const fill = useMemo(() => { const m = GHOST_FILL.clone(); m.opacity = solid ? 0.16 : 0.04 + partial * 0.14; return m }, [partial, solid])
  return (
    <group
      onClick={e => { e.stopPropagation(); onTap?.(k) }}
      onPointerOver={() => { if (onTap) document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      {GHOSTS[k].map(([w, h, d, x, z], i) => (
        <group key={i} position={[x, h / 2, z]} scale={[w, h, d]}>
          <mesh geometry={BOX} material={fill} />
          <lineSegments geometry={EDGES} material={GHOST_LINE} />
        </group>
      ))}
      {partial > 0 && (
        <mesh position={[0, 0.02, 0]} scale={[3.6 * partial, 1, 2.6]} geometry={BOX}><meshBasicMaterial color={C.road} /></mesh>
      )}
      {/* generous invisible hit area */}
      <mesh position={[0, 0.8, 0]} scale={[4.8, 1.6, 3.8]} geometry={BOX} visible={false} />
    </group>
  )
}

const TREE_SPOTS = Array.from({ length: 46 }, (_, i) => {
  const z = ISLAND.from - 2 - (i / 46) * (ISLAND.from - ISLAND.to - 4)
  const side = i % 2 ? 1 : -1
  return [side * (8.4 + ((i * 37) % 30) / 10), z + ((i * 13) % 7) - 3, 0.8 + ((i * 7) % 5) / 10] as const
}).filter(([x, z]) => !ZONES.some((_, k) => { const c = zoneCenter(k); return Math.abs(x - c.x) < 4.2 && Math.abs(z - c.z) < 3.4 }))

/** The floating ground and its edge trees (instanced). */
function Island() {
  const crowns = useRef<THREE.InstancedMesh>(null!)
  const trunks = useRef<THREE.InstancedMesh>(null!)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: foliage.color, flatShading: true, roughness: 0.95 }), [])
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion()
    TREE_SPOTS.forEach(([x, z, s], i) => {
      crowns.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.95 * s, z), q, new THREE.Vector3(s, s, s)))
      trunks.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.22 * s, z), q, new THREE.Vector3(s, s, s)))
    })
    crowns.current.instanceMatrix.needsUpdate = trunks.current.instanceMatrix.needsUpdate = true
  }, [])
  useFrame(() => { mat.color.copy(foliage.color) })
  const len = ISLAND.from - ISLAND.to, mid = (ISLAND.from + ISLAND.to) / 2
  return (
    <>
      <mesh receiveShadow position={[0, -0.25, mid]}><boxGeometry args={[ISLAND.width, 0.5, len]} /><meshStandardMaterial color="#1d1e21" roughness={0.95} /></mesh>
      <mesh position={[0, -1.1, mid]}><boxGeometry args={[ISLAND.width, 1.2, len]} /><meshStandardMaterial color="#0c0c0e" roughness={1} /></mesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, TREE_SPOTS.length]} castShadow material={mat} frustumCulled={false}>
        <coneGeometry args={[0.55, 1.2, 6]} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_SPOTS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.1, 0.44, 5]} /><meshStandardMaterial color="#26221f" flatShading />
      </instancedMesh>
    </>
  )
}
