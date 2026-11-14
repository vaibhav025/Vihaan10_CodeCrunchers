import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TOTAL_SEGMENTS } from './worldFromProfile'
import { ROAD, uOfSegment } from './layout'
import { useLive } from './sceneState'

const PER = 3 // tiles per segment
const N = TOTAL_SEGMENTS * PER
const TILE_LEN = ROAD.getLength() / N
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)

/** The Life Road: paved tiles up to the paved segment, a dashed survey line beyond. */
export default function Road() {
  const live = useLive()
  const tiles = useRef<THREE.InstancedMesh>(null!)
  const dashes = useRef<THREE.InstancedMesh>(null!)
  const sweep = useRef<THREE.Mesh>(null!)
  const shown = useRef(-1)
  // asphalt with kerb lines and a dashed centre marking, drawn once
  const asphalt = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64
    const x = c.getContext('2d')!
    x.fillStyle = '#26272b'; x.fillRect(0, 0, 64, 64)
    x.fillStyle = '#4a4c52'; x.fillRect(0, 0, 4, 64); x.fillRect(60, 0, 4, 64)
    x.fillStyle = '#d8d8dc'; x.fillRect(31, 14, 2, 36)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return t
  }, [])
  const frames = useMemo(() => Array.from({ length: N }, (_, i) => {
    const u = uOfSegment((i + 0.5) / PER), t = ROAD.getTangentAt(u)
    return { pos: ROAD.getPointAt(u), rot: new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(t.x, t.z)) }
  }), [])

  const write = (paved: number) => {
    frames.forEach((f, i) => {
      const k = Math.min(Math.max(paved * PER - i, 0), 1) // how laid this tile is
      p.copy(f.pos).setY(0.025)
      s.set(k > 0 ? 1 : 0, 1, k > 0 ? Math.max(k, 0.001) : 0)
      tiles.current.setMatrixAt(i, m4.compose(p, f.rot, s))
      const dash = i % 2 === 0 && k <= 0 ? 1 : 0
      p.setY(0.012); s.set(dash, 1, dash)
      dashes.current.setMatrixAt(i, m4.compose(p, f.rot, s))
    })
    tiles.current.instanceMatrix.needsUpdate = true
    dashes.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => { shown.current = live.current.world.pavedSegments; write(shown.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const target = live.current.world.pavedSegments
    const animating = Math.abs(target - shown.current) > 0.002
    sweep.current.visible = animating && target > shown.current
    if (!animating) return
    // paving runs at about one segment per 0.9 s, with a bright edge sweeping at the front
    shown.current += Math.sign(target - shown.current) * Math.min(Math.abs(target - shown.current), dt * 1.1)
    write(shown.current)
    const u = uOfSegment(shown.current), t = ROAD.getTangentAt(u)
    ROAD.getPointAt(u, sweep.current.position).setY(0.06)
    sweep.current.rotation.y = Math.atan2(t.x, t.z)
    live.current.busy.current = true
  })

  return (
    <>
      <instancedMesh ref={tiles} args={[undefined, undefined, N]} receiveShadow frustumCulled={false}>
        <boxGeometry args={[1.05, 0.05, TILE_LEN * 1.08]} />
        <meshStandardMaterial map={asphalt} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={dashes} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.06, 0.02, TILE_LEN * 0.8]} />
        <meshBasicMaterial color="#5b5d63" />
      </instancedMesh>
      <mesh ref={sweep} visible={false}>
        <boxGeometry args={[0.8, 0.07, 0.09]} />
        <meshBasicMaterial color="#FFF3DC" />
      </mesh>
    </>
  )
}
