import { useContext, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ClockCtx, Flat, Piece, Sweep } from '../build'
import { world as C } from '../../../design-tokens'

/** Signpost first, then the tent, then the fire ring, then the light. 3.1 s in all. */
export const buildSequence = {
  signpost: 0, tent: 0.45, flap: 0.95, stones: 1.3, logs: 1.95, fire: 2.3, sweep: 2.6,
  total: 3.1,
}
const S = buildSequence

const STONE = new THREE.DodecahedronGeometry(0.11, 0)

function Fire() {
  const flame = useRef<THREE.Mesh>(null!)
  const light = useRef<THREE.PointLight>(null!)
  const { clock } = useContext(ClockCtx)
  useFrame(state => {
    const t = state.clock.elapsedTime
    const on = t - clock.start - S.fire > 0
    const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06
    flame.current.scale.set(1, f, 1)
    light.current.intensity = on ? 2.4 * f : 0
  })
  return (
    <>
      <mesh ref={flame} position={[0, 0.22, 0]}><coneGeometry args={[0.13, 0.36, 5]} /><meshBasicMaterial color="#F0B67A" /></mesh>
      <mesh position={[0, 0.14, 0]}><coneGeometry args={[0.08, 0.2, 5]} /><meshBasicMaterial color="#FFF1D6" /></mesh>
      <pointLight ref={light} position={[0, 0.6, 0]} color="#FFC07A" distance={5} decay={2} />
    </>
  )
}

export default function Zone1Clearing() {
  return (
    <group>
      <Piece at={S.signpost} h={1.4} position={[2.1, 0, 1.6]} rotation={[0, -0.4, 0]}>
        <mesh castShadow position={[0, 0.6, 0]}><boxGeometry args={[0.08, 1.2, 0.08]} /><Flat color={C.trunk} /></mesh>
        <mesh castShadow position={[0.22, 1.02, 0]}><boxGeometry args={[0.6, 0.2, 0.04]} /><Flat color={C.wall} /></mesh>
        <mesh castShadow position={[-0.18, 0.78, 0]} rotation={[0, 0, 0.08]}><boxGeometry args={[0.5, 0.16, 0.04]} /><Flat color={C.stone} /></mesh>
      </Piece>
      <Piece at={S.tent} h={1.2} dust={1.6} position={[-0.6, 0, -0.4]} rotation={[0, 0.5, 0]}>
        <mesh castShadow position={[0, 0.5, 0]} rotation={[0, 0, 0]}><coneGeometry args={[0.95, 1.0, 4]} /><Flat color={C.wall} /></mesh>
      </Piece>
      <Piece at={S.flap} h={0.5} dust={0} position={[-0.6, 0, -0.4]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.3, 0.52]} rotation={[0.42, 0, 0]}><planeGeometry args={[0.42, 0.6]} /><Flat color={C.roof} side={THREE.DoubleSide} /></mesh>
      </Piece>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <Piece key={i} at={S.stones + i * 0.06} h={0.3} dust={0.3} position={[1.1 + Math.cos(a) * 0.32, 0, 0.5 + Math.sin(a) * 0.32]}>
            <mesh castShadow geometry={STONE} position={[0, 0.07, 0]}><Flat color="#B9B5A5" /></mesh>
          </Piece>
        )
      })}
      <Piece at={S.logs} h={0.4} dust={0.5} position={[1.1, 0, 0.5]}>
        <mesh castShadow position={[0, 0.06, 0]} rotation={[0, 0.6, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.45, 5]} /><Flat color={C.trunk} /></mesh>
        <mesh castShadow position={[0, 0.06, 0]} rotation={[0, -0.6, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.45, 5]} /><Flat color={C.trunk} /></mesh>
      </Piece>
      <Piece at={S.fire} h={0.3} dust={0} position={[1.1, 0, 0.5]}><Fire /></Piece>
      <Sweep at={S.sweep} />
    </group>
  )
}
