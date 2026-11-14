import type { Lang } from '../lib/i18n'
export type L = Record<Lang, string>
export type StageType = 'runner' | 'hopper' | 'fork' | 'snowball' | 'sorter' | 'spotter' | 'boss'

/** One stage on the map. Content lives in game/content/worlds/*.json. */
export interface StageDef {
  id: string; world: number; order: number
  /** Which engine plays the stage. `type` is the same value, kept for older call sites. */
  engine: StageType; type: StageType
  difficulty: 1 | 2 | 3
  title: L
  /** One sentence: what the player should understand afterwards. */
  learningGoal: L
  successCriteria: string
  /** Mechanic parameters, read by the stage engine. */
  params: Record<string, unknown>
  /** Keys into the world's `lessons`: the results-screen insight and the Go deeper explainer. */
  insightKey: string; deepDiveKey: string
  /** Which calculator figures the stage reads, if any. */
  calculatorLink?: string
  /** Extra reward shown before play: 'chest' (stage 5) or 'mega' (stage 10). */
  reward?: 'chest' | 'mega'
  sidekickLines?: L[]
  /** Required for NPS and tax statements. */
  sourceUrl?: string; lastReviewed?: string
}
export interface Lesson { insight: L; steps: L[]; example: L; sourceUrl?: string; lastReviewed?: string }
export interface WorldDef { id: number; name: L; tagline: L; stages: StageDef[]; lessons: Record<string, Lesson> }

export interface StageResult { stars: 1 | 2 | 3; coins: number; detail: string; score?: number; skipped?: boolean }
/** What every engine receives. `assist` slows the stage and widens hit areas; `reducedMotion` asks for the calm version. */
export interface EngineProps { config: StageDef; lang: Lang; shield: boolean; assist: boolean; reducedMotion: boolean; onComplete: (r: StageResult) => void }
