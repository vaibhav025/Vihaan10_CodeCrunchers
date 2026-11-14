import { today } from './session'

/**
 * Meta-game state kept on this device (daily quests, rest tokens, league week, shop).
 * PLACEHOLDER until the backend has endpoints for them; every value here is the player's own.
 */
export interface Meta {
  day: string; lessonsToday: number; bestAccToday: number; dayChestClaimed: boolean
  week: string; weekXp: number; weekLessons: number; league: number
  restTokens: number; owned: string[]; equipped: string[]; boostUntil: number
  goal: 1 | 2 | 3; lastVisit: string; shield: { streak: number; day: string } | null
  shieldWeek: string; shieldScore: number
  /** Days (YYYY-MM-DD) a Lab run was last saved and the coach was last asked, for daily quests. */
  labDay: string; coachDay: string
}
const KEY = 'pq.meta'
const isoWeek = (d = new Date()) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${Math.ceil(((+t - +y) / 864e5 + 1) / 7)}` }
const BASE: Meta = { day: '', lessonsToday: 0, bestAccToday: 0, dayChestClaimed: false, week: '', weekXp: 0, weekLessons: 0, league: 0, restTokens: 0, owned: [], equipped: [], boostUntil: 0, goal: 1, lastVisit: '', shield: null, shieldWeek: '', shieldScore: 0, labDay: '', coachDay: '' }

export const LEAGUES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
/** League rules on this device: 300+ XP in a week promotes, under 50 demotes. */
export const PROMOTE_XP = 300, DEMOTE_XP = 50

const subs = new Set<() => void>()
let cache: Meta | null = null
export function getMeta(): Meta {
  if (cache) return cache
  let m: Meta = { ...BASE, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  const d = today(), w = isoWeek()
  if (m.day !== d) m = { ...m, day: d, lessonsToday: 0, bestAccToday: 0, dayChestClaimed: false }
  if (m.week !== w) {
    // week rolled over: settle the league
    const up = m.weekXp >= PROMOTE_XP, down = m.weekXp < DEMOTE_XP && m.week !== ''
    m = { ...m, week: w, weekXp: 0, weekLessons: 0, league: Math.min(Math.max(m.league + (up ? 1 : down ? -1 : 0), 0), LEAGUES.length - 1) }
  }
  cache = m; localStorage.setItem(KEY, JSON.stringify(m))
  return m
}
export function setMeta(p: Partial<Meta>) { cache = { ...getMeta(), ...p }; localStorage.setItem(KEY, JSON.stringify(cache)); subs.forEach(f => f()) }
export const subscribeMeta = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

export function recordLesson({ accuracy, xp }: { accuracy: number; xp: number }) {
  const m = getMeta()
  setMeta({ lessonsToday: m.lessonsToday + 1, bestAccToday: Math.max(m.bestAccToday, accuracy), weekXp: m.weekXp + xp, weekLessons: m.weekLessons + 1 })
}

/** Days since the last visit, then marks today as visited. */
export function checkIn(): number {
  const m = getMeta(), d = today()
  const gap = m.lastVisit ? Math.round((+new Date(d) - +new Date(m.lastVisit)) / 864e5) : 0
  if (m.lastVisit !== d) setMeta({ lastVisit: d })
  return gap
}

export const SHOP = [
  { id: 'rest', price: 50, kind: 'token' as const },
  { id: 'boost', price: 40, kind: 'boost' as const },
  { id: 'glasses', price: 80, kind: 'cosmetic' as const },
  { id: 'scarf', price: 40, kind: 'cosmetic' as const },
  { id: 'cane', price: 60, kind: 'cosmetic' as const },
  { id: 'garden', price: 120, kind: 'cosmetic' as const },
]
export const DAY_CHEST = { coins: 30, tokens: 1 }
export const STREAK_MILESTONES = [7, 30, 100]
