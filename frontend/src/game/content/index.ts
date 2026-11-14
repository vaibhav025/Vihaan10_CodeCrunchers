import world1 from './worlds/world1.json'
import type { L, WorldDef } from '../types'

/** Worlds in order. Worlds 2 and 3 are named and locked until their stages are written; up to 7 fit. */
const load = (w: unknown) => { const d = w as WorldDef; return { ...d, stages: d.stages.map(s => ({ ...s, type: s.engine })) } }
export const WORLDS: WorldDef[] = [load(world1)]
export const lessonOf = (s: { world: number; insightKey: string; deepDiveKey: string }) => { const w = WORLDS.find(x => x.id === s.world)!; return { insight: w.lessons[s.insightKey]?.insight, deep: w.lessons[s.deepDiveKey] } }
export const COMING: { id: number; name: L }[] = [
  { id: 2, name: { en: 'Safety Nets', hi: 'सुरक्षा जाल', mr: 'सुरक्षा जाळे' } },
  { id: 3, name: { en: 'Growth Engines', hi: 'बढ़त के इंजन', mr: 'वाढीची इंजिने' } },
]
export const stageById = (id: string) => WORLDS.flatMap(w => w.stages).find(s => s.id === id)
