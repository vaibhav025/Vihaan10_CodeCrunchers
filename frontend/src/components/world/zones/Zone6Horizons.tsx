import { makeZone, row, type Part } from './zoneKit'
import { world as C } from '../../../design-tokens'
// farmland, a short rail line with a station and train, a lake with a boat. 3.4 s
export const buildSequence = { fields: 0, rails: 0.8, station: 1.1, train: 1.5, lake: 1.9, boat: 2.3, sweep: 3.0, total: 3.4 }
const S = buildSequence
// everything stays within x -3..2.4, z -2.4..2.4 so nothing meets the road or the edge trees
const parts: Part[] = [
  // fields in the back left, gaps between rows
  ...row(4, S.fields, 0.08, i => ({ h: 0.12, dust: 0.4, p: [-2.6 + i * 0.62, -1.5] as [number, number], m: [['box', [0.5, 0.1, 1.7], i % 2 ? '#A9BB78' : '#C9B26A', [0, 0.05, 0]]] as Part['m'] })),
  // rails run front to back on the right
  { at: S.rails, h: 0.1, dust: 0.3, p: [1.9, 0.1], m: [['box', [0.06, 0.04, 4.4], '#6B655C', [-0.2, 0.03, 0]], ['box', [0.06, 0.04, 4.4], '#6B655C', [0.2, 0.03, 0]], ...[-1.8, -0.9, 0, 0.9, 1.8].map(z => ['box', [0.62, 0.03, 0.1], '#8A6E54', [0, 0.015, z]] as Part['m'][number])] },
  // station platform and building to the left of the rails
  { at: S.station, h: 0.9, dust: 1.2, p: [1.0, -0.5], m: [['box', [0.7, 0.16, 1.9], '#C9C3B3', [0, 0.08, 0]], ['box', [0.6, 0.62, 0.9], '#E9DCC1', [-0.02, 0.47, -0.2]], ['box', [0.78, 0.07, 1.1], '#3F5B3A', [-0.02, 0.82, -0.2]], ['box', [0.04, 0.22, 0.26], '#E8D9B8', [0.29, 0.5, -0.2]]] },
  // train on the rails, beside the platform
  ...row(3, S.train, 0.08, i => ({ h: 0.5, dust: 0.25, p: [1.9, -1.4 + i * 0.68] as [number, number], m: [['box', [0.36, 0.34, 0.6], i === 0 ? '#3F5B3A' : '#C4673A', [0, 0.25, 0]], ['box', [0.38, 0.05, 0.62], '#2F3B33', [0, 0.44, 0]]] as Part['m'] })),
  // a round lake in front, with a boat
  { at: S.lake, h: 0.06, dust: 0, p: [-1.4, 1.35], m: [['cyl', [0.95, 0.95, 0.03, 20], '#A8C9CB', [0, 0.02, 0]], ['cyl', [1.02, 1.02, 0.02, 20], '#D9CFAE', [0, 0.008, 0]]] },
  { at: S.boat, h: 0.25, dust: 0, bob: true, p: [-1.3, 1.3], m: [['box', [0.42, 0.1, 0.18], '#9C7B5E', [0, 0.07, 0]], ['cone', [0.13, 0.34, 3], C.wall, [0.02, 0.3, 0]]] },
]
export default makeZone(parts, S.sweep, 4.2)
