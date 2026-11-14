import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { TOTAL_SEGMENTS } from './worldFromProfile'
import { roadPoint, zoneCenter } from './layout'
import { useLive } from './sceneState'

const OFFSET = new THREE.Vector3(14, 13, 14)
const goal = new THREE.Vector3(), focus = new THREE.Vector3(), off = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0)

/**
 * Isometric orthographic camera that travels: eases along the road after the character,
 * flies to a zone while it builds, and lets the player look along the road by dragging.
 * Never linear; never blocks input.
 */
export default function CameraRig({ onSkip, onLookAway }: { onSkip: () => void; onLookAway: (away: boolean) => void }) {
  const live = useLive()
  const { camera, size, gl } = useThree()
  const cur = useRef<THREE.Vector3 | null>(null)
  const zoom = useRef(1)
  const away = useRef(false)

  // one-finger drag looks along the road; pinch zooms a little; double-tap recentres; any tap skips a cinematic
  useEffect(() => {
    const el = gl.domElement
    const pts = new Map<number, { x: number; y: number }>()
    let pinch0 = 0, zoom0 = 1, lastTap = 0
    let orbiting: { x: number; y: number } | null = null
    const reset = () => { const L = live.current; L.orbitTo = 0; L.pitchTo = 0; L.zoomMul = 1; L.focus = null; L.lookTo = 0; L.busy.current = true }
    el.style.touchAction = 'pan-y'
    const down = (e: PointerEvent) => {
      if (live.current.mode === 'landing') { orbiting = { x: e.clientX, y: e.clientY }; return } // scroll drives the camera there; a drag orbits
      if (live.current.cine.active) { onSkip(); return }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = live.current.zoomMul }
      const now = performance.now()
      if (now - lastTap < 300) live.current.lookTo = 0
      lastTap = now
    }
    const move = (e: PointerEvent) => {
      if (orbiting) {
        const L = live.current
        L.orbitTo = THREE.MathUtils.clamp(L.orbitTo - (e.clientX - orbiting.x) * 0.004, -0.44, 0.44)
        L.pitchTo = THREE.MathUtils.clamp(L.pitchTo + (e.clientY - orbiting.y) * 0.02, -1.5, 3)
        orbiting = { x: e.clientX, y: e.clientY }; L.busy.current = true
        return
      }
      const prev = pts.get(e.pointerId)
      if (!prev) return
      if (pts.size === 2) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [a, b] = [...pts.values()]
        live.current.zoomMul = THREE.MathUtils.clamp(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0, 0.85, 1.3)
        return
      }
      const L = live.current
      // dragging left moves further along the road
      L.lookTo = THREE.MathUtils.clamp(L.lookTo - (e.clientX - prev.x) * 0.02, -L.charS, TOTAL_SEGMENTS - L.charS)
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); orbiting = null }
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // trackpad pinch only; plain scrolling stays with the page
      e.preventDefault()
      live.current.zoomMul = THREE.MathUtils.clamp(live.current.zoomMul * (1 - e.deltaY * 0.01), 0.85, 1.3)
    }
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('dblclick', reset)
    return () => {
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel); el.removeEventListener('dblclick', reset)
    }
  }, [gl, live, onSkip])

  useFrame((state, dt) => {
    const L = live.current, t = state.clock.elapsedTime, d = Math.min(dt, 0.05)
    L.look += (L.lookTo - L.look) * Math.min(d * 6, 1)
    const isAway = Math.abs(L.lookTo) > 0.5
    if (isAway !== away.current) { away.current = isAway; onLookAway(isAway) }

    L.orbit += (L.orbitTo - L.orbit) * Math.min(d * 7, 1); L.pitch += (L.pitchTo - L.pitch) * Math.min(d * 7, 1)
    if (Math.abs(L.orbitTo - L.orbit) + Math.abs(L.pitchTo - L.pitch) > 0.001) L.busy.current = true
    if (L.cine.active) goal.copy(L.cine.target)
    else if (L.focus) goal.copy(L.focus)
    else if (L.mode === 'landing') {
      // glide from one zone's centre to the next, so each zone sits mid-frame
      const z = Math.min(L.scrollS / 5, 5.999), k = Math.floor(z)
      goal.lerpVectors(zoneCenter(k), zoneCenter(k + 1), z - k)
      goal.y = Math.max(0, z - 5) * 1.1 // aim up toward the lighthouse at the end
    }
    else roadPoint(L.charS + L.look, 0, goal)
    if (!cur.current) cur.current = goal.clone()
    // critically damped follow: quick to start, soft to settle
    const k = 1 - Math.exp(-d * (L.cine.active ? 2.2 : L.focus ? 4.2 : 3.2))
    cur.current.lerp(goal, k)
    if (cur.current.distanceToSquared(goal) > 0.0004) L.busy.current = true

    // a gentle sideways nudge after a wrong answer
    const n = t - L.nudgeAt
    focus.copy(cur.current)
    if (n > 0 && n < 0.5) { focus.x += Math.sin(n * 40) * 0.08 * (1 - n / 0.5); L.busy.current = true }
    off.copy(OFFSET).applyAxisAngle(UP, L.orbit); off.y += L.pitch
    camera.position.copy(focus).add(off)
    camera.lookAt(focus)

    const want = (L.cine.active ? 0.78 : L.mode === 'quest' ? 1.45 : L.mode === 'landing' ? 1.35 : 1) * L.zoomMul * (L.focus && !L.cine.active ? 1.22 : 1)
    zoom.current += (want - zoom.current) * Math.min(d * 2.5, 1)
    if (Math.abs(want - zoom.current) > 0.002) L.busy.current = true
    camera.zoom = (Math.min(size.width / 22, size.height / 14)) * zoom.current
    camera.updateProjectionMatrix()
  })
  return null
}
