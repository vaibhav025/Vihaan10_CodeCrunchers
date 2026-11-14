import { makeZone, row, type Part } from './zoneKit'
import { world as C } from '../../../design-tokens'
// a path up a low hill, a lighthouse, its beacon, then lights rising around it. 3.4 s
export const buildSequence = { path: 0, hill: 0.3, tower: 0.8, top: 1.3, beacon: 1.8, lights: 2.3, sweep: 3.0, total: 3.4 }
const S = buildSequence
const parts: Part[] = [
  // stepping stones from the road to the hill
  ...row(4, S.path, 0.06, i => ({ h: 0.1, dust: 0.25, p: [-2.4 + i * 0.5, 1.6 - i * 0.35] as [number, number], m: [['box', [0.34, 0.05, 0.28], '#DDD6C0', [0, 0.03, 0]]] as Part['m'] })),
  // a low terraced hill, not a giant cone
  { at: S.hill, h: 0.5, dust: 1.6, p: [0, -0.3], m: [['cyl', [1.5, 1.75, 0.35, 10], '#A9BB85', [0, 0.17, 0]], ['cyl', [1.0, 1.3, 0.3, 10], '#B7C795', [0, 0.47, 0]]] },
  { at: S.tower, h: 1.8, dust: 0.6, p: [0, -0.3], m: [['cyl', [0.26, 0.36, 1.6, 8], C.wall, [0, 1.42, 0]], ['cyl', [0.27, 0.32, 0.24, 8], C.roof, [0, 1.05, 0]], ['cyl', [0.25, 0.28, 0.22, 8], C.roof, [0, 1.75, 0]]] },
  { at: S.top, h: 0.5, dust: 0, p: [0, -0.3], m: [['cyl', [0.36, 0.36, 0.06, 8], '#4F5A4C', [0, 2.25, 0]], ['cone', [0.3, 0.34, 8], '#3F5B3A', [0, 2.7, 0]]] },
  { at: S.beacon, h: 0.2, dust: 0, glow: S.beacon, p: [0, -0.3], m: [['cyl', [0.22, 0.22, 0.26, 8], '#FFE7B8', [0, 2.41, 0], undefined, true]] },
  ...row(6, S.lights, 0.07, i => ({ h: 0.3, dust: 0, glow: S.lights + i * 0.07, p: [Math.cos(i * 1.05) * 1.25, Math.sin(i * 1.05) * 0.9 - 0.3] as [number, number], m: [['oct', [0.06, 0], C.lantern, [0, 1.0 + (i % 3) * 0.3, 0], undefined, true]] as Part['m'] })),
]
export default makeZone(parts, S.sweep, 4.2)
