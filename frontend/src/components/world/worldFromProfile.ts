import type { FutureState } from '../../design-tokens'
import { LEVEL_THRESHOLDS, LEVEL_TITLES } from '../../lib/game'

/** The seven zones of the Life Road, one per level. */
export const ZONES = [
  { key: 'clearing', name: 'The Clearing' },
  { key: 'firstRoof', name: 'First Roof' },
  { key: 'greenSeason', name: 'Green Season' },
  { key: 'settled', name: 'Settled' },
  { key: 'community', name: 'Community' },
  { key: 'horizons', name: 'Horizons' },
  { key: 'summit', name: 'The Summit' },
].map((z, i) => ({ ...z, level: i + 1, xp: LEVEL_THRESHOLDS[i], title: LEVEL_TITLES[i] }))

/** Road segments between two zones. Each answered quest paves one. */
export const SEG_PER_ZONE = 5
export const TOTAL_SEGMENTS = (ZONES.length - 1) * SEG_PER_ZONE
export const MAX_LANTERNS = 30

export interface Profile {
  xp: number
  questsCompleted: number
  streakDays: number
  contributionCount: number
  futureYouState: FutureState
  badgesUnlocked: number
}

export type ZoneStatus = 'built' | 'partial' | 'ghost'

export interface WorldState extends Profile {
  level: number
  /** 0..1 progress through the current level. */
  xpInLevel: number
  zones: ZoneStatus[]
  /** For the partial zone: how far its foundations are laid (= xpInLevel). */
  partial: number
  pavedSegments: number
  /** Character position along the road, in segments (0..TOTAL_SEGMENTS). */
  progress: number
  lanternsLit: number
  trinkets: number
}

/** The single mapping from game data to what the world shows. The scene holds no game logic. */
export function worldFromProfile(p: Profile): WorldState {
  let level = 1
  LEVEL_THRESHOLDS.forEach((t, i) => { if (p.xp >= t) level = i + 1 })
  const floor = LEVEL_THRESHOLDS[level - 1], next = LEVEL_THRESHOLDS[level]
  const xpInLevel = next === undefined ? 1 : (p.xp - floor) / (next - floor)
  const reached = (level - 1) * SEG_PER_ZONE
  const progress = Math.min(reached + (level < ZONES.length ? xpInLevel * SEG_PER_ZONE : 0), TOTAL_SEGMENTS)
  // roads to built zones are always paved; quests pave ahead toward the next landmark
  const pavedSegments = Math.min(Math.max(reached, p.questsCompleted, Math.ceil(progress)), TOTAL_SEGMENTS)
  return {
    ...p, level, xpInLevel,
    zones: ZONES.map((_, i) => (i < level ? 'built' : i === level ? 'partial' : 'ghost')),
    partial: level < ZONES.length ? xpInLevel : 0,
    pavedSegments, progress,
    lanternsLit: Math.min(p.streakDays, MAX_LANTERNS),
    trinkets: p.badgesUnlocked,
  }
}
