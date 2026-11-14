import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Piece, Sweep } from '../build'
import { useLive } from '../sceneState'
import { ROAD, uOfSegment } from '../layout'
import { cityBus, type CityPick } from '../cityBus'

/**
 * The Life Road as a city street. Each zone is a block, and each block is richer than the last:
 * corner shops, low-rise flats, mid-rise, mixed use, glass offices, towers, then the landmark and
 * a penthouse tower with a helipad. Buildings share four materials and rise out of the ground.
 */
type Style = 'brick' | 'concrete' | 'glass' | 'prime' | 'stone' | 'blue'
type Roof = 'shop' | 'redshop' | 'ac' | 'pent' | 'spire' | 'heli' | 'crown' | 'gable' | 'dome' | 'step' | 'tank' | 'solar' | 'garden' | 'sign' | 'flag' | 'cross' | 'balcony' | 'arch'
/** A kind of building: its own silhouette, material and roofline, and what it stands for in the plan. */
interface Arch { name: string; means: string; style: Style; size: [number, number, number]; roof: Roof[] }
const A: Record<string, Arch> = {
  chai: { name: 'Chai stall', means: 'Small daily habits', style: 'brick', size: [0.7, 0.5, 0.6], roof: ['redshop'] },
  kirana: { name: 'Kirana store', means: 'Your first income', style: 'brick', size: [1.1, 0.8, 0.9], roof: ['shop', 'sign', 'tank'] },
  bungalow: { name: 'Bungalow', means: 'A home of your own', style: 'stone', size: [1.1, 0.7, 0.9], roof: ['gable'] },
  chawl: { name: 'Chawl apartments', means: 'First rented home', style: 'brick', size: [1.5, 1.7, 0.9], roof: ['balcony', 'tank'] },
  clinic: { name: 'Clinic', means: 'Health cover', style: 'concrete', size: [1.0, 1.2, 0.9], roof: ['cross', 'ac'] },
  cafe: { name: 'Cafe', means: 'Wants, kept in budget', style: 'brick', size: [1.0, 0.9, 0.9], roof: ['redshop', 'garden'] },
  school: { name: 'School', means: 'Education goals', style: 'concrete', size: [1.6, 1.3, 0.9], roof: ['flag', 'solar'] },
  library: { name: 'Library', means: 'Money knowledge', style: 'stone', size: [1.2, 1.5, 1.1], roof: ['dome'] },
  bank: { name: 'Bank branch', means: 'Emergency fund', style: 'stone', size: [1.3, 1.9, 1.0], roof: ['sign', 'ac'] },
  midrise: { name: 'Mid-rise apartments', means: 'Your own flat', style: 'concrete', size: [1.2, 3.0, 1.1], roof: ['step', 'balcony'] },
  cowork: { name: 'Co-working block', means: 'Career growth', style: 'glass', size: [1.2, 2.6, 1.1], roof: ['garden'] },
  mall: { name: 'Mall', means: 'Bigger spends, planned', style: 'glass', size: [1.8, 1.7, 1.3], roof: ['sign', 'solar'] },
  hospital: { name: 'Hospital', means: 'Health insurance', style: 'concrete', size: [1.4, 3.4, 1.2], roof: ['cross', 'heli'] },
  metro: { name: 'Metro station', means: 'A steady monthly SIP', style: 'concrete', size: [2.0, 0.8, 0.9], roof: ['arch'] },
  techpark: { name: 'Tech park', means: 'Peak earning years', style: 'blue', size: [1.5, 3.8, 1.3], roof: ['solar', 'ac'] },
  stepped: { name: 'Stepped glass tower', means: 'Equity growth', style: 'glass', size: [1.3, 4.6, 1.3], roof: ['step', 'crown'] },
  spire: { name: 'Spire skyscraper', means: 'Your NPS corpus', style: 'prime', size: [1.3, 5.6, 1.3], roof: ['spire'] },
  landmark: { name: 'Landmark tower', means: 'Retirement corpus', style: 'prime', size: [1.5, 9.2, 1.5], roof: ['step', 'spire'] },
  dream: { name: 'Dream home', means: 'Life at 60', style: 'stone', size: [1.5, 1.1, 1.2], roof: ['gable', 'pent', 'garden'] },
  helitower: { name: 'Penthouse tower', means: 'Pension that lasts', style: 'blue', size: [1.4, 7.4, 1.4], roof: ['heli'] },
}
/** Each block: [archetype, x, z]. No archetype repeats inside a block, and each block brings in grander ones. */
const PLAN: [keyof typeof A, number, number][][] = [
  [['chai', -1.5, 0.6], ['kirana', -1.2, -0.6], ['bungalow', 0.3, -0.5]],
  [['chawl', -1.2, -0.6], ['clinic', 0.3, -0.6], ['school', 1.3, 0.7], ['cafe', -0.7, 0.9]],
  [['library', -1.4, -0.5], ['midrise', 0.1, -0.6], ['bank', 1.6, -0.3], ['kirana', -0.5, 1.0]],
  [['hospital', -1.3, -0.6], ['cowork', 0.3, -0.5], ['mall', 1.4, 0.8], ['cafe', -0.9, 1.0]],
  [['techpark', -1.3, -0.6], ['stepped', 0.4, -0.6], ['metro', 0.3, 1.1], ['bank', 1.8, -0.1]],
  [['spire', -1.4, -0.6], ['techpark', 0.3, -0.7], ['stepped', 1.8, -0.2], ['mall', -0.4, 1.0], ['library', 1.4, 1.2]],
  [['landmark', -1.3, -0.9], ['helitower', 0.6, -0.6], ['spire', 2.2, 0.1], ['dream', -0.6, 1.1], ['cowork', 1.2, 1.2]],
]
type B = { a: Arch; id: string; x: number; z: number }
const TIERS: B[][] = PLAN.map(t => t.map(([id, x, z]) => ({ a: A[id], id, x, z })))
export const ARCHETYPE_COUNT = new Set(PLAN.flat().map(b => b[0])).size
/** Blueprint silhouettes for blocks not built yet: [w, h, d, x, z]. */
export const CITY_GHOSTS = TIERS.map(t => t.map(({ a, x, z }) => [a.size[0], a.size[1], a.size[2], x, z] as [number, number, number, number, number]))

const LOOK: Record<Style, { wall: string; glass: string; lit: number; cell: number; win: [number, number, number, number]; rough: number; metal: number }> = {
  brick: { wall: '#6e625a', glass: '#1c2026', lit: 0.32, cell: 0.24, win: [0.26, 0.24, 0.48, 0.5], rough: 0.92, metal: 0 },
  concrete: { wall: '#83858b', glass: '#1c2127', lit: 0.4, cell: 0.26, win: [0.14, 0.26, 0.72, 0.5], rough: 0.85, metal: 0 },
  glass: { wall: '#414b56', glass: '#52616f', lit: 0.36, cell: 0.3, win: [0.05, 0.08, 0.9, 0.84], rough: 0.28, metal: 0.35 },
  stone: { wall: '#a8a39a', glass: '#20242a', lit: 0.34, cell: 0.27, win: [0.3, 0.16, 0.4, 0.66], rough: 0.9, metal: 0 },
  blue: { wall: '#2e4256', glass: '#46688a', lit: 0.42, cell: 0.3, win: [0.05, 0.07, 0.9, 0.86], rough: 0.24, metal: 0.4 },
  prime: { wall: '#2a3039', glass: '#374452', lit: 0.5, cell: 0.3, win: [0.04, 0.05, 0.92, 0.9], rough: 0.2, metal: 0.45 },
}
const WARM = ['#FFD9A0', '#FFE7C4', '#F6C98A', '#FFF1DC', '#E9EEF5']
const GRID = 8, PX = 48

let mats: Record<Style, THREE.MeshStandardMaterial> | null = null
const ROOF = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.9 })
const TRIM = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.6, metalness: 0.3 })
const AWNING = new THREE.MeshStandardMaterial({ color: '#3b3431', roughness: 0.9 })
const GLOW = new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: '#FFD9A0', emissiveIntensity: 0.55, roughness: 0.4 })
const BEACON = new THREE.MeshBasicMaterial({ color: '#ff6a55' })
const PAD = new THREE.MeshStandardMaterial({ color: '#3a3c40', roughness: 0.8 })
const PAD_RING = new THREE.MeshBasicMaterial({ color: '#e8e8ea' })

/** One 8x8 sheet of windows per style: a colour map and a matching emissive map with some windows lit. */
function materials() {
  if (mats) return mats
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const out = {} as Record<Style, THREE.MeshStandardMaterial>
  ;(Object.keys(LOOK) as Style[]).forEach(style => {
    const L = LOOK[style], size = GRID * PX
    const a = document.createElement('canvas'), b = document.createElement('canvas')
    a.width = a.height = b.width = b.height = size
    const ca = a.getContext('2d')!, cb = b.getContext('2d')!
    ca.fillStyle = L.wall; ca.fillRect(0, 0, size, size)
    cb.fillStyle = '#000'; cb.fillRect(0, 0, size, size)
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const x = i * PX + L.win[0] * PX, y = j * PX + L.win[1] * PX, w = L.win[2] * PX, h = L.win[3] * PX
      const g = ca.createLinearGradient(0, y, 0, y + h)
      g.addColorStop(0, L.glass); g.addColorStop(1, '#0b0d10')
      ca.fillStyle = g; ca.fillRect(x, y, w, h)
      if (rnd() < L.lit) {
        const c = WARM[Math.floor(rnd() * WARM.length)]
        cb.globalAlpha = 0.45 + rnd() * 0.55; cb.fillStyle = c; cb.fillRect(x, y, w, h)
        ca.globalAlpha = 0.5; ca.fillStyle = c; ca.fillRect(x, y, w, h); ca.globalAlpha = 1
      }
    }
    cb.globalAlpha = 1
    const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }
    out[style] = new THREE.MeshStandardMaterial({ map: tex(a), emissiveMap: tex(b), emissive: '#ffffff', emissiveIntensity: 1.25, roughness: L.rough, metalness: L.metal })
  })
  mats = out
  return out
}

/** A box whose side faces carry a whole number of window cells, so no window is cut at a corner. */
function shell(w: number, h: number, d: number, style: Style, n: number) {
  const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)
  const uv = g.attributes.uv as THREE.BufferAttribute, cell = LOOK[style].cell
  const rows = Math.max(Math.round(h / cell), 1), ou = (n * 3) % GRID, ov = (n * 5) % GRID
  for (let f = 0; f < 6; f++) {
    if (f === 2 || f === 3) continue
    const cols = Math.max(Math.round((f < 2 ? d : w) / cell), 1)
    for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, (uv.getX(i) * cols + ou) / GRID, (uv.getY(i) * rows + ov) / GRID) }
  }
  return g
}

const RED = new THREE.MeshStandardMaterial({ color: '#6e3b37', roughness: 0.9 })
const TILE = new THREE.MeshStandardMaterial({ color: '#4d3d38', roughness: 0.85, flatShading: true })
const GREEN = new THREE.MeshStandardMaterial({ color: '#3d5a45', roughness: 0.95, flatShading: true })
const SOLAR = new THREE.MeshStandardMaterial({ color: '#1e3050', roughness: 0.25, metalness: 0.5 })
const STONE = new THREE.MeshStandardMaterial({ color: '#b3aea5', roughness: 0.8 })
const TANK = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.7 })
const CROSS = new THREE.MeshBasicMaterial({ color: '#9fe0b4' })
const OUTLINE = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 })
const UP = new THREE.Vector3()

function Building({ b, n, zone }: { b: B; n: number; zone: number }) {
  const { a } = b, [w, h, d] = a.size, style = a.style
  const live = useLive()
  const invalidate = useThree(s => s.invalidate)
  const m = materials()
  const geo = useMemo(() => shell(w, h, d, style, n), [w, h, d, style, n])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  const mat = useMemo(() => [m[style], m[style], ROOF, ROOF, m[style], m[style]], [m, style])
  const g = useRef<THREE.Group>(null!), line = useRef<THREE.LineSegments>(null!), hot = useRef(false)
  // hover lifts the building a little; the lift eases, and only costs frames while it moves
  useFrame((_, dt) => {
    const to = hot.current ? 0.1 : 0, y = g.current.position.y
    if (Math.abs(to - y) > 0.001) { g.current.position.y = y + (to - y) * Math.min(dt * 12, 1); live.current.busy.current = true }
  })
  const up = () => g.current.parent?.visible !== false
  const pick = (e: { clientX: number; clientY: number }): CityPick => ({ name: a.name, means: a.means, zone, x: e.clientX, y: e.clientY })
  const has = (r: Roof) => a.roof.includes(r)
  return (
    <group ref={g}
      onPointerOver={e => { if (!up()) return; e.stopPropagation(); hot.current = true; line.current.visible = true; document.body.style.cursor = 'pointer'; cityBus.emit(cityBus.hover, pick(e)); invalidate() }}
      onPointerMove={e => { if (hot.current) cityBus.emit(cityBus.hover, pick(e)) }}
      onPointerOut={() => { hot.current = false; line.current.visible = false; document.body.style.cursor = ''; cityBus.emit(cityBus.hover, null); invalidate() }}
      onClick={e => { if (!up()) return; e.stopPropagation(); g.current.getWorldPosition(UP); live.current.focus = (live.current.focus ?? new THREE.Vector3()).set(UP.x, Math.min(h * 0.4, 2.4), UP.z); cityBus.emit(cityBus.select, pick(e)); invalidate() }}>
      <mesh castShadow receiveShadow geometry={geo} material={mat} />
      <lineSegments ref={line} geometry={edges} material={OUTLINE} visible={false} scale={1.012} />
      {/* a thin parapet gives every roof a clean edge */}
      <mesh position={[0, h + 0.03, 0]} material={TRIM}><boxGeometry args={[w + 0.05, 0.06, d + 0.05]} /></mesh>
      {(has('shop') || has('redshop')) && <mesh castShadow position={[0, Math.min(0.36, h * 0.6), 0]} material={has('redshop') ? RED : AWNING}><boxGeometry args={[w + 0.16, 0.035, d + 0.16]} /></mesh>}
      {has('ac') && <mesh castShadow position={[w * 0.2, h + 0.15, -d * 0.14]} material={TRIM}><boxGeometry args={[w * 0.3, 0.2, d * 0.28]} /></mesh>}
      {has('tank') && <mesh castShadow position={[-w * 0.24, h + 0.17, -d * 0.2]} material={TANK}><cylinderGeometry args={[0.09, 0.09, 0.2, 10]} /></mesh>}
      {has('pent') && <mesh position={[w * 0.18, h + 0.17, d * 0.1]} material={GLOW}><boxGeometry args={[w * 0.36, 0.22, d * 0.4]} /></mesh>}
      {has('gable') && <mesh castShadow position={[0, h + 0.24, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w * 0.8, 1, d * 0.8]} material={TILE}><coneGeometry args={[1, 0.42, 4]} /></mesh>}
      {has('dome') && <mesh castShadow position={[0, h + 0.06, 0]} material={STONE}><sphereGeometry args={[Math.min(w, d) * 0.4, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
      {has('arch') && <mesh castShadow position={[0, h + 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={m.glass}><cylinderGeometry args={[d * 0.5, d * 0.5, w, 18, 1, false, 0, Math.PI]} /></mesh>}
      {has('step') && <>
        <mesh castShadow position={[0, h + h * 0.11, 0]} material={m[style]}><boxGeometry args={[w * 0.72, h * 0.22, d * 0.72]} /></mesh>
        <mesh castShadow position={[0, h + h * 0.29, 0]} material={m[style]}><boxGeometry args={[w * 0.46, h * 0.14, d * 0.46]} /></mesh>
      </>}
      {has('solar') && [-0.26, 0, 0.26].map(o => <mesh key={o} position={[w * o, h + 0.1, d * 0.12]} rotation={[-0.45, 0, 0]} material={SOLAR}><boxGeometry args={[w * 0.2, 0.012, d * 0.42]} /></mesh>)}
      {has('garden') && <>
        <mesh position={[-w * 0.12, h + 0.075, d * 0.1]} material={GREEN}><boxGeometry args={[w * 0.6, 0.05, d * 0.6]} /></mesh>
        {[-0.3, -0.05, 0.12].map((o, i) => <mesh key={o} castShadow position={[w * o, h + 0.17, d * (i % 2 ? 0.22 : -0.02)]} material={GREEN}><icosahedronGeometry args={[0.085, 0]} /></mesh>)}
      </>}
      {has('sign') && <mesh position={[0, Math.max(h - 0.14, h * 0.78), d / 2 + 0.015]} material={GLOW}><boxGeometry args={[w * 0.56, 0.09, 0.02]} /></mesh>}
      {has('cross') && <group position={[w / 2 + 0.015, h * 0.8, 0]}>
        <mesh material={CROSS}><boxGeometry args={[0.02, 0.2, 0.06]} /></mesh><mesh material={CROSS}><boxGeometry args={[0.02, 0.06, 0.2]} /></mesh>
      </group>}
      {has('flag') && <group position={[-w * 0.36, h, d * 0.3]}>
        <mesh position={[0, 0.25, 0]} material={TRIM}><cylinderGeometry args={[0.008, 0.008, 0.5, 5]} /></mesh>
        <mesh position={[0.07, 0.43, 0]} material={RED}><boxGeometry args={[0.14, 0.08, 0.008]} /></mesh>
      </group>}
      {has('balcony') && Array.from({ length: Math.min(Math.floor(h / 0.48), 6) }, (_, i) => <mesh key={i} position={[0, 0.5 + i * 0.48, d / 2 + 0.045]} material={TRIM}><boxGeometry args={[w * 0.92, 0.025, 0.09]} /></mesh>)}
      {has('crown') && <>
        <mesh castShadow position={[0, h + (has('step') ? h * 0.36 : 0) + 0.18, 0]} material={m[style]}><boxGeometry args={[w * 0.4, 0.3, d * 0.4]} /></mesh>
        <mesh position={[0, h + (has('step') ? h * 0.36 : 0) + 0.35, 0]} material={GLOW}><boxGeometry args={[w * 0.42, 0.04, d * 0.42]} /></mesh>
      </>}
      {has('spire') && <group position={[0, h + (has('step') ? h * 0.36 : 0), 0]}>
        <mesh castShadow position={[0, 0.27, 0]} material={m[style]}><boxGeometry args={[w * 0.5, 0.54, d * 0.5]} /></mesh>
        <mesh position={[0, 1.24, 0]} material={TRIM}><cylinderGeometry args={[0.012, 0.045, 1.4, 6]} /></mesh>
        <mesh position={[0, 1.96, 0]} material={BEACON}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
      </group>}
      {has('heli') && <>
        <mesh position={[0, h + 0.1, 0]} material={PAD}><cylinderGeometry args={[w * 0.42, w * 0.42, 0.06, 28]} /></mesh>
        <mesh position={[0, h + 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]} material={PAD_RING}><ringGeometry args={[w * 0.3, w * 0.34, 32]} /></mesh>
        <mesh position={[0, h + 0.136, 0]} material={PAD_RING}><boxGeometry args={[0.2, 0.002, 0.04]} /></mesh>
        <mesh position={[-0.1, h + 0.136, 0]} material={PAD_RING}><boxGeometry args={[0.04, 0.002, 0.24]} /></mesh>
        <mesh position={[0.1, h + 0.136, 0]} material={PAD_RING}><boxGeometry args={[0.04, 0.002, 0.24]} /></mesh>
      </>}
    </group>
  )
}

/** Zone k as a city block. Later blocks rise slower, because they are taller. */
export function makeCity(k: number) {
  const list = TIERS[k], dur = 0.9 + k * 0.12, gap = 0.2 + k * 0.03
  const total = (list.length - 1) * gap + dur + 0.6
  function Block() {
    return (
      <group>
        {list.map((b, i) => (
          <Piece key={i} at={i * gap} dur={dur} h={b.a.size[1]} dust={Math.max(b.a.size[0], b.a.size[2]) * 0.95} position={[b.x, 0, b.z]}>
            <Building b={b} n={k * 7 + i} zone={k} />
          </Piece>
        ))}
        <Sweep at={total - 0.5} r={4.5} />
      </group>
    )
  }
  return { C: Block, total }
}

const CARS = 9
const CAR = new THREE.BoxGeometry(0.13, 0.085, 0.27).translate(0, 0.085, 0)
const LAMP = new THREE.BoxGeometry(0.11, 0.025, 0.02).translate(0, 0.075, 0.14)
const cp = new THREE.Vector3(), ct = new THREE.Vector3(), cq = new THREE.Quaternion(), cs = new THREE.Vector3(1, 1, 1), cm = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0)

/** Light traffic on the paved road: two instanced meshes, moved in place each frame, nothing allocated. */
export function Traffic() {
  const live = useLive()
  const cars = useRef<THREE.InstancedMesh>(null!), lamps = useRef<THREE.InstancedMesh>(null!)
  useEffect(() => {
    const c = new THREE.Color()
    for (let i = 0; i < CARS; i++) cars.current.setColorAt(i, c.set(['#1b1c20', '#3a3c42', '#6a6d74', '#23303f', '#4a2f2c'][i % 5]))
    cars.current.instanceColor!.needsUpdate = true
  }, [])
  // listens for "reset view" from the page
  useEffect(() => { const f = () => { const L = live.current; L.focus = null; L.orbitTo = 0; L.pitchTo = 0; L.zoomMul = 1; L.busy.current = true }; cityBus.reset.add(f); return () => { cityBus.reset.delete(f) } }, [live])
  useFrame(state => {
    const L = live.current, paved = L.world.pavedSegments, t = state.clock.elapsedTime
    const on = paved > 2 && !L.lite
    cars.current.visible = lamps.current.visible = on
    if (!on) return
    for (let i = 0; i < CARS; i++) {
      const dir = i % 2 ? 1 : -1, f = ((t * 0.035 * (1 + (i % 3) * 0.2) + i / CARS) % 1 + 1) % 1
      const u = uOfSegment((dir > 0 ? f : 1 - f) * paved)
      ROAD.getPointAt(u, cp); ROAD.getTangentAt(u, ct)
      const side = -0.3 * dir - 0.05
      cp.x += -ct.z * side; cp.z += ct.x * side; cp.y = 0.05
      cq.setFromAxisAngle(Y, Math.atan2(ct.x, ct.z) + (dir > 0 ? 0 : Math.PI))
      cm.compose(cp, cq, cs)
      cars.current.setMatrixAt(i, cm); lamps.current.setMatrixAt(i, cm)
    }
    cars.current.instanceMatrix.needsUpdate = lamps.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={cars} args={[CAR, undefined, CARS]} castShadow frustumCulled={false}><meshStandardMaterial roughness={0.35} metalness={0.4} /></instancedMesh>
      <instancedMesh ref={lamps} args={[LAMP, undefined, CARS]} frustumCulled={false}><meshBasicMaterial color="#fff1d0" /></instancedMesh>
    </>
  )
}
