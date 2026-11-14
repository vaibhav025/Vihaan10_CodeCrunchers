import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { roadPoint, ROAD, uOfSegment, zoneU } from './layout'
import { TOTAL_SEGMENTS } from './worldFromProfile'
import { useLive } from './sceneState'
import { Flat } from './build'
import { world as C, type FutureState } from '../../design-tokens'

const LEAN: Record<FutureState, number> = { thriving: 0, stable: 0.05, struggling: 0.12, critical: 0.2, zero: 0.26 }
const COAT: Record<FutureState, string> = { thriving: '#101113', stable: '#141518', struggling: '#1b1c1f', critical: '#232427', zero: '#2b2c2f' }
const LEG = new THREE.CapsuleGeometry(0.036, 0.17, 3, 10).translate(0, -0.12, 0)
const ARM = new THREE.CapsuleGeometry(0.028, 0.16, 3, 10).translate(0, -0.105, 0)
const SHOE = new THREE.BoxGeometry(0.066, 0.04, 0.125).translate(0, -0.235, 0.022)
const CLOTH = new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 0.72 })
const LEATHER = new THREE.MeshStandardMaterial({ color: '#08080a', roughness: 0.28, metalness: 0.2 })
const WHITE = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.7 })
const SKIN = new THREE.MeshStandardMaterial({ color: '#c99f85', roughness: 0.75 })
const SILVER = new THREE.MeshStandardMaterial({ color: '#d5d7da', roughness: 0.6 })
const STEEL = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.3, metalness: 0.8 })
const tan = new THREE.Vector3(), look = new THREE.Vector3()

/** Future You at 60: idles, walks to their place on the road, celebrates, turns to look at new buildings. */
export default function Character({ cosmetics = [] }: { cosmetics?: string[] }) {
  const live = useLive()
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!), legR = useRef<THREE.Group>(null!)
  const stride = useRef(0)
  const armL = useRef<THREE.Group>(null!), armR = useRef<THREE.Group>(null!)
  const coat = useRef<THREE.MeshStandardMaterial>(null!)
  const coatColor = useRef(new THREE.Color())

  useFrame((state, dt) => {
    const L = live.current, t = state.clock.elapsedTime, d = Math.min(dt, 0.05)
    // landing: walk zone by zone with the scroll, stopping in the middle of the zone in view
    const target = L.mode === 'landing' ? uOfSegment(zoneU(Math.min(Math.round(L.scrollS / 5), 6)) * TOTAL_SEGMENTS) * TOTAL_SEGMENTS : L.world.progress, gap = target - L.charS
    const walking = Math.abs(gap) > 0.01
    if (walking) { L.charS += Math.sign(gap) * Math.min(Math.abs(gap), d * (L.mode === 'landing' ? 4 : 1.3)); L.busy.current = true }
    roadPoint(L.charS, 0.18, root.current.position)
    L.charPos.copy(root.current.position)

    // face along the road, or toward something worth looking at
    let yaw: number
    if (L.cine.lookAt && t < L.cine.lookUntil) {
      look.copy(L.cine.lookAt).sub(root.current.position); yaw = Math.atan2(look.x, look.z)
    } else {
      ROAD.getTangentAt(uOfSegment(L.charS), tan); yaw = Math.atan2(tan.x, tan.z) + (gap < -0.01 ? Math.PI : 0)
    }
    let dy = yaw - root.current.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    root.current.rotation.y += dy * Math.min(d * 8, 1)

    const cel = t - L.celebrateAt, celebrating = cel > 0 && cel < 1.3
    // the stride eases in and out, so starting and stopping never snap
    stride.current += ((walking ? 1 : 0) - stride.current) * Math.min(d * 7, 1)
    const swing = Math.sin(t * 7.5) * 0.62 * stride.current
    legL.current.rotation.x = swing; legR.current.rotation.x = -swing
    armL.current.rotation.set(celebrating ? -2.6 : -swing * 0.7, 0, celebrating ? 0.3 : 0.06)
    // the briefcase arm swings less
    armR.current.rotation.set(celebrating ? -2.6 : swing * 0.28, 0, celebrating ? -0.3 : -0.05)
    const hop = celebrating ? Math.abs(Math.sin(cel * Math.PI * 2.4)) * 0.12 * (1 - cel / 1.3) : 0
    const breathe = Math.sin(t * 1.6) * 0.006
    body.current.position.y = hop + Math.abs(Math.sin(t * 7.5)) * 0.018 * stride.current + breathe * (1 - stride.current)
    body.current.rotation.x += ((celebrating ? -0.05 : LEAN[L.world.futureYouState]) - body.current.rotation.x) * Math.min(d * 4, 1)
    coatColor.current.set(COAT[L.world.futureYouState]); coat.current.color.lerp(coatColor.current, Math.min(d * 3, 1))
    if (celebrating) L.busy.current = true
  })

  return (
    <group ref={root} scale={1.5}>
      {/* placeholder Future You: black suit, white shirt, black tie, briefcase. Swap for a rigged GLB later. */}
      <group ref={legL} position={[-0.045, 0.27, 0]}><mesh castShadow geometry={LEG} material={CLOTH} /><mesh castShadow geometry={SHOE} material={LEATHER} /></group>
      <group ref={legR} position={[0.045, 0.27, 0]}><mesh castShadow geometry={LEG} material={CLOTH} /><mesh castShadow geometry={SHOE} material={LEATHER} /></group>
      <group ref={body} >
        <group position={[0, 0.25, 0]}>
          <mesh castShadow position={[0, 0.15, 0]} scale={[1, 1, 0.68]}><cylinderGeometry args={[0.118, 0.092, 0.3, 14]} /><meshStandardMaterial ref={coat} roughness={0.72} color={COAT.stable} /></mesh>
          <mesh position={[0, 0.305, 0]} scale={[1, 0.5, 0.68]} material={CLOTH}><sphereGeometry args={[0.118, 14, 8]} /></mesh>
          {/* shirt front, tie and pocket square */}
          <mesh position={[0, 0.2, 0.068]} rotation={[-0.06, 0, 0]} material={WHITE}><boxGeometry args={[0.058, 0.2, 0.012]} /></mesh>
          <mesh position={[0, 0.19, 0.076]} rotation={[-0.06, 0, 0]} material={LEATHER}><boxGeometry args={[0.02, 0.17, 0.008]} /></mesh>
          <mesh position={[0, 0.283, 0.075]} material={LEATHER}><boxGeometry args={[0.028, 0.024, 0.012]} /></mesh>
          <mesh position={[-0.066, 0.225, 0.066]} material={WHITE}><boxGeometry args={[0.03, 0.012, 0.008]} /></mesh>
          <group ref={armL} position={[-0.142, 0.285, 0]}><mesh castShadow geometry={ARM} material={CLOTH} /><mesh position={[0, -0.225, 0]} material={SKIN}><sphereGeometry args={[0.027, 10, 8]} /></mesh>
            <mesh position={[0, -0.195, 0]} material={STEEL}><cylinderGeometry args={[0.03, 0.03, 0.012, 10]} /></mesh></group>
          <group ref={armR} position={[0.142, 0.285, 0]}><mesh castShadow geometry={ARM} material={CLOTH} /><mesh position={[0, -0.225, 0]} material={SKIN}><sphereGeometry args={[0.027, 10, 8]} /></mesh>
            <mesh position={[0, -0.2, 0]} material={WHITE}><cylinderGeometry args={[0.03, 0.03, 0.01, 10]} /></mesh>
            {/* briefcase on the right hand */}
            <group position={[0.012, -0.335, 0.01]}>
              <mesh castShadow material={LEATHER}><boxGeometry args={[0.05, 0.135, 0.2]} /></mesh>
              <mesh position={[0, 0.078, 0]} rotation={[0, Math.PI / 2, 0]} material={LEATHER}><torusGeometry args={[0.03, 0.007, 6, 12, Math.PI]} /></mesh>
              <mesh position={[0.027, 0.03, 0]} material={STEEL}><boxGeometry args={[0.004, 0.02, 0.03]} /></mesh>
            </group>
            {cosmetics.includes('cane') && <mesh castShadow position={[0.02, -0.26, 0.06]}><cylinderGeometry args={[0.01, 0.01, 0.42, 4]} /><Flat color={C.trunk} /></mesh>}</group>
          {/* neck, head, swept-back silver hair, short beard, eyes */}
          <mesh position={[0, 0.325, 0]} material={SKIN}><cylinderGeometry args={[0.032, 0.036, 0.05, 10]} /></mesh>
          <mesh castShadow position={[0, 0.39, 0]} scale={[0.92, 1.06, 0.98]} material={SKIN}><sphereGeometry args={[0.082, 18, 14]} /></mesh>
          <mesh position={[0, 0.418, -0.016]} scale={[0.98, 0.78, 1.04]} material={SILVER}><sphereGeometry args={[0.084, 16, 12]} /></mesh>
          <mesh position={[0, 0.352, 0.03]} scale={[0.86, 0.6, 0.74]} material={SILVER}><sphereGeometry args={[0.07, 14, 10]} /></mesh>
          <mesh position={[-0.028, 0.398, 0.074]} material={LEATHER}><sphereGeometry args={[0.008, 8, 6]} /></mesh>
          <mesh position={[0.028, 0.398, 0.074]} material={LEATHER}><sphereGeometry args={[0.008, 8, 6]} /></mesh>
          <mesh position={[0, 0.384, 0.082]} material={SKIN}><sphereGeometry args={[0.012, 8, 6]} /></mesh>
          {/* cosmetics from the shop */}
          {cosmetics.includes('glasses') && <group position={[0, 0.398, 0.08]}>
            <mesh position={[-0.032, 0, 0]}><torusGeometry args={[0.022, 0.006, 4, 10]} /><meshBasicMaterial color="#2B2B28" /></mesh>
            <mesh position={[0.032, 0, 0]}><torusGeometry args={[0.022, 0.006, 4, 10]} /><meshBasicMaterial color="#2B2B28" /></mesh></group>}
          {cosmetics.includes('scarf') && <mesh position={[0, 0.315, 0]}><torusGeometry args={[0.075, 0.025, 5, 10]} /><Flat color="#C4673A" /></mesh>}
        </group>
      </group>
    </group>
  )
}
