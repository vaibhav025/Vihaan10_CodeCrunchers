import { useContext, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ClockCtx, Flat, Piece, Sweep } from '../build'

/** A mesh: [shape, args, colour, position, rotation?, glow?] */
export type M = ['box' | 'cyl' | 'cone' | 'ico' | 'oct', number[], string, [number, number, number], [number, number, number]?, boolean?]
/** A piece rises at `at` seconds: walls first, then roofs, then props, then light. */
export interface Part { at: number; h?: number; dust?: number; p: [number, number]; r?: number; m: M[]; bob?: boolean; glow?: number }

const GEO = { box: THREE.BoxGeometry, cyl: THREE.CylinderGeometry, cone: THREE.ConeGeometry, ico: THREE.IcosahedronGeometry, oct: THREE.OctahedronGeometry }

function Mesh({ m: [shape, args, color, pos, rot, glow], glowAt }: { m: M; glowAt: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const { clock } = useContext(ClockCtx)
  const geo = useRef(new (GEO[shape] as unknown as new (...a: number[]) => THREE.BufferGeometry)(...args)).current
  useFrame(s => {
    if (!glow || !mat.current) return
    const d = s.clock.elapsedTime - clock.start - glowAt
    mat.current.emissiveIntensity = d > 0 ? Math.min(d / 0.4, 1) * (1.3 + Math.sin(s.clock.elapsedTime * 3) * 0.08) : 0
  })
  return (
    <mesh castShadow receiveShadow geometry={geo} position={pos} rotation={rot}>
      {glow ? <meshStandardMaterial ref={mat} color={color} emissive="#F0B67A" flatShading /> : <Flat color={color} />}
    </mesh>
  )
}

function Bob({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(s => { g.current.position.y = Math.sin(s.clock.elapsedTime * 1.4) * 0.03; g.current.rotation.z = Math.sin(s.clock.elapsedTime) * 0.04 })
  return <group ref={g}>{children}</group>
}

export function makeZone(parts: Part[], sweepAt: number, r = 4.5) {
  return function Zone() {
    return (
      <group>
        {parts.map((pt, i) => {
          const body = pt.m.map((m, j) => <Mesh key={j} m={m} glowAt={pt.glow ?? pt.at + 0.5} />)
          return (
            <Piece key={i} at={pt.at} h={pt.h ?? 1} dust={pt.dust ?? 0.8} position={[pt.p[0], 0, pt.p[1]]} rotation={[0, pt.r ?? 0, 0]}>
              {pt.bob ? <Bob>{body}</Bob> : body}
            </Piece>
          )
        })}
        <Sweep at={sweepAt} r={r} />
      </group>
    )
  }
}
/** n copies of a part, staggered 40-80 ms apart. */
export const row = (n: number, at: number, step: number, f: (i: number) => Omit<Part, 'at'>) => Array.from({ length: n }, (_, i) => ({ ...f(i), at: at + i * step }))
