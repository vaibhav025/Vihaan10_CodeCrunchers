import { createContext, useContext, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { WorldState } from './worldFromProfile'

/** Mutable per-frame state shared by the scene's parts (no React re-renders). */
export interface Live {
  world: WorldState
  /** set by any part that is animating this frame; the driver renders at full rate while true */
  busy: { current: boolean }
  /** character's displayed position on the road, in segments */
  charS: number
  charPos: THREE.Vector3
  /** look offset along the road from dragging, in segments */
  look: number
  lookTo: number
  zoomMul: number
  /** drag-to-orbit angles (radians), eased toward their targets */
  orbit: number; orbitTo: number; pitch: number; pitchTo: number
  /** a building the camera is holding on, or null */
  focus: THREE.Vector3 | null
  mode: 'home' | 'quest' | 'landing'
  /** landing: camera position along the road from page scroll, in segments */
  scrollS: number
  dark: boolean
  cine: { active: boolean; target: THREE.Vector3; lookAt: THREE.Vector3 | null; lookUntil: number }
  celebrateAt: number
  nudgeAt: number
  dimAt: number
  /** Lite quality: no weather, no shadows, slower idle frame rate */
  lite: boolean
}
export const LiveCtx = createContext<MutableRefObject<Live>>(null!)
export const useLive = () => useContext(LiveCtx)
