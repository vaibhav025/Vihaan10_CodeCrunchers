import { makeZone, row, type Part } from './zoneKit'
import { world as C } from '../../../design-tokens'
// school, clinic, solar panels, family. 3.6 s
export const buildSequence = { school: 0, schoolRoof: 0.6, clinic: 0.9, clinicMark: 1.3, solar: 1.8, family: 2.4, sweep: 3.2, total: 3.6 }
const S = buildSequence
const fig = (c: string, s: number): Part['m'] => [['box', [0.15 * s, 0.26 * s, 0.1 * s], c, [0, 0.25 * s, 0]], ['ico', [0.07 * s, 1], C.skin, [0, 0.46 * s, 0]], ['box', [0.12 * s, 0.14 * s, 0.08 * s], '#5A5148', [0, 0.07 * s, 0]]]
const parts: Part[] = [
  { at: S.school, h: 1.4, dust: 2, p: [-1.3, -0.6], m: [['box', [1.9, 1.2, 1.2], '#E9DCC1', [0, 0.6, 0]]] },
  { at: S.schoolRoof, h: 0.6, dust: 0, p: [-1.3, -0.6], m: [['box', [2.1, 0.12, 1.4], C.roof, [0, 1.26, 0]], ['box', [0.1, 0.5, 0.1], '#4F5A4C', [0.7, 1.55, 0]], ['box', [0.35, 0.22, 0.02], C.autumn, [0.88, 1.7, 0]]] },
  { at: S.clinic, h: 1.2, dust: 1.6, p: [1.4, -0.4], m: [['box', [1.5, 1.0, 1.1], '#F4F1E8', [0, 0.5, 0]], ['box', [1.6, 0.1, 1.2], '#C9C3B3', [0, 1.05, 0]]] },
  { at: S.clinicMark, h: 0.2, dust: 0, glow: S.clinicMark + 0.2, p: [1.4, -0.4], m: [['box', [0.36, 0.1, 0.03], '#C4673A', [0, 0.7, 0.56], undefined, true], ['box', [0.1, 0.36, 0.03], '#C4673A', [0, 0.7, 0.56], undefined, true]] },
  ...row(4, S.solar, 0.08, i => ({ h: 0.4, dust: 0.3, p: [0.9 + (i % 2) * 0.55, 1.3 + Math.floor(i / 2) * 0.5] as [number, number], m: [['box', [0.48, 0.03, 0.34], '#2F4256', [0, 0.32, 0], [-0.5, 0, 0]], ['cyl', [0.02, 0.02, 0.3, 4], '#4F5A4C', [0, 0.15, 0]]] as Part['m'] })),
  ...row(3, S.family, 0.08, i => ({ h: 0.5, dust: 0.3, p: [-1.6 + i * 0.32, 1.4] as [number, number], m: fig(['#4C6A58', '#B4734A', '#7C8EA6'][i], i === 2 ? 0.7 : 1) })),
]
export default makeZone(parts, S.sweep)
