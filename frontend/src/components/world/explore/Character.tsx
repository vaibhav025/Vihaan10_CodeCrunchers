import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LOOP, LOOP_LEN, loopDelta, wrap } from './loop'
import { useExplore } from './state'
import { world as C, type FutureState } from '../../../design-tokens'

const LEAN: Record<FutureState, number> = { thriving: 0, stable: 0.05, struggling: 0.12, critical: 0.2, zero: 0.26 }
const LEG = new THREE.BoxGeometry(0.07, 0.25, 0.09).translate(0, -0.125, 0)
const ARM = new THREE.BoxGeometry(0.055, 0.22, 0.06).translate(0, -0.11, 0)
const SPEED = 3.2 // units per second
const tan = new THREE.Vector3(), onRoad = new THREE.Vector3(), key = new THREE.Vector3()
const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3)

/** Future You. Walks along the road loop to a tapped point, or with the keys, gently steered along the road. */
export default function Character() {
  const live = useExplore()
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Mesh>(null!), legR = useRef<THREE.Mesh>(null!)
  const armL = useRef<THREE.Group>(null!), armR = useRef<THREE.Group>(null!)
  useFrame((state, dt) => {
    const L = live.current, d = Math.min(dt, 0.05), t = state.clock.elapsedTime
    let dir = 0
    if (L.open >= 1) {
      LOOP.getTangentAt(L.u, tan)
      if (L.keys.lengthSq() > 0) {
        // keys: walk the way along the road that best matches the pressed direction
        key.set(L.keys.x, 0, L.keys.y)
        dir = Math.sign(tan.dot(key)) || 0
        L.goal = null
      } else if (L.goal !== null) {
        const gap = loopDelta(L.u, L.goal)
        if (Math.abs(gap) * LOOP_LEN < 0.05) L.goal = null
        else dir = Math.sign(gap)
      }
      if (dir) L.u = wrap(L.u + dir * Math.min((SPEED * d) / LOOP_LEN, L.goal !== null ? Math.abs(loopDelta(L.u, L.goal)) : 1))
    }
    L.moving = dir !== 0
    // during the intro the character stands at the island's centre, then steps onto the road
    LOOP.getPointAt(L.u, onRoad)
    root.current.position.set(0, 0, 0).lerp(onRoad, ease((L.open - 0.6) / 0.4))
    if (L.open < 1 && !L.still) root.current.position.y += Math.sin(t * 1.1) * 0.06 * (1 - L.open)
    L.pos.copy(root.current.position)
    if (dir) {
      LOOP.getTangentAt(L.u, tan).multiplyScalar(dir)
      L.heading.lerp(tan, Math.min(d * 8, 1))
    }
    let dy = Math.atan2(L.heading.x, L.heading.z) - root.current.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    root.current.rotation.y += dy * Math.min(d * 10, 1)
    const swing = L.moving ? Math.sin(t * 9) * 0.6 : 0
    legL.current.rotation.x = swing; legR.current.rotation.x = -swing
    armL.current.rotation.x = -swing * 0.7; armR.current.rotation.x = swing * 0.7
    body.current.position.y = L.moving ? Math.abs(Math.sin(t * 9)) * 0.025 : Math.sin(t * 1.6) * 0.006
    body.current.rotation.x = LEAN[L.world.futureYouState]
    if (L.moving) L.busy = true
  })
  return (
    <group ref={root} scale={2.2}>
      <mesh ref={legL} castShadow position={[-0.045, 0.25, 0]} geometry={LEG}><meshStandardMaterial color="#5A5148" flatShading /></mesh>
      <mesh ref={legR} castShadow position={[0.045, 0.25, 0]} geometry={LEG}><meshStandardMaterial color="#5A5148" flatShading /></mesh>
      <group ref={body}>
        <group position={[0, 0.25, 0]}>
          <mesh castShadow position={[0, 0.14, 0]}><boxGeometry args={[0.22, 0.29, 0.14]} /><meshStandardMaterial color="#4C6A58" flatShading /></mesh>
          <group ref={armL} position={[-0.14, 0.27, 0]}><mesh castShadow geometry={ARM}><meshStandardMaterial color={C.skin} flatShading /></mesh></group>
          <group ref={armR} position={[0.14, 0.27, 0]}><mesh castShadow geometry={ARM}><meshStandardMaterial color={C.skin} flatShading /></mesh></group>
          <mesh castShadow position={[0, 0.37, 0]}><icosahedronGeometry args={[0.085, 1]} /><meshStandardMaterial color={C.skin} flatShading /></mesh>
          <mesh position={[0, 0.41, -0.018]} scale={[1, 0.7, 1]}><icosahedronGeometry args={[0.09, 1]} /><meshStandardMaterial color={C.hair} flatShading /></mesh>
        </group>
      </group>
    </group>
  )
}
