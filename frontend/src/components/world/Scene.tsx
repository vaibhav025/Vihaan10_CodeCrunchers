import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { world as C, motion } from '../../design-tokens'

export type SurveyId = 'house' | 'road' | 'lantern' | 'monument' | 'figure'

/** The four numbers that drive the whole diorama. */
export interface WorldValues {
  /** 0 = empty plot in fog, 1 = thriving. */
  vitality: number
  /** 0..1, share of the road that quests have built. */
  road: number
  /** Lanterns lit along the road (streak days, up to 7). */
  lanterns: number
  /** 1..7, tiers on the monument. */
  level: number
  /**
   * In the game the road belongs to the player's quests, so it is drawn whatever the state.
   * Demo views leave this off: there the road also fades out as the world empties.
   */
  questRoad?: boolean
  /** Night scene: cool moonlight, glowing windows and lanterns. */
  night?: boolean
}

interface Live extends WorldValues { roadEff: number; time: number; route: boolean; dark: number }
const LiveCtx = createContext<MutableRefObject<Live>>(null!)
const useLive = () => useContext(LiveCtx)

const clamp = (x: number, a = 0, b = 1) => Math.min(Math.max(x, a), b)
const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x) }
/** Overshoots slightly, so things pop into place rather than fade. */
const back = (x: number) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

// The route from the viewer's corner of the tile to the front door.
const ROUTE = new THREE.CatmullRomCurve3([
  V(4.7, 0, 4.3), V(3.0, 0, 3.6), V(2.4, 0, 1.6), V(0.6, 0, 1.0), V(-0.6, 0, -0.4), V(-1.8, 0, -0.9), V(-2.2, 0, -1.55),
])
const SEGMENTS = 40
const SEG_LEN = ROUTE.getLength() / SEGMENTS

/** Geometry shared by every copy of a repeated object (trees, road, lanterns, particles). */
const G = {
  trunk: new THREE.CylinderGeometry(0.06, 0.09, 0.44, 5),
  pineLow: new THREE.ConeGeometry(0.46, 0.8, 6),
  pineTop: new THREE.ConeGeometry(0.32, 0.62, 6),
  crown: new THREE.IcosahedronGeometry(0.46, 0),
  crownSm: new THREE.IcosahedronGeometry(0.27, 0),
  road: new THREE.BoxGeometry(0.5, 0.05, SEG_LEN * 1.2),
  dash: new THREE.BoxGeometry(0.06, 0.02, SEG_LEN * 0.7),
  post: new THREE.CylinderGeometry(0.025, 0.03, 0.56, 5),
  lamp: new THREE.BoxGeometry(0.13, 0.15, 0.13),
  halo: new THREE.IcosahedronGeometry(0.17, 1),
  spark: new THREE.OctahedronGeometry(0.075, 0),
  leaf: new THREE.BoxGeometry(0.075, 0.008, 0.05),
  blob: new THREE.IcosahedronGeometry(1, 1),
}

function Flat(props: ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial flatShading roughness={0.95} metalness={0} {...props} />
}

/** Scales its children in from the ground once a live value passes a threshold. */
function Grow({ at, span = 0.14, of = 'vitality', fade = false, children, ...rest }: {
  at: number; span?: number; of?: 'vitality' | 'roadEff'; fade?: boolean; children: ReactNode
} & ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const x = (live.current[of] - at) / span
    const s = fade ? 1 - smooth(x) : back(x)
    ref.current.visible = s > 0.002
    ref.current.scale.setScalar(Math.max(s, 0.001))
  })
  return <group {...rest}><group ref={ref}>{children}</group></group>
}

function Tree({ x, z, kind, at, s = 1, mats, phase }: {
  x: number; z: number; kind: 'pine' | 'round' | 'autumn'; at: number; s?: number; mats: Mats; phase: number
}) {
  const sway = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => { sway.current.rotation.z = Math.sin(live.current.time * 0.9 + phase) * 0.035 })
  return (
    <Grow at={at} span={0.1} position={[x, 0, z]} scale={s}>
      <mesh castShadow position={[0, 0.22, 0]} geometry={G.trunk}><Flat color={C.trunk} /></mesh>
      <group ref={sway} position={[0, 0.4, 0]}>
        {kind === 'pine' ? (
          <>
            <mesh castShadow position={[0, 0.35, 0]} material={mats.pine} geometry={G.pineLow}></mesh>
            <mesh castShadow position={[0, 0.8, 0]} material={mats.pine} geometry={G.pineTop}></mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[0, 0.42, 0]} material={kind === 'autumn' ? mats.autumn : mats.round} geometry={G.crown}></mesh>
            <mesh castShadow position={[0.22, 0.2, 0.12]} material={kind === 'autumn' ? mats.autumn : mats.round} geometry={G.crownSm}></mesh>
          </>
        )}
      </group>
    </Grow>
  )
}

/** Leafless tree: only present around the critical state, then gives way to foliage. */
function BareTree({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const v = live.current.vitality
    const s = smooth((v - 0.1) / 0.1) * (1 - smooth((v - 0.36) / 0.1))
    ref.current.visible = s > 0.002
    ref.current.scale.setScalar(Math.max(s, 0.001))
  })
  const branch = (rz: number, ry: number, y: number, l: number) => (
    <group position={[0, y, 0]} rotation={[0, ry, rz]}>
      <mesh castShadow position={[0, l / 2, 0]}><cylinderGeometry args={[0.02, 0.035, l, 4]} /><Flat color={C.trunk} /></mesh>
    </group>
  )
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.4, 0]}><cylinderGeometry args={[0.045, 0.09, 0.8, 5]} /><Flat color={C.trunk} /></mesh>
      {branch(0.7, 0, 0.6, 0.5)}{branch(-0.8, 1.2, 0.5, 0.45)}{branch(0.5, 2.6, 0.72, 0.4)}{branch(-0.35, 4, 0.78, 0.36)}
    </group>
  )
}

function RoadSegment({ i }: { i: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const dash = useRef<THREE.Mesh>(null!)
  const live = useLive()
  const { p, rot } = useMemo(() => {
    const u = (i + 0.5) / SEGMENTS
    const tan = ROUTE.getTangentAt(u)
    return { p: ROUTE.getPointAt(u), rot: Math.atan2(tan.x, tan.z) }
  }, [i])
  useFrame(() => {
    const { roadEff, route } = live.current
    const s = smooth((roadEff - i / SEGMENTS) * SEGMENTS)
    ref.current.visible = s > 0.01
    ref.current.scale.set(s, 1, 1)
    // the unbuilt stretch shows as a dashed survey line
    if (dash.current) dash.current.visible = s < 0.5 && route
  })
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, rot, 0]}>
      <mesh ref={ref} receiveShadow position={[0, 0.025, 0]} geometry={G.road}><Flat color={C.road} /></mesh>
      {i % 2 === 1 && <mesh ref={dash} position={[0, 0.012, 0]} geometry={G.dash}><meshBasicMaterial color="#5E7458" /></mesh>}
    </group>
  )
}

function Lantern({ k }: { k: number }) {
  const u = 0.08 + k * 0.125
  const glow = useRef<THREE.MeshStandardMaterial>(null!)
  const halo = useRef<THREE.Mesh>(null!)
  const live = useLive()
  const pos = useMemo(() => {
    const p = ROUTE.getPointAt(u), t = ROUTE.getTangentAt(u)
    const side = k % 2 ? 0.44 : -0.44
    return [p.x + t.z * side, 0, p.z - t.x * side] as [number, number, number]
  }, [k, u])
  useFrame(() => {
    const lit = clamp(live.current.lanterns - k)
    glow.current.emissiveIntensity = lit * (2.2 + live.current.dark * 3)
    glow.current.color.set(lit > 0.5 ? C.lantern : '#CFC9B4')
    halo.current.visible = lit > 0.02
    halo.current.scale.setScalar((0.6 + lit * (1 + Math.sin(live.current.time * 2 + k) * 0.08)) * (1 + live.current.dark * 0.5))
  })
  return (
    <Grow at={u} span={0.08} of="roadEff" position={pos}>
      <mesh castShadow position={[0, 0.28, 0]} geometry={G.post}><Flat color="#4F5A4C" /></mesh>
      <mesh position={[0, 0.62, 0]} geometry={G.lamp}><meshStandardMaterial ref={glow} flatShading emissive={C.lantern} /></mesh>
      <mesh ref={halo} position={[0, 0.62, 0]} geometry={G.halo}><meshBasicMaterial color={C.lantern} transparent opacity={0.28} depthWrite={false} /></mesh>
    </Grow>
  )
}

/** Marks the end of the built road: the next milestone. */
function Marker() {
  const ref = useRef<THREE.Group>(null!)
  const gem = useRef<THREE.Mesh>(null!)
  const live = useLive()
  useFrame(() => {
    const { roadEff, route, time } = live.current
    ref.current.visible = route && roadEff < 0.985
    ROUTE.getPointAt(clamp(roadEff + 0.015), ref.current.position)
    gem.current.rotation.y = time * 0.8
    gem.current.position.y = 0.78 + Math.sin(time * 1.6) * 0.04
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.015, 0.015, 0.64, 4]} /><Flat color="#243B2C" /></mesh>
      <mesh ref={gem} castShadow><octahedronGeometry args={[0.13, 0]} /><Flat color={C.autumn} emissive={C.autumn} emissiveIntensity={0.35} /></mesh>
    </group>
  )
}

function Car({ still }: { still: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  const tan = useMemo(() => V(0, 0, 1), [])
  useFrame(() => {
    const max = Math.max(live.current.roadEff * 0.86, 0.12)
    const u = still ? 0.45 : 0.1 + (max - 0.1) * (0.5 - 0.5 * Math.cos(live.current.time * 0.22))
    ROUTE.getPointAt(clamp(u), ref.current.position)
    ROUTE.getTangentAt(clamp(u), tan)
    ref.current.rotation.y = Math.atan2(tan.x, tan.z)
  })
  return (
    <Grow at={0.9} span={0.08}>
      <group ref={ref}>
        <mesh castShadow position={[0, 0.12, 0]}><boxGeometry args={[0.24, 0.12, 0.46]} /><Flat color={C.car} /></mesh>
        <mesh castShadow position={[0, 0.22, -0.03]}><boxGeometry args={[0.2, 0.1, 0.24]} /><Flat color="#E9E4D0" /></mesh>
      </group>
    </Grow>
  )
}

function House({ mats, still, onSurvey }: { mats: Mats; still: boolean; onSurvey?: (id: SurveyId) => void }) {
  const size = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => { size.current.scale.setScalar(0.72 + 0.28 * smooth((live.current.vitality - 0.3) / 0.4)) })
  return (
    <Grow at={0.1} position={[-2.5, 0, -2.5]} {...tap('house', onSurvey)}>
      <group ref={size}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}><boxGeometry args={[1.8, 1.0, 1.4]} /><Flat color={C.wall} /></mesh>
        <mesh castShadow position={[0, 1.253, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 1]} material={mats.roof}>
          <cylinderGeometry args={[0.92, 0.92, 2.0, 3, 1, false, Math.PI / 2]} />
        </mesh>
        <mesh castShadow position={[-0.5, 1.45, -0.2]}><boxGeometry args={[0.2, 0.5, 0.2]} /><Flat color={C.stone} /></mesh>
        <mesh position={[0.3, 0.26, 0.71]}><boxGeometry args={[0.3, 0.52, 0.04]} /><Flat color="#3F5B3A" /></mesh>
        <mesh position={[-0.45, 0.58, 0.71]} material={mats.window}><boxGeometry args={[0.32, 0.3, 0.04]} /></mesh>
        <mesh position={[0.91, 0.58, 0]} material={mats.window}><boxGeometry args={[0.04, 0.3, 0.44]} /></mesh>
        <mesh receiveShadow position={[0.3, 0.02, 0.95]}><boxGeometry args={[0.6, 0.04, 0.5]} /><Flat color={C.road} /></mesh>
        <Smoke still={still} />
        {/* thriving: the home gains a wing and a garden */}
        <Grow at={0.86} span={0.1} position={[1.45, 0, 0.15]}>
          <mesh castShadow receiveShadow position={[0, 0.38, 0]}><boxGeometry args={[1.1, 0.76, 1.0]} /><Flat color={C.wall} /></mesh>
          <mesh castShadow position={[0, 0.8, 0]} material={mats.roof}><boxGeometry args={[1.26, 0.09, 1.16]} /></mesh>
          <mesh position={[0, 0.42, 0.51]} material={mats.window}><boxGeometry args={[0.5, 0.28, 0.04]} /></mesh>
        </Grow>
        <Grow at={0.88} span={0.1} position={[-0.5, 0, 1.0]}>
          <mesh castShadow position={[0, 0.07, 0]} material={mats.pine}><boxGeometry args={[0.7, 0.14, 0.22]} /></mesh>
          {[-0.24, 0, 0.24].map((x, i) => (
            <mesh key={x} position={[x, 0.17, 0]}><icosahedronGeometry args={[0.055, 0]} /><Flat color={i === 1 ? '#F3EAD6' : C.lantern} /></mesh>
          ))}
        </Grow>
      </group>
    </Grow>
  )
}

/** Future You walks the built road, pacing toward the frontier where the next stretch will be laid. */
function Walker({ still, onSurvey }: { still: boolean; onSurvey?: (id: SurveyId) => void }) {
  const ref = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Mesh>(null!)
  const legR = useRef<THREE.Mesh>(null!)
  const live = useLive()
  const tan = useMemo(() => V(0, 0, 1), [])
  useFrame(() => {
    const { roadEff, time } = live.current
    const far = clamp(roadEff - 0.03, 0.02, 0.97), near = Math.max(far - 0.34, 0.02)
    const phase = time * 0.22
    const u = still ? far : near + (far - near) * (0.5 - 0.5 * Math.cos(phase))
    const forward = Math.sin(phase) >= 0
    const moving = still || far - near < 0.02 ? 0 : Math.abs(Math.sin(phase))
    ROUTE.getPointAt(u, ref.current.position)
    ROUTE.getTangentAt(u, tan)
    ref.current.position.x += tan.z * 0.1
    ref.current.position.z -= tan.x * 0.1
    ref.current.position.y = Math.abs(Math.sin(time * 6)) * 0.018 * moving
    ref.current.rotation.y = Math.atan2(tan.x, tan.z) + (forward ? 0 : Math.PI)
    const swing = Math.sin(time * 6) * 0.55 * moving
    legL.current.rotation.x = swing
    legR.current.rotation.x = -swing
  })
  return (
    <group ref={ref} {...tap('figure', onSurvey)}>
      <group scale={1.25}>
        <mesh ref={legL} castShadow position={[-0.04, 0.25, 0]} geometry={LEG}><Flat color="#5A5148" /></mesh>
        <mesh ref={legR} castShadow position={[0.04, 0.25, 0]} geometry={LEG}><Flat color="#5A5148" /></mesh>
        <mesh castShadow position={[0, 0.39, 0]}><boxGeometry args={[0.21, 0.28, 0.13]} /><Flat color={C.coat} /></mesh>
        <mesh castShadow position={[0, 0.61, 0]}><icosahedronGeometry args={[0.085, 1]} /><Flat color={C.skin} /></mesh>
        <mesh position={[0, 0.645, -0.018]} scale={[1, 0.7, 1]}><icosahedronGeometry args={[0.09, 1]} /><Flat color={C.hair} /></mesh>
        <mesh castShadow position={[0.15, 0.2, 0.05]} rotation={[0.12, 0, -0.08]}><cylinderGeometry args={[0.011, 0.011, 0.42, 4]} /><Flat color={C.trunk} /></mesh>
      </group>
    </group>
  )
}
// leg pivots at the hip
const LEG = new THREE.BoxGeometry(0.07, 0.25, 0.09).translate(0, -0.125, 0)

/** Chimney smoke: the home is lived in. */
function Smoke({ still }: { still: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const on = smooth((live.current.vitality - 0.42) / 0.2)
    ref.current.visible = on > 0.01
    ref.current.children.forEach((c, i) => {
      const t = still ? i / 4 : (live.current.time * 0.22 + i / 4) % 1
      c.position.set(-0.5 + t * 0.35, 1.75 + t * 1.2, -0.2 + Math.sin(t * 6 + i) * 0.05)
      c.scale.setScalar(0.07 + t * 0.16)
      ;((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.55 * on
    })
  })
  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map(i => <mesh key={i} geometry={G.blob}><meshBasicMaterial color="#F4F2EA" transparent depthWrite={false} /></mesh>)}
    </group>
  )
}

function Birds() {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const t = live.current.time
    ref.current.children.forEach((b, i) => {
      const a = t * 0.32 + i * 2.1, r = 3 + i * 0.6
      b.position.set(Math.cos(a) * r, 3 + i * 0.25 + Math.sin(t + i) * 0.2, Math.sin(a) * r)
      b.rotation.y = -a
      const flap = Math.sin(t * 9 + i) * 0.6
      b.children[0].rotation.x = flap
      b.children[1].rotation.x = -flap
    })
  })
  return (
    <Grow at={0.5}>
      <group ref={ref}>
        {[0, 1, 2].map(i => (
          <group key={i}>
            <mesh position={[0, 0, 0.07]}><boxGeometry args={[0.05, 0.012, 0.15]} /><Flat color="#3B4A40" /></mesh>
            <mesh position={[0, 0, -0.07]}><boxGeometry args={[0.05, 0.012, 0.15]} /><Flat color="#3B4A40" /></mesh>
          </group>
        ))}
      </group>
    </Grow>
  )
}

const LEAF_TREES = [[0.7, -3.2], [-1.4, 3.6], [4.1, -1.6], [1.0, -0.9]]
function Leaves() {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const t = live.current.time, on = live.current.vitality > 0.58
    ref.current.visible = on
    if (!on) return
    ref.current.children.forEach((l, i) => {
      const [bx, bz] = LEAF_TREES[i % LEAF_TREES.length]
      const f = (t * 0.16 + i * 0.37) % 1
      l.position.set(bx + Math.sin(i * 9 + t * 0.8) * 0.45, 1.15 * (1 - f) + 0.04, bz + Math.cos(i * 5 + t * 0.6) * 0.45)
      l.rotation.set(t * 2 + i, t * 1.3 + i, 0)
    })
  })
  return (
    <group ref={ref}>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} geometry={G.leaf}><Flat color={i % 3 ? C.autumn : C.lantern} /></mesh>)}
    </group>
  )
}

/** Soft ring on the ground marking something that can be surveyed. */
function Ping({ x, z, delay = 0 }: { x: number; z: number; delay?: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const live = useLive()
  useFrame(() => {
    const f = (live.current.time * 0.5 + delay) % 1
    ref.current.scale.setScalar(0.6 + f * 1.6)
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - f) * 0.5
  })
  return (
    <mesh ref={ref} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.36, 28]} /><meshBasicMaterial color="#F0B67A" transparent depthWrite={false} />
    </mesh>
  )
}

/** Sparks thrown up when the road extends or the monument rises. */
interface BurstApi { fire: (at: THREE.Vector3) => void }
function Burst({ api }: { api: MutableRefObject<BurstApi | null> }) {
  const ref = useRef<THREE.Group>(null!)
  const N = 22
  const parts = useMemo(() => Array.from({ length: N }, () => ({ v: V(0, 0, 0), life: 0 })), [])
  useEffect(() => {
    api.current = {
      fire: at => parts.forEach((p, i) => {
        const a = (i / N) * Math.PI * 2 + Math.random()
        p.v.set(Math.cos(a) * (0.6 + Math.random()), 2.4 + Math.random() * 1.8, Math.sin(a) * (0.6 + Math.random()))
        p.life = 0.9 + Math.random() * 0.5
        ref.current.children[i].position.copy(at).setY(at.y + 0.2)
      }),
    }
  }, [api, parts])
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    parts.forEach((p, i) => {
      const m = ref.current.children[i]
      if (p.life <= 0) { m.visible = false; return }
      p.life -= d; p.v.y -= 5.5 * d
      m.position.addScaledVector(p.v, d)
      m.rotation.x += d * 6; m.rotation.y += d * 4
      m.visible = true
      m.scale.setScalar(Math.max(p.life, 0) * 0.9)
    })
  })
  return (
    <group ref={ref}>
      {parts.map((_, i) => <mesh key={i} visible={false} geometry={G.spark}><meshBasicMaterial color={i % 3 === 0 ? '#F7F1DC' : i % 3 === 1 ? C.lantern : C.autumn} /></mesh>)}
    </group>
  )
}

function Monument({ onSurvey }: { onSurvey?: (id: SurveyId) => void }) {
  const tiers = useRef<(THREE.Mesh | null)[]>([])
  const cap = useRef<THREE.Mesh>(null!)
  const live = useLive()
  useFrame(() => {
    const built = live.current.level - 1
    tiers.current.forEach((m, i) => {
      if (!m) return
      const s = smooth(built - i)
      m.visible = s > 0.01
      m.scale.set(1, Math.max(s, 0.01), 1)
      m.position.y = 0.08 + i * 0.22 + 0.11 * s
    })
    cap.current.visible = built > 0.05
    cap.current.position.y = 0.2 + clamp(built, 0, 6) * 0.22
    cap.current.rotation.y = live.current.time * 0.5
  })
  return (
    <group position={[-3.4, 0, 3.5]} {...tap('monument', onSurvey)}>
      <mesh receiveShadow castShadow position={[0, 0.04, 0]}><boxGeometry args={[0.95, 0.08, 0.95]} /><Flat color={C.stone} /></mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={m => { tiers.current[i] = m }} castShadow>
          <boxGeometry args={[0.7 - i * 0.085, 0.22, 0.7 - i * 0.085]} /><Flat color={i % 2 ? '#CFC7AE' : C.stone} />
        </mesh>
      ))}
      <mesh ref={cap} castShadow><octahedronGeometry args={[0.11, 0]} /><Flat color={C.lantern} emissive={C.lantern} emissiveIntensity={0.4} /></mesh>
    </group>
  )
}

function Cloud({ x, y, z, s, speed, overcast, shadowOnly, still }: { x: number; y: number; z: number; s: number; speed: number; overcast?: boolean; shadowOnly?: boolean; still: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  useFrame(() => {
    const px = still ? x : ((x + live.current.time * speed + 7) % 14) - 7
    ref.current.position.x = px
    // clouds form and dissolve at the edge of the tile, so they never hit the frame
    const a = smooth((6.6 - Math.abs(px)) / 1.6) * (overcast ? 1 - smooth((live.current.vitality - 0.25) / 0.2) : 1)
    ref.current.visible = a > 0.01
    ref.current.scale.setScalar(s * Math.max(a, 0.01))
  })
  // a shadow-only cloud is never drawn but still darkens the ground as it passes
  const mat = <meshStandardMaterial flatShading color={overcast ? '#C9CCC7' : '#FFFFFF'} transparent opacity={overcast ? 0.7 : 0.92} colorWrite={!shadowOnly} depthWrite={!shadowOnly} />
  return (
    <group ref={ref} position={[x, y, z]} scale={s}>
      <mesh castShadow scale={[1.5, 0.5, 1]}><icosahedronGeometry args={[0.8, 0]} />{mat}</mesh>
      <mesh castShadow position={[0.9, -0.05, 0.2]} scale={[1.2, 0.42, 0.9]}><icosahedronGeometry args={[0.6, 0]} />{mat}</mesh>
      <mesh castShadow position={[-0.8, -0.08, -0.2]} scale={[1.1, 0.4, 0.8]}><icosahedronGeometry args={[0.55, 0]} />{mat}</mesh>
    </group>
  )
}

function Fog({ still }: { still: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  const live = useLive()
  const blobs = useMemo(() => [[-2.6, -2.2, 1.5], [0.8, -1.2, 1.2], [2.8, 1.6, 1.4], [-1.2, 2.4, 1.3], [3.2, -3, 1.1], [-3.6, 0.6, 1]], [])
  useFrame(() => {
    const a = 1 - smooth((live.current.vitality - 0.05) / 0.22)
    ref.current.visible = a > 0.01
    ref.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.opacity = a * 0.5
      if (!still) c.position.x = blobs[i][0] + Math.sin(live.current.time * 0.15 + i) * 0.5
    })
  })
  return (
    <group ref={ref}>
      {blobs.map(([x, z, s], i) => (
        <mesh key={i} position={[x, 0.25, z]} rotation={[0, i * 1.3, 0]} scale={[s * 1.5, s * 0.36, s * 1.15]}>
          <icosahedronGeometry args={[1, 3]} /><meshStandardMaterial color="#EEEFEA" roughness={1} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function tap(id: SurveyId, onSurvey?: (id: SurveyId) => void) {
  if (!onSurvey) return {}
  return {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSurvey(id) },
    onPointerOver: () => { document.body.style.cursor = 'pointer' },
    onPointerOut: () => { document.body.style.cursor = '' },
  }
}

type Mats = ReturnType<typeof useMats>
function useMats() {
  return useMemo(() => {
    const m = (color: string) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 })
    return {
      grass: m(C.grass), pine: m(C.pine), round: m(C.round), autumn: m(C.autumn), roof: m(C.roof),
      window: new THREE.MeshStandardMaterial({ color: '#E8D9B8', emissive: C.lantern, flatShading: true }),
    }
  }, [])
}

const TREES: [number, number, 'pine' | 'round' | 'autumn', number, number][] = [
  [-0.6, -3.8, 'round', 0.4, 1.1], [-3.9, -1.1, 'pine', 0.42, 1.0], [-3.8, 1.0, 'pine', 0.46, 1.15],
  [0.7, -3.2, 'autumn', 0.56, 1.0], [-1.4, 3.6, 'autumn', 0.6, 1.0], [4.2, 1.6, 'round', 0.62, 0.9],
  [-4.2, -4.0, 'pine', 0.64, 1.25], [4.1, -1.6, 'autumn', 0.68, 1.1], [1.7, -4.1, 'pine', 0.7, 1.25],
  [-2.5, 2.2, 'round', 0.72, 1.0], [3.9, -3.9, 'round', 0.8, 1.05], [-0.2, 4.2, 'pine', 0.82, 0.9],
  [1.0, -0.9, 'autumn', 0.86, 0.8], [3.6, -0.3, 'pine', 0.9, 0.95], [-4.3, -2.5, 'autumn', 0.92, 0.9],
  [1.3, 3.9, 'round', 0.94, 0.8], [-1.5, 1.5, 'pine', 0.96, 0.85],
]

function Diorama({ target, still, onSurvey }: { target: WorldValues; still: boolean; onSurvey?: (id: SurveyId) => void }) {
  // everything starts empty and grows to the target, so the world assembles itself on load
  const live = useRef<Live>({ vitality: 0, road: 0, lanterns: 0, level: 1, roadEff: 0, time: 0, route: false, dark: 0 })
  const rig = useRef<THREE.Group>(null!)
  const key = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.HemisphereLight>(null!)
  const mats = useMats()
  const burst = useRef<BurstApi | null>(null)
  const { camera, size, gl, invalidate } = useThree()
  const s = useRef({ tilt: 0, yaw: 0, yawTo: 0, drag: false, lastX: 0, intro: still ? 1 : 0, punch: 0, zoom: 0, road: target.road, level: target.level, settled: false })
  const col = useMemo(() => ({
    grass: new THREE.Color(C.grass), grassDry: new THREE.Color(C.grassDry),
    pine: new THREE.Color(C.pine), round: new THREE.Color(C.round), autumn: new THREE.Color(C.autumn),
    dull: new THREE.Color(C.foliageDull), roof: new THREE.Color(C.roof), roofDull: new THREE.Color(C.roofDull),
    warm: new THREE.Color(C.keyWarm), cold: new THREE.Color(C.keyCold), moon: new THREE.Color('#7C93C4'),
    sky: new THREE.Color('#E4EEF2'), nightSky: new THREE.Color('#3A4C70'),
  }), [])

  useEffect(() => { invalidate() }, [target.vitality, target.road, target.lanterns, target.level, target.night, invalidate])

  // drag to turn the world; device tilt adds a little parallax
  useEffect(() => {
    const el = gl.domElement, st = s.current
    const down = (e: PointerEvent) => { st.drag = true; st.lastX = e.clientX; el.style.cursor = 'grabbing' }
    const move = (e: PointerEvent) => {
      if (!st.drag) return
      st.yawTo += (e.clientX - st.lastX) * 0.007; st.lastX = e.clientX; invalidate()
    }
    const up = () => { st.drag = false; el.style.cursor = 'grab' }
    const tilt = (e: DeviceOrientationEvent) => { st.tilt = clamp((e.gamma ?? 0) / 40, -1, 1) }
    el.style.cursor = 'grab'; el.style.touchAction = 'pan-y'
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    if (!still) window.addEventListener('deviceorientation', tilt)
    return () => {
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up); window.removeEventListener('deviceorientation', tilt)
    }
  }, [gl, still, invalidate])

  useFrame((state, dt) => {
    const L = live.current, st = s.current
    const d = Math.min(dt, 0.1)
    // settle toward the target in roughly motion.worldSeconds; reduced motion snaps
    const k = still ? 1 : 1 - Math.exp(-d * (3.9 / motion.worldSeconds))
    L.vitality += (target.vitality - L.vitality) * k
    L.road += (target.road - L.road) * k
    L.lanterns += (target.lanterns - L.lanterns) * k
    L.level += (target.level - L.level) * k
    L.dark += ((target.night ? 1 : 0) - L.dark) * k
    // in demo views zero has no road at all and critical leaves it partly unfinished
    L.roadEff = L.road * (target.questRoad ? 1 : clamp((L.vitality - 0.05) / 0.37))
    L.route = !!target.questRoad || L.vitality > 0.08
    if (!still) L.time = state.clock.elapsedTime

    // reward moments: new road or a new monument tier throws sparks and nudges the camera
    if (st.settled && !still) {
      if (target.road - st.road > 0.03) { burst.current?.fire(ROUTE.getPointAt(clamp(L.roadEff + 0.02))); st.punch = 1 }
      if (target.level > st.level) { burst.current?.fire(V(-3.4, 0.4 + target.level * 0.2, 3.5)); st.punch = 1 }
    }
    st.road = target.road; st.level = target.level
    if (state.clock.elapsedTime > 1.5) st.settled = true

    const v = L.vitality, life = smooth(v * 1.25), n = L.dark
    mats.grass.color.lerpColors(col.grassDry, col.grass, life)
    mats.pine.color.lerpColors(col.dull, col.pine, life)
    mats.round.color.lerpColors(col.dull, col.round, life)
    mats.autumn.color.lerpColors(col.dull, col.autumn, life)
    mats.roof.color.lerpColors(col.roofDull, col.roof, life)
    mats.window.emissiveIntensity = 0.1 + smooth((v - 0.35) / 0.6) * 1.5 + n * smooth((v - 0.12) / 0.2) * 2.4
    key.current.color.lerpColors(col.cold, col.warm, life).lerp(col.moon, n * 0.85)
    key.current.intensity = (1.0 + life * 1.3) * (1 - n * 0.62)
    fill.current.color.lerpColors(col.sky, col.nightSky, n)
    fill.current.intensity = (1.9 - life * 0.2) * (1 - n * 0.5)

    // the tile rises into place on load
    st.intro = Math.min(st.intro + d / 1.1, 1)
    const e = 1 - Math.pow(1 - st.intro, 3)
    rig.current.position.y = 0.35 - (1 - e) * 3
    rig.current.scale.setScalar(0.86 + 0.14 * e)

    if (still) rig.current.rotation.y = st.yawTo
    else {
      const drift = st.drag ? 0 : (state.pointer.x + st.tilt) * 0.07 + Math.sin(L.time * 0.12) * 0.04
      st.yaw += (st.yawTo - st.yaw) * 0.12
      rig.current.rotation.y += (st.yaw + drift - rig.current.rotation.y) * 0.08
    }

    // keep the whole tile in frame, with a brief push-in on reward
    st.punch = Math.max(st.punch - d * 1.6, 0)
    const zoom = Math.min(size.width / 17, size.height / 12.6) * (1 + Math.sin(st.punch * Math.PI) * 0.06)
    if (Math.abs(zoom - st.zoom) > 0.001) { st.zoom = zoom; camera.zoom = zoom; camera.updateProjectionMatrix() }
  })

  return (
    <LiveCtx.Provider value={live}>
      <hemisphereLight ref={fill} args={['#E4EEF2', '#C9BDA2', 1]} />
      <directionalLight ref={key} position={[9, 7.5, -4]} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} shadow-radius={4}>
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.5, 40]} />
      </directionalLight>

      <group ref={rig} position={[0, 0.35, 0]}>
        {/* the floating tile: turf, soil, bedrock */}
        <mesh receiveShadow position={[0, -0.25, 0]} material={mats.grass}><boxGeometry args={[10, 0.5, 10]} /></mesh>
        <mesh position={[0, -0.95, 0]}><boxGeometry args={[10, 0.9, 10]} /><Flat color={C.earth} /></mesh>
        <mesh position={[0, -1.65, 0]}><boxGeometry args={[9.6, 0.5, 9.6]} /><Flat color={C.earthDeep} /></mesh>
        <mesh position={[1.5, -2.15, -1]}><boxGeometry args={[5, 0.5, 5.5]} /><Flat color={C.earthDeep} /></mesh>

        <group {...tap('road', onSurvey)}>
          {Array.from({ length: SEGMENTS }, (_, i) => <RoadSegment key={i} i={i} />)}
        </group>
        <group {...tap('lantern', onSurvey)}>
          {Array.from({ length: 7 }, (_, k) => <Lantern key={k} k={k} />)}
        </group>
        <Marker />
        <Car still={still} />
        <House mats={mats} still={still} onSurvey={onSurvey} />
        <Walker still={still} onSurvey={onSurvey} />
        <Monument onSurvey={onSurvey} />
        <Burst api={burst} />

        {TREES.map(([x, z, kind, at, sc], i) => <Tree key={i} x={x} z={z} kind={kind} at={at} s={sc} mats={mats} phase={i * 1.7} />)}
        <BareTree x={-0.6} z={-3.8} /><BareTree x={2.0} z={-2.3} />

        {/* pond appears once things are stable */}
        <Grow at={0.6} position={[2.9, 0, -2.7]}>
          <mesh receiveShadow position={[0, 0.015, 0]} scale={[1.25, 1, 0.9]}><cylinderGeometry args={[0.85, 0.85, 0.03, 9]} /><Flat color="#BCD5D3" roughness={0.3} /></mesh>
        </Grow>
        {[[2.2, -3.6, 0.22], [-3.2, 0.2, 0.18], [3.3, 2.5, 0.16], [0.2, 2.6, 0.13]].map(([x, z, r], i) => (
          <mesh key={i} castShadow position={[x, r * 0.5, z]}><icosahedronGeometry args={[r, 0]} /><Flat color="#C4C1B2" /></mesh>
        ))}

        {!still && <><Birds /><Leaves /></>}
        {onSurvey && !still && <><Ping x={-2.2} z={-1.2} /><Ping x={-3.4} z={3.5} delay={0.5} /></>}

        <Fog still={still} />
        <Cloud x={-3} y={3.6} z={3.6} s={0.6} speed={0.16} still={still} />
        <Cloud x={4} y={5} z={-1} s={1} speed={0.11} shadowOnly still={still} />
        <Cloud x={1} y={2.6} z={4} s={1.05} speed={0.07} overcast still={still} />
        <Cloud x={-3} y={2.4} z={-4.2} s={0.95} speed={0.09} overcast still={still} />
      </group>
    </LiveCtx.Provider>
  )
}

/** True while the element is in the viewport and the tab is visible. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true)
  const [shown, setShown] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' })
    io.observe(el)
    const vis = () => setShown(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [ref])
  return inView && shown
}

export default function Scene({ values, onSurvey, onReady, onFail }: {
  values: WorldValues; onSurvey?: (id: SurveyId) => void; onReady: () => void; onFail: () => void
}) {
  // the live scene is only mounted when motion is allowed (see World.tsx)
  const still = false
  const host = useRef<HTMLDivElement>(null)
  const visible = useOnScreen(host)
  return (
    <div ref={host} className="h-full w-full">
    <Canvas
      orthographic
      flat
      shadows="soft"
      // the world animates continuously while visible; it stops rendering when the tab is
      // hidden or the canvas has scrolled out of view
      frameloop={visible ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [12, 10.4, 12], near: 0.1, far: 80, zoom: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onFail)
        // reveal once the first frames are on screen
        requestAnimationFrame(() => requestAnimationFrame(onReady))
      }}
      aria-hidden
    >
      <Diorama target={values} still={still} onSurvey={onSurvey} />
    </Canvas>
    </div>
  )
}
