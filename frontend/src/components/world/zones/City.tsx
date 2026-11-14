import { useMemo } from 'react'
import * as THREE from 'three'
import { Piece, Sweep } from '../build'

/**
 * The Life Road as a city street. Each zone is a block, and each block is richer than the last:
 * corner shops, low-rise flats, mid-rise, mixed use, glass offices, towers, then the landmark and
 * a penthouse tower with a helipad. Buildings share four materials and rise out of the ground.
 */
type Style = 'brick' | 'concrete' | 'glass' | 'prime'
type Roof = 'shop' | 'ac' | 'pent' | 'spire' | 'heli' | 'crown'
/** [width, height, depth, x, z, style, roof?] */
type B = [number, number, number, number, number, Style, Roof?]

const TIERS: B[][] = [
  [[1.2, 0.8, 1.0, -1.3, -0.5, 'brick', 'shop'], [1.0, 1.0, 0.9, 0.1, -0.6, 'brick', 'shop'], [1.1, 0.7, 0.9, 1.4, -0.4, 'brick', 'shop']],
  [[1.3, 1.7, 1.1, -1.3, -0.5, 'brick', 'ac'], [1.1, 2.1, 1.0, 0.15, -0.6, 'brick'], [1.2, 1.4, 1.0, 1.5, -0.3, 'brick', 'shop'], [0.9, 1.1, 0.8, -0.5, 0.9, 'brick', 'ac']],
  [[1.3, 2.6, 1.2, -1.3, -0.5, 'concrete', 'ac'], [1.2, 3.1, 1.1, 0.2, -0.6, 'concrete'], [1.2, 2.2, 1.1, 1.6, -0.2, 'concrete', 'shop'], [1.0, 1.6, 0.9, -0.6, 1.0, 'brick', 'ac']],
  [[1.4, 3.4, 1.2, -1.3, -0.6, 'concrete', 'ac'], [1.2, 3.8, 1.2, 0.25, -0.5, 'glass'], [1.3, 2.8, 1.1, 1.7, -0.2, 'concrete', 'pent'], [1.1, 2.0, 1.0, -0.5, 1.0, 'concrete', 'shop']],
  [[1.4, 4.6, 1.3, -1.4, -0.6, 'glass', 'ac'], [1.3, 5.2, 1.3, 0.2, -0.6, 'glass', 'crown'], [1.3, 3.9, 1.2, 1.7, -0.2, 'glass'], [1.1, 2.6, 1.0, -0.5, 1.0, 'concrete', 'pent'], [0.9, 1.9, 0.9, 1.0, 1.1, 'glass']],
  [[1.4, 5.4, 1.3, -1.4, -0.6, 'prime', 'crown'], [1.3, 4.8, 1.3, 0.2, -0.7, 'glass', 'ac'], [1.3, 5.6, 1.2, 1.7, -0.3, 'prime', 'spire'], [1.2, 3.4, 1.1, -0.6, 1.0, 'glass', 'pent'], [1.0, 2.6, 0.9, 1.0, 1.1, 'prime']],
  [[1.5, 9.4, 1.5, -1.2, -0.9, 'prime', 'spire'], [1.5, 7.6, 1.4, 0.7, -0.5, 'prime', 'heli'], [1.2, 5.8, 1.2, 2.2, 0.2, 'glass', 'crown'], [1.2, 4.6, 1.1, -0.9, 1.0, 'prime', 'pent'], [1.0, 3.4, 1.0, 0.8, 1.2, 'glass']],
]
/** Blueprint silhouettes for blocks not built yet: [w, h, d, x, z]. */
export const CITY_GHOSTS = TIERS.map(t => t.map(([w, h, d, x, z]) => [w, h, d, x, z] as [number, number, number, number, number]))

const LOOK: Record<Style, { wall: string; glass: string; lit: number; cell: number; win: [number, number, number, number]; rough: number; metal: number }> = {
  brick: { wall: '#6e625a', glass: '#1c2026', lit: 0.32, cell: 0.24, win: [0.26, 0.24, 0.48, 0.5], rough: 0.92, metal: 0 },
  concrete: { wall: '#83858b', glass: '#1c2127', lit: 0.4, cell: 0.26, win: [0.14, 0.26, 0.72, 0.5], rough: 0.85, metal: 0 },
  glass: { wall: '#414b56', glass: '#52616f', lit: 0.36, cell: 0.3, win: [0.05, 0.08, 0.9, 0.84], rough: 0.28, metal: 0.35 },
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

function Building({ b, n }: { b: B; n: number }) {
  const [w, h, d, , , style, roof] = b
  const m = materials()
  const geo = useMemo(() => shell(w, h, d, style, n), [w, h, d, style, n])
  const mat = useMemo(() => [m[style], m[style], ROOF, ROOF, m[style], m[style]], [m, style])
  return (
    <group>
      <mesh castShadow receiveShadow geometry={geo} material={mat} />
      {/* a thin parapet gives every roof a clean edge */}
      <mesh position={[0, h + 0.03, 0]} material={TRIM}><boxGeometry args={[w + 0.05, 0.06, d + 0.05]} /></mesh>
      {roof === 'shop' && <mesh castShadow position={[0, 0.36, 0]} material={AWNING}><boxGeometry args={[w + 0.14, 0.035, d + 0.14]} /></mesh>}
      {roof === 'ac' && <mesh castShadow position={[w * 0.18, h + 0.15, -d * 0.12]} material={TRIM}><boxGeometry args={[w * 0.32, 0.2, d * 0.3]} /></mesh>}
      {roof === 'pent' && <mesh position={[0, h + 0.19, 0]} material={GLOW}><boxGeometry args={[w * 0.5, 0.22, d * 0.5]} /></mesh>}
      {roof === 'crown' && <>
        <mesh castShadow position={[0, h + 0.24, 0]} material={m[style]}><boxGeometry args={[w * 0.7, 0.42, d * 0.7]} /></mesh>
        <mesh position={[0, h + 0.47, 0]} material={GLOW}><boxGeometry args={[w * 0.72, 0.04, d * 0.72]} /></mesh>
      </>}
      {roof === 'spire' && <>
        <mesh castShadow position={[0, h + 0.3, 0]} material={m[style]}><boxGeometry args={[w * 0.55, 0.54, d * 0.55]} /></mesh>
        <mesh position={[0, h + 1.25, 0]} material={TRIM}><cylinderGeometry args={[0.012, 0.045, 1.4, 6]} /></mesh>
        <mesh position={[0, h + 1.97, 0]} material={BEACON}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
      </>}
      {roof === 'heli' && <>
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
          <Piece key={i} at={i * gap} dur={dur} h={b[1]} dust={Math.max(b[0], b[2]) * 0.95} position={[b[3], 0, b[4]]}>
            <Building b={b} n={k * 7 + i} />
          </Piece>
        ))}
        <Sweep at={total - 0.5} r={4.5} />
      </group>
    )
  }
  return { C: Block, total }
}
