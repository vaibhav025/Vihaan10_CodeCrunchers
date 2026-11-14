import { world as C } from '../../design-tokens'

// A flat isometric drawing of the same world. Shown while the 3D scene loads, when WebGL is
// unavailable, and on the share card.

const K = 26
const pt = (x: number, y: number, z: number) => [(x - z) * 0.866 * K + 250, (x + z) * 0.5 * K - y * K + 190] as const
const poly = (pts: (readonly [number, number])[]) => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')

function Box({ x, z, w, d, h, y = 0, top, right, left }: {
  x: number; z: number; w: number; d: number; h: number; y?: number; top: string; right: string; left: string
}) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h
  return (
    <>
      <polygon points={poly([pt(x1, y, z0), pt(x1, y, z1), pt(x1, y1, z1), pt(x1, y1, z0)])} fill={right} />
      <polygon points={poly([pt(x0, y, z1), pt(x1, y, z1), pt(x1, y1, z1), pt(x0, y1, z1)])} fill={left} />
      <polygon points={poly([pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)])} fill={top} />
    </>
  )
}

const TREES: [number, number, number, string][] = [
  [-4.2, -4, 0.64, C.pine], [-0.6, -3.8, 0.4, C.round], [1.7, -4.1, 0.7, C.pine], [0.7, -3.2, 0.56, C.autumn],
  [3.9, -3.9, 0.8, C.round], [-3.9, -1.1, 0.42, C.pine], [4.1, -1.6, 0.68, C.autumn], [-3.8, 1, 0.46, C.pine],
  [4.2, 1.6, 0.62, C.round], [-2.5, 2.2, 0.72, C.round], [-1.4, 3.6, 0.6, C.autumn], [-0.2, 4.2, 0.82, C.pine],
]
const ROUTE = [[4.7, 4.3], [3, 3.6], [2.4, 1.6], [0.6, 1], [-0.6, -0.4], [-1.8, -0.9], [-2.2, -1.55]]

export default function WorldStill({ vitality, road = 1, level = 0, className }: { vitality: number; road?: number; level?: number; className?: string }) {
  const v = vitality
  const alive = v > 0.3
  const grass = alive ? C.grass : C.grassDry
  const built = Math.max(2, Math.round(ROUTE.length * road * Math.min(Math.max((v - 0.05) / 0.37, 0), 1)))
  const s = 0.72 + 0.28 * Math.min(Math.max((v - 0.3) / 0.4, 0), 1)
  return (
    <svg viewBox="0 0 500 380" className={className} aria-hidden focusable="false">
      <ellipse cx="250" cy="330" rx="190" ry="26" fill="#243B2C" opacity="0.1" />
      <Box x={0} z={0} w={9.6} d={9.6} h={0.5} y={-1.9} top={C.earthDeep} right="#7C6149" left="#84684E" />
      <Box x={0} z={0} w={10} d={10} h={0.9} y={-1.4} top={C.earth} right="#A57C58" left="#B0855F" />
      <Box x={0} z={0} w={10} d={10} h={0.5} y={-0.5} top={grass} right={alive ? '#9FB07F' : '#A2A396'} left={alive ? '#ABBB89' : '#ABAC9F'} />
      {v > 0.08 && (
        <>
          <polyline points={poly(ROUTE.map(([x, z]) => pt(x, 0, z)))} fill="none" stroke="#5E7458" strokeWidth="1.2" strokeDasharray="4 5" />
          <polyline points={poly(ROUTE.slice(0, built).map(([x, z]) => pt(x, 0, z)))} fill="none" stroke={C.road} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {TREES.filter(t => t[2] <= v && t[1] < -1).map(([x, z, , c]) => <TreeGlyph key={`${x}${z}`} x={x} z={z} c={c} />)}
      {v > 0.1 && (
        <g>
          <Box x={-2.5} z={-2.5} w={1.8 * s} d={1.4 * s} h={1 * s} top={C.wall} right="#E0D6BF" left={C.wall} />
          <polygon
            points={poly([pt(-2.5 - 0.95 * s, s, -2.5 + 0.75 * s), pt(-2.5 + 0.95 * s, s, -2.5 + 0.75 * s), pt(-2.5 + 0.95 * s, 1.7 * s, -2.5), pt(-2.5 - 0.95 * s, 1.7 * s, -2.5)])}
            fill={alive ? C.roof : C.roofDull}
          />
          <polygon points={poly([pt(-2.5 + 0.95 * s, s, -2.5 + 0.75 * s), pt(-2.5 + 0.95 * s, s, -2.5 - 0.75 * s), pt(-2.5 + 0.95 * s, 1.7 * s, -2.5)])} fill={alive ? '#A9552F' : '#877B73'} />
          {v > 0.86 && <Box x={-1.05} z={-2.35} w={1.1} d={1} h={0.76} top={C.roof} right="#E0D6BF" left={C.wall} />}
        </g>
      )}
      {v > 0.1 && v < 0.4 && <path d={`M${pt(2, 0, -2.3).join(' ')} l0 -22 m0 8 l-8 -9 m8 4 l7 -10`} stroke={C.trunk} strokeWidth="2" fill="none" />}
      {TREES.filter(t => t[2] <= v && t[1] >= -1).map(([x, z, , c]) => <TreeGlyph key={`${x}${z}`} x={x} z={z} c={c} />)}
      {/* one landmark per level reached (zones 3-7), so each level has its own still */}
      {level >= 3 && <Box x={2.6} z={-3.4} w={0.9} h={0.12} d={1.6} top={C.autumn} right="#B96F33" left="#C77A3A" />}
      {level >= 4 && <Box x={3.6} z={-1.2} w={1.2} h={1.1} d={1} top={C.roof} right="#E0D6BF" left={C.wall} />}
      {level >= 5 && <Box x={3.4} z={1.2} w={1.4} h={0.8} d={0.9} top="#C9C3B3" right="#E0D6BF" left="#F4F1E8" />}
      {level >= 6 && <Box x={-3.6} z={3.2} w={2.2} h={0.1} d={0.8} top="#C9B26A" right="#A9BB78" left="#B5C27F" />}
      {level >= 7 && <Box x={-3.6} z={-3.6} w={0.5} h={2.4} d={0.5} top={C.lantern} right="#E0D6BF" left="#F3EAD6" />}
      {v < 0.2 && [[-60, -20], [40, 10], [110, -40], [-110, 30]].map(([dx, dy], i) => (
        <ellipse key={i} cx={250 + dx} cy={185 + dy} rx="62" ry="13" fill="#D9DAD3" opacity="0.7" />
      ))}
    </svg>
  )
}

function TreeGlyph({ x, z, c }: { x: number; z: number; c: string }) {
  const [sx, sy] = pt(x, 0, z)
  return c === C.pine ? (
    <g><rect x={sx - 1.5} y={sy - 10} width="3" height="10" fill={C.trunk} /><polygon points={`${sx - 11},${sy - 8} ${sx + 11},${sy - 8} ${sx},${sy - 38}`} fill={c} /></g>
  ) : (
    <g><rect x={sx - 1.5} y={sy - 12} width="3" height="12" fill={C.trunk} /><polygon points={`${sx - 12},${sy - 14} ${sx - 5},${sy - 30} ${sx + 7},${sy - 31} ${sx + 13},${sy - 17} ${sx + 4},${sy - 8} ${sx - 7},${sy - 8}`} fill={c} /></g>
  )
}
