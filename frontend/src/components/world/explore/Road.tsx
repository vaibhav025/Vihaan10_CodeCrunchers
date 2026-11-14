import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LOOP } from './loop'
import { useExplore } from './state'
import { world as C } from '../../../design-tokens'

const N = 120
const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3)

/** The road loop as instanced tiles; it lays itself as the world opens. */
export default function Road() {
  const live = useExplore()
  const ref = useRef<THREE.InstancedMesh>(null!)
  const frames = useMemo(() => Array.from({ length: N }, (_, i) => {
    const u = i / N, t = LOOP.getTangentAt(u)
    return { p: LOOP.getPointAt(u).setY(0.02), q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(t.x, t.z)) }
  }), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  const last = useRef(-1)
  useFrame(() => {
    const o = live.current.open
    if (Math.abs(o - last.current) < 0.002) return
    last.current = o
    frames.forEach((f, i) => {
      const k = ease((o - 0.35 - (i / N) * 0.4) / 0.2)
      ref.current.setMatrixAt(i, m4.compose(f.p, f.q, sc.set(k, 1, k)))
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} receiveShadow frustumCulled={false}>
      <boxGeometry args={[1.5, 0.04, (LOOP.getLength() / N) * 1.12]} />
      <meshStandardMaterial color={C.road} flatShading roughness={0.95} />
    </instancedMesh>
  )
}
