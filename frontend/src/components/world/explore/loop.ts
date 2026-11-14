import * as THREE from 'three'

// One looping road around the island district (about 30 x 30 units). The character always stays on
// it, so there is nothing to get stuck on: the "waypoint graph" is this closed loop.
export const LOOP = new THREE.CatmullRomCurve3([
  [-9, 0, 8], [0, 0, 10.5], [9, 0, 8], [11, 0, 0], [8, 0, -8], [0, 0, -10], [-8, 0, -8], [-11, 0, 0],
].map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'catmullrom', 0.5)
export const LOOP_LEN = LOOP.getLength()

/** Nearest point on the loop to a world position, as u in 0..1. */
const SAMPLES = 400
const samples = Array.from({ length: SAMPLES }, (_, i) => LOOP.getPointAt(i / SAMPLES))
export function nearestU(p: THREE.Vector3) {
  let best = 0, bd = Infinity
  samples.forEach((s, i) => { const d = s.distanceToSquared(p); if (d < bd) { bd = d; best = i } })
  return best / SAMPLES
}

/** Signed shortest distance from a to b around the loop (in u). */
export const loopDelta = (a: number, b: number) => { let d = b - a; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return d }
export const wrap = (u: number) => ((u % 1) + 1) % 1
