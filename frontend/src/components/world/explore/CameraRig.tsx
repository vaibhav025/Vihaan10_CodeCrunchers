import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExplore } from './state'

// close and low on the intro island, pulled back and up over the district
const INTRO = new THREE.Vector3(0, 6.5, 13)
const WORLD = new THREE.Vector3(0, 13.5, 16.5)
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** Follows the character with a smooth lerp and a little look-ahead; eases out a touch while walking. */
export default function CameraRig() {
  const live = useExplore()
  const camera = useThree(s => s.camera)
  const v = useMemo(() => ({ target: new THREE.Vector3(), look: new THREE.Vector3(), off: new THREE.Vector3(), zoom: 1 }), [])
  useFrame((_, dt) => {
    const L = live.current, d = Math.min(dt, 0.05), e = ease(Math.min(L.open, 1))
    v.zoom += ((L.moving ? 1.12 : 1) - v.zoom) * Math.min(d * 1.5, 1)
    v.off.lerpVectors(INTRO, WORLD, e).multiplyScalar(e > 0.99 ? v.zoom : 1)
    // look slightly ahead of the character, never away from it
    v.look.copy(L.pos).addScaledVector(L.heading, L.moving ? 1.6 : 0.4).setY(L.pos.y + 0.6)
    v.target.lerp(v.look, Math.min(d * 4, 1))
    camera.position.copy(v.target).add(v.off)
    camera.lookAt(v.target)
    if (Math.abs(v.zoom - (L.moving ? 1.12 : 1)) > 0.002) L.busy = true
  })
  return null
}
