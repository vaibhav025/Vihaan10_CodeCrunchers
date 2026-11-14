import { makeZone, row, type Part } from './zoneKit'
import { world as C } from '../../../design-tokens'
// stream, bridge, trees, garden. 3.4 s
export const buildSequence = { stream: 0, bridge: 0.5, trees: 1.0, garden: 2.0, flowers: 2.4, sweep: 3.0, total: 3.4 }
const S = buildSequence
const parts: Part[] = [
  { at: S.stream, h: 0.1, dust: 0, p: [1.2, 0.4], m: [['box', [0.7, 0.04, 4.2], '#9DC3C6', [0, 0.02, 0]]] },
  { at: S.bridge, h: 0.5, p: [1.2, 0.4], m: [['box', [1.1, 0.08, 0.6], '#9C7B5E', [0, 0.16, 0]], ['box', [0.06, 0.25, 0.6], '#7A5C44', [-0.5, 0.2, 0]], ['box', [0.06, 0.25, 0.6], '#7A5C44', [0.5, 0.2, 0]]] },
  ...row(6, S.trees, 0.08, i => ({ h: 1.2, dust: 0.5, p: [-2.4 + (i % 3) * 0.9, -1.4 + Math.floor(i / 3) * 1.1] as [number, number],
    m: [['cyl', [0.06, 0.09, 0.44, 5], C.trunk, [0, 0.22, 0]], i % 2 ? ['cone', [0.42, 0.9, 6], C.pine, [0, 0.8, 0]] : ['ico', [0.42, 0], i === 2 ? C.autumn : C.round, [0, 0.75, 0]]] as Part['m'] })),
  { at: S.garden, h: 0.3, dust: 1, p: [-0.6, 1.6], m: [['box', [1.6, 0.14, 0.7], '#7A6248', [0, 0.07, 0]]] },
  ...row(5, S.flowers, 0.06, i => ({ h: 0.2, dust: 0, p: [-1.2 + i * 0.3, 1.6] as [number, number], m: [['ico', [0.09, 0], i % 2 ? C.lantern : '#F3EAD6', [0, 0.22, 0]]] as Part['m'] })),
]
export default makeZone(parts, S.sweep)
