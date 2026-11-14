import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TOTAL_SEGMENTS } from './worldFromProfile'
import { roadPoint } from './layout'
import { useLive } from './sceneState'

const MAX = 15 // one per badge
const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), none = new THREE.Vector3()

/** A small engraved medal on a post beside the road for every badge earned. */
export default function Trinkets() {
  const live = useLive()
  const posts = useRef<THREE.InstancedMesh>(null!)
  const medals = useRef<THREE.InstancedMesh>(null!)
  const shown = useRef(-1)
  const update = () => {
    const n = Math.min(live.current.world.trinkets, MAX)
    if (n === shown.current) return
    shown.current = n
    for (let i = 0; i < MAX; i++) {
      const s = ((i + 0.7) / MAX) * TOTAL_SEGMENTS
      roadPoint(s, i % 2 ? -0.95 : 0.95, v)
      const sc = i < n ? one : none
      posts.current.setMatrixAt(i, m4.compose(v.setY(0.2), q, sc))
      medals.current.setMatrixAt(i, m4.compose(v.setY(0.48), q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, i * 0.4)), sc))
      q.identity()
    }
    posts.current.instanceMatrix.needsUpdate = medals.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(update)
  useFrame(update)
  return (
    <>
      <instancedMesh ref={posts} args={[undefined, undefined, MAX]} frustumCulled={false}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#7A5C44" flatShading /></instancedMesh>
      <instancedMesh ref={medals} args={[undefined, undefined, MAX]} frustumCulled={false} castShadow><cylinderGeometry args={[0.1, 0.1, 0.03, 10]} /><meshStandardMaterial color="#D9A441" metalness={0.5} roughness={0.4} emissive="#7A5A1C" emissiveIntensity={0.3} /></instancedMesh>
    </>
  )
}
