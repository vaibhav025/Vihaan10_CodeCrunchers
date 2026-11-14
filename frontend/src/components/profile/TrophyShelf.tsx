import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** A small shelf of 3D medals: earned ones in metal, locked ones as outlines. Lazy-loaded with three. */
export default function TrophyShelf({ earned, total }: { earned: boolean[]; total: number }) {
  return (
    <div className="h-[190px] w-full" aria-hidden>
      <Canvas orthographic dpr={[1, 1.5]} frameloop="always" camera={{ position: [0, 1.2, 10], zoom: 52 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
        <hemisphereLight args={['#FFF7E6', '#8E7054', 1.6]} />
        <directionalLight position={[3, 5, 6]} intensity={2.2} color="#FFE3BC" />
        {[0.95, -0.85].map((y, r) => (
          <mesh key={r} position={[0, y - 0.62, -0.2]}><boxGeometry args={[9.6, 0.14, 0.8]} /><meshStandardMaterial color="#9C7B5E" flatShading /></mesh>
        ))}
        {Array.from({ length: total }, (_, i) => <Medal key={i} i={i} got={earned[i]} />)}
      </Canvas>
    </div>
  )
}

function Medal({ i, got }: { i: number; got: boolean }) {
  const g = useRef<THREE.Group>(null!)
  const row = i < 8 ? 0 : 1, col = row ? i - 8 : i
  const x = (col - (row ? 3 : 3.5)) * 1.12, y = row ? -0.85 : 0.95
  const mat = useMemo(() => got
    ? new THREE.MeshStandardMaterial({ color: '#D9A441', metalness: 0.75, roughness: 0.3, emissive: '#5A3E10', emissiveIntensity: 0.25 })
    : new THREE.MeshBasicMaterial({ color: '#8B8F88', wireframe: true, transparent: true, opacity: 0.55 }), [got])
  // earned medals turn slowly to catch the light; locked ones stay still
  useFrame(s => { if (got) g.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.6 + i) * 0.5 })
  return (
    <group ref={g} position={[x, y, 0]}>
      <mesh material={mat} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.08, got ? 24 : 12]} /></mesh>
      {got && <mesh position={[0, 0, 0.05]}><torusGeometry args={[0.28, 0.025, 6, 24]} /><meshStandardMaterial color="#F6DDA0" metalness={0.6} roughness={0.3} /></mesh>}
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.12, 0.22, 0.02]} /><meshStandardMaterial color={got ? '#3F5B3A' : '#C9C3B3'} /></mesh>
    </group>
  )
}
