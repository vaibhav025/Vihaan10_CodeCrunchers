import { makeZone, row, type Part } from './zoneKit'
import { world as C } from '../../../design-tokens'
// larger house, lit window, cart, market stall. 3.5 s
export const buildSequence = { walls: 0, roof: 0.7, window: 1.2, cart: 1.6, stall: 2.0, crates: 2.5, sweep: 3.0, total: 3.5 }
const S = buildSequence
const parts: Part[] = [
  { at: S.walls, h: 1.6, dust: 2, p: [0, -0.4], m: [['box', [2.2, 1.4, 1.6], C.wall, [0, 0.7, 0]], ['box', [1.0, 0.9, 1.0], C.wall, [1.5, 0.45, 0.2]]] },
  { at: S.roof, h: 0.8, dust: 0, p: [0, -0.4], m: [['cone', [1.6, 0.8, 4], C.roof, [0, 1.8, 0], [0, Math.PI / 4, 0]], ['box', [1.1, 0.1, 1.1], C.roof, [1.5, 0.95, 0.2]]] },
  { at: S.window, h: 0.2, dust: 0, glow: S.window + 0.2, p: [0, -0.4], m: [['box', [0.4, 0.4, 0.04], '#E8D9B8', [-0.5, 0.8, 0.81], undefined, true], ['box', [0.4, 0.4, 0.04], '#E8D9B8', [0.4, 0.8, 0.81], undefined, true], ['box', [0.34, 0.6, 0.04], '#3F5B3A', [-0.02, 0.3, 0.81]]] },
  { at: S.cart, h: 0.5, dust: 0.6, p: [-2.6, 1.6], r: 0.6, m: [['box', [0.7, 0.3, 0.45], '#9C7B5E', [0, 0.3, 0]], ['cyl', [0.14, 0.14, 0.05, 8], C.trunk, [-0.22, 0.14, 0.25], [Math.PI / 2, 0, 0]], ['cyl', [0.14, 0.14, 0.05, 8], C.trunk, [0.22, 0.14, 0.25], [Math.PI / 2, 0, 0]]] },
  { at: S.stall, h: 0.9, dust: 0.9, p: [2.4, 1.5], m: [['box', [1.1, 0.5, 0.6], '#C9A97E', [0, 0.25, 0]], ['box', [1.3, 0.05, 0.8], C.autumn, [0, 1.05, 0], [0.18, 0, 0]], ['cyl', [0.03, 0.03, 1.0, 4], C.trunk, [-0.55, 0.5, -0.3]], ['cyl', [0.03, 0.03, 1.0, 4], C.trunk, [0.55, 0.5, -0.3]]] },
  ...row(3, S.crates, 0.07, i => ({ h: 0.3, dust: 0.3, p: [1.5 + i * 0.3, 2.1] as [number, number], m: [['box', [0.24, 0.24, 0.24], '#B08B62', [0, 0.12, 0]]] as Part['m'] })),
]
export default makeZone(parts, S.sweep)
