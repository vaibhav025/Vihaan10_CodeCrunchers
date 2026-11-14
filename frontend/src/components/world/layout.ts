import * as THREE from 'three'
import { ZONES, TOTAL_SEGMENTS } from './worldFromProfile'

// The Life Road winds away from the viewer; zone k sits beside the road at u = k / 6.
const GAP = 12
const pts: THREE.Vector3[] = []
ZONES.forEach((_, k) => {
  const side = k % 2 ? 1 : -1
  pts.push(new THREE.Vector3(side * 2.6, 0, -k * GAP))
  if (k < ZONES.length - 1) pts.push(new THREE.Vector3(-side * 0.6, 0, -k * GAP - GAP / 2))
})
export const ROAD = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
export const ROAD_LENGTH = ROAD.getLength()
export const uOfSegment = (s: number) => Math.min(Math.max(s / TOTAL_SEGMENTS, 0), 1)
export const zoneU = (k: number) => k / (ZONES.length - 1)

/** Point on the road at segment s, nudged sideways (positive = left of travel). */
export function roadPoint(s: number, side = 0, out = new THREE.Vector3()) {
  const u = uOfSegment(s)
  ROAD.getPointAt(u, out)
  if (side) { const t = ROAD.getTangentAt(u); out.x += -t.z * side; out.z += t.x * side }
  return out
}

/** Centre of zone k: beside its road anchor, on the outside of the bend. */
export function zoneCenter(k: number) {
  const p = ROAD.getPointAt(zoneU(k))
  return new THREE.Vector3(p.x + (k % 2 ? 4.2 : -4.2), 0, p.z - 1)
}

export const ISLAND = { width: 26, from: 9, to: -(ZONES.length - 1) * GAP - 9 }
