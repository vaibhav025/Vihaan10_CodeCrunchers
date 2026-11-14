import { createContext, useContext, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { WorldState } from '../worldFromProfile'

/** Per-frame state for the explorable world (no React re-renders). */
export interface ExploreLive {
  world: WorldState
  /** 0 = intro island only, 1 = full world. Animates over about 2 s after "Tap to begin". */
  open: number
  openTo: number
  /** character position on the road loop, 0..1 */
  u: number
  /** where the character is walking to (on the loop), or null when standing */
  goal: number | null
  /** keyboard direction in world space (x, z) */
  keys: THREE.Vector2
  pos: THREE.Vector3
  heading: THREE.Vector3
  moving: boolean
  busy: boolean
  still: boolean
}
export const Ctx = createContext<MutableRefObject<ExploreLive>>(null!)
export const useExplore = () => useContext(Ctx)
