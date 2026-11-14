import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useExplore } from './state'
import { world as C } from '../../../design-tokens'

const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3)
const TREES = Array.from({ length: 34 }, (_, i) => {
  const a = i * 2.39996, r = 4 + ((i * 53) % 100) / 100 * 10
  return [Math.cos(a) * r, Math.sin(a) * r, 0.7 + ((i * 7) % 5) / 10, i % 7 === 0] as const
}).filter(([x, z]) => Math.abs(Math.hypot(x / 10.5, z / 9.5) - 1) > 0.16) // keep the road clear

/**
 * The district. At open = 0 only the small intro island shows, with a glowing rim; as open rises
 * to 1 the ground widens into the full island and the trees grow in.
 */
export default function Island() {
  const live = useExplore()
  const ground = useRef<THREE.Group>(null!)
  const rim = useRef<THREE.Mesh>(null!)
  const rimMat = useRef<THREE.MeshBasicMaterial>(null!)
  const crowns = useRef<THREE.InstancedMesh>(null!)
  const trunks = useRef<THREE.InstancedMesh>(null!)
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  // white material so each tree's own colour shows true (instance colours multiply)
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, roughness: 0.95 }), [])
  const autumn = useMemo(() => new THREE.Color(C.autumn), [])
  const sage = useMemo(() => new THREE.Color(C.round), [])

  useFrame((state) => {
    const L = live.current, e = ease(L.open), t = state.clock.elapsedTime
    // intro island radius 3.2 widens to the full 16
    const r = 3.2 + e * 12.8
    ground.current.scale.set(r, 1, r)
    // idle: the small island floats; it settles as the world opens
    ground.current.position.y = L.still ? 0 : Math.sin(t * 1.1) * 0.06 * (1 - e)
    rim.current.scale.set(r, r, 1)
    rim.current.position.y = ground.current.position.y + 0.02
    rimMat.current.opacity = 0.55 * (1 - e * 0.85) * (0.85 + Math.sin(t * 1.6) * 0.15)
    TREES.forEach(([x, z, s, red], i) => {
      const k = ease((L.open - 0.25 - i * 0.012) / 0.5) * s
      crowns.current.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.95 * k, z), q, new THREE.Vector3(k, k, k)))
      trunks.current.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0.22 * k, z), q, new THREE.Vector3(k, k, k)))
      crowns.current.setColorAt(i, red ? autumn : sage)
    })
    crowns.current.instanceMatrix.needsUpdate = trunks.current.instanceMatrix.needsUpdate = true
    if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true
    if (L.open < 1 && L.openTo > L.open) L.busy = true
  })

  return (
    <>
      <group ref={ground}>
        {/* moss top, sand edge, earth underside: one unit wide, scaled by the opening */}
        <mesh receiveShadow position={[0, -0.15, 0]}><cylinderGeometry args={[1, 1, 0.3, 48]} /><meshStandardMaterial color={C.grass} flatShading /></mesh>
        <mesh position={[0, -0.32, 0]}><cylinderGeometry args={[1.03, 1.0, 0.1, 48]} /><meshStandardMaterial color="#E3D3AE" flatShading /></mesh>
        <mesh position={[0, -1.0, 0]}><cylinderGeometry args={[1.0, 0.55, 1.3, 24]} /><meshStandardMaterial color={C.earth} flatShading /></mesh>
        <mesh position={[0, -1.9, 0]}><coneGeometry args={[0.55, 0.9, 12]} /><meshStandardMaterial color={C.earthDeep} flatShading /></mesh>
      </group>
      {/* soft glowing rim around the island's edge */}
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.12, 64]} />
        <meshBasicMaterial ref={rimMat} color="#F0B67A" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, TREES.length]} castShadow material={crownMat} frustumCulled={false}>
        <icosahedronGeometry args={[0.6, 0]} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.1, 0.44, 5]} /><meshStandardMaterial color={C.trunk} flatShading />
      </instancedMesh>
    </>
  )
}
