import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MAX_LANTERNS, TOTAL_SEGMENTS } from './worldFromProfile'
import { roadPoint } from './layout'
import { useLive } from './sceneState'

const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), none = new THREE.Vector3(0, 0, 0), q = new THREE.Quaternion()
const LIT = new THREE.Color('#F7B25F'), DARK = new THREE.Color('#CFC9B4')
const at = (k: number) => ((k + 0.5) / MAX_LANTERNS) * TOTAL_SEGMENTS

/** One lantern per streak day along the paved road, up to 30. Two instanced draw calls. */
export default function Lanterns() {
  const live = useLive()
  const posts = useRef<THREE.InstancedMesh>(null!)
  const heads = useRef<THREE.InstancedMesh>(null!)
  const key = useRef('')
  const update = () => {
    const { pavedSegments, lanternsLit } = live.current.world
    const k = `${pavedSegments}:${lanternsLit}`
    if (k === key.current) return
    key.current = k
    for (let i = 0; i < MAX_LANTERNS; i++) {
      const show = at(i) <= pavedSegments
      roadPoint(at(i), i % 2 ? 0.48 : -0.48, v)
      posts.current.setMatrixAt(i, m4.compose(v.setY(0.3), q, show ? one : none))
      heads.current.setMatrixAt(i, m4.compose(v.setY(0.66), q, show ? one : none))
      heads.current.setColorAt(i, i < lanternsLit ? LIT : DARK)
    }
    posts.current.instanceMatrix.needsUpdate = heads.current.instanceMatrix.needsUpdate = true
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true
  }
  useLayoutEffect(update)
  useFrame(update)
  return (
    <>
      <instancedMesh ref={posts} args={[undefined, undefined, MAX_LANTERNS]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.025, 0.03, 0.6, 5]} /><meshStandardMaterial color="#4F5A4C" flatShading />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX_LANTERNS]} frustumCulled={false}>
        <boxGeometry args={[0.13, 0.15, 0.13]} /><meshBasicMaterial />
      </instancedMesh>
    </>
  )
}
