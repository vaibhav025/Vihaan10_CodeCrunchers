/**
 * Every tunable number in the world-map game: rewards, star rules, XP and drop tables.
 * Change values here; no other code needs to change. Rewards are earned only, never random or paid.
 */
export const REWARDS = {
  /** Coins for clearing a stage, by stars earned. Coins collected inside a stage are added on top. */
  clear: { 1: 5, 2: 10, 3: 20 } as Record<number, number>,
  /** Bonus coins for a perfect (3-star) clear. */
  perfectBonus: 10,
  /** Question blocks hit mid-stage. */
  questionBlock: 5,
  /** XP by stars; first clears only. */
  xp: { 1: 10, 2: 15, 3: 25 } as Record<number, number>,
  /** A collectible you already own turns into this many coins. */
  duplicateCoins: 60,
}

/** Star rules shared by the action engines: hits taken, or a 0-100 score. */
export const starsFromHits = (hits: number): 1 | 2 | 3 => (hits === 0 ? 3 : hits <= 2 ? 2 : 1)
export const starsFromScore = (score: number): 1 | 2 | 3 => (score >= 70 ? 3 : score >= 45 ? 2 : 1)

/** A collectible is a roster item, written slot:id (see game/character/roster.ts). */
export interface Loot { xp: number; coins: number; restTokens: number; shield: number; double: number; collectible?: string }
/** Fixed contents, shown before the box is opened. */
export const CHEST: Loot = { xp: 30, coins: 40, restTokens: 0, shield: 1, double: 0, collectible: 'outfit:track' }
export const MEGA_BOX: Loot = { xp: 100, coins: 150, restTokens: 1, shield: 1, double: 1, collectible: 'sidekick:dadi' }

/** Assist and the Skip option appear after this many failures in a stage. */
export const ASSIST_AFTER = 3

export interface Achievement { id: string; test: (c: AchContext) => boolean }
export interface AchContext { stageId: string; type: string; stars: number; coins: number; cleared: Record<string, number>; worldStages: string[] }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstSteps', test: c => Object.keys(c.cleared).length >= 1 },
  { id: 'cleanRun', test: c => c.type === 'runner' && c.stars === 3 },
  { id: 'coinHoarder', test: c => c.coins >= 60 },
  { id: 'snowballer', test: c => c.type === 'snowball' && c.stars === 3 },
  { id: 'stormProof', test: c => c.type === 'boss' && c.stars === 3 },
  { id: 'halfway', test: c => c.worldStages.slice(0, 5).every(id => c.cleared[id]) },
  { id: 'worldOne', test: c => c.worldStages.every(id => c.cleared[id]) },
  { id: 'perfectionist', test: c => c.worldStages.every(id => c.cleared[id] === 3) },
]
