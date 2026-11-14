import { useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ClockCtx, Flat, Piece, Sweep } from '../build'
import { world as C } from '../../../design-tokens'

/** Walls, then roof, then props, then light. 3.7 s in all. */
export const buildSequence = {
  walls: 0, roof: 0.7, chimney: 1.05, door: 1.3, well: 1.6, fence: 2.0, lanterns: 2.75, light: 3.1, sweep: 3.2,
  total: 3.7,
}
const S = buildSequence
const FENCE = 11

function WindowGlow() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E8D9B8', emissive: '#F0B67A', emissiveIntensity: 0 }), [])
  const { clock } = useContext(ClockCtx)
  useFrame(state => {
    const t = state.clock.elapsedTime, d = t - clock.start - S.light
    // switches on, then flickers softly
    mat.emissiveIntensity = d > 0 ? Math.min(d / 0.4, 1) * (1.4 + Math.sin(t * 3.1) * 0.08) : 0
  })
  return (
    <>
      <mesh position={[-0.42, 0.62, 0.66]} material={mat}><boxGeometry args={[0.32, 0.3, 0.04]} /></mesh>
      <mesh position={[0.86, 0.62, 0]} material={mat}><boxGeometry args={[0.04, 0.3, 0.42]} /></mesh>
    </>
  )
}

function FenceRun() {
  const posts = useRef<(THREE.Group | null)[]>([])
  return (
    <>
      {Array.from({ length: FENCE }, (_, i) => (
        <Piece key={i} at={S.fence + i * 0.06} h={0.5} dust={0.25} position={[-1.6 + i * 0.32, 0, 1.55]}>
          <group ref={g => { posts.current[i] = g }}>
            <mesh castShadow position={[0, 0.22, 0]}><boxGeometry args={[0.06, 0.44, 0.06]} /><Flat color={C.trunk} /></mesh>
            {i < FENCE - 1 && <mesh position={[0.16, 0.3, 0]}><boxGeometry args={[0.32, 0.04, 0.03]} /><Flat color="#9C7B5E" /></mesh>}
          </group>
        </Piece>
      ))}
    </>
  )
}

export default function Zone2FirstRoof() {
  return (
    <group>
      <group position={[0, 0, -0.3]}>
        <Piece at={S.walls} h={1.1} dust={2}>
          <mesh castShadow receiveShadow position={[0, 0.5, 0]}><boxGeometry args={[1.7, 1.0, 1.3]} /><Flat color={C.wall} /></mesh>
        </Piece>
        <Piece at={S.roof} h={0.8} dust={0}>
          <mesh castShadow position={[0, 1.25, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 1]}>
            <cylinderGeometry args={[0.88, 0.88, 1.9, 3, 1, false, Math.PI / 2]} /><Flat color={C.roof} />
          </mesh>
        </Piece>
        <Piece at={S.chimney} h={0.5} dust={0} position={[-0.45, 0, -0.2]}>
          <mesh castShadow position={[0, 1.45, 0]}><boxGeometry args={[0.2, 0.5, 0.2]} /><Flat color={C.stone} /></mesh>
        </Piece>
        <Piece at={S.door} h={0.3} dust={0}>
          <mesh position={[0.3, 0.26, 0.66]}><boxGeometry args={[0.3, 0.52, 0.04]} /><Flat color="#3F5B3A" /></mesh>
          <WindowGlow />
        </Piece>
      </group>
      <Piece at={S.well} h={0.7} dust={0.9} position={[1.9, 0, 0.6]}>
        <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.32, 0.34, 0.4, 8]} /><Flat color={C.stone} /></mesh>
        <mesh position={[0, 0.41, 0]}><cylinderGeometry args={[0.24, 0.24, 0.02, 8]} /><Flat color="#7FA3A6" /></mesh>
        <mesh castShadow position={[-0.28, 0.6, 0]}><boxGeometry args={[0.05, 0.5, 0.05]} /><Flat color={C.trunk} /></mesh>
        <mesh castShadow position={[0.28, 0.6, 0]}><boxGeometry args={[0.05, 0.5, 0.05]} /><Flat color={C.trunk} /></mesh>
        <mesh castShadow position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.3, 0.7, 4, 1]} /><Flat color={C.roof} /></mesh>
      </Piece>
      <FenceRun />
      {[[-2.3, 1.9], [2.6, 1.9]].map(([x, z], i) => (
        <Piece key={i} at={S.lanterns + i * 0.08} h={0.8} dust={0.4} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.3, 0]}><cylinderGeometry args={[0.025, 0.03, 0.6, 5]} /><Flat color="#4F5A4C" /></mesh>
          <mesh position={[0, 0.66, 0]}><boxGeometry args={[0.13, 0.15, 0.13]} /><meshBasicMaterial color="#F0B67A" /></mesh>
        </Piece>
      ))}
      <Sweep at={S.sweep} r={4.5} />
    </group>
  )
}
