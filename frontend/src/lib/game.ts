import { type FutureState, stateVitality } from '../design-tokens'

// Mirrors backend/app/services/xp_service.py and avatar_service.py. Display only.
export const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7500, 15000, 30000]
export const LEVEL_TITLES = ['NPS Rookie', 'NPS Learner', 'NPS Aware', 'NPS Saver', 'NPS Champion', 'NPS Master', 'NPS Legend']

export function levelInfo(xp: number) {
  let level = 1
  LEVEL_THRESHOLDS.forEach((t, i) => { if (xp >= t) level = i + 1 })
  const floor = LEVEL_THRESHOLDS[level - 1]
  const next = LEVEL_THRESHOLDS[level] ?? null
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    next,
    toNext: next === null ? 0 : next - xp,
    pct: next === null ? 100 : Math.round(((xp - floor) / (next - floor)) * 100),
  }
}

export const INCOME_RANGES = ['10000-20000', '20000-30000', '30000-50000', '50000-100000', '100000-200000']

export function monthlyIncome(range?: string | null) {
  const [a, b] = (range ?? '').split('-').map(Number)
  return a && b ? (a + b) / 2 : 10000
}
/** NPS guideline baseline: save 10% of monthly income. */
export const recommended = (range?: string | null) => monthlyIncome(range) * 0.1

const STEPS: [number, FutureState][] = [[100, 'thriving'], [80, 'stable'], [50, 'struggling'], [20, 'critical']]

export function stateFor(monthly: number, target: number): FutureState {
  if (!monthly || !target) return 'zero'
  const pct = (monthly / target) * 100
  return STEPS.find(([min]) => pct >= min)?.[1] ?? 'zero'
}

/** Continuous version of the state, so the world moves while a slider is dragged. */
export function vitalityFor(monthly: number, target: number) {
  if (!monthly || !target) return 0
  const r = monthly / target
  const pts = [[0, 0], [0.2, 0.25], [0.5, 0.5], [0.8, 0.75], [1, 1]]
  for (let i = 1; i < pts.length; i++) {
    if (r <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      return y0 + ((r - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return 1
}

/** What it takes to reach the next state: "Add ₹1,500/month to reach Thriving." */
export function nextStep(monthly: number, target: number) {
  const pct = target ? (monthly / target) * 100 : 0
  const up = [...STEPS].reverse().find(([min]) => pct < min)
  if (!up) return null
  return { state: up[1], add: Math.ceil((target * up[0] / 100 - monthly) / 50) * 50 }
}

export const vitalityOf = (s: FutureState) => stateVitality[s]

export type BadgeGroup = 'learning' | 'streak' | 'contribution' | 'social' | 'special'
export interface BadgeDef { name: string; description: string; group: BadgeGroup; trigger: string; value: number }

// The backend only returns badges already earned, so the full set (from scripts/seed_badges.py) lives here.
export const BADGES: BadgeDef[] = [
  { name: 'First Quest', description: 'Complete your first NPS quest', group: 'learning', trigger: 'quests', value: 1 },
  { name: 'NPS Scholar', description: 'Complete 10 NPS quests', group: 'learning', trigger: 'quests', value: 10 },
  { name: 'NPS Expert', description: 'Complete 25 NPS quests', group: 'learning', trigger: 'quests', value: 25 },
  { name: 'Streak 3', description: 'Keep a 3-day learning streak', group: 'streak', trigger: 'streak', value: 3 },
  { name: 'Streak 7', description: 'Keep a 7-day learning streak', group: 'streak', trigger: 'streak', value: 7 },
  { name: 'Streak 30', description: 'Keep a 30-day learning streak', group: 'streak', trigger: 'streak', value: 30 },
  { name: 'First Step', description: 'Log your first NPS contribution', group: 'contribution', trigger: 'contributions', value: 1 },
  { name: 'Saver 5K', description: 'Contribute ₹5,000 in total', group: 'contribution', trigger: 'total', value: 5000 },
  { name: 'Five Figure', description: 'Contribute ₹10,000 in total', group: 'contribution', trigger: 'total', value: 10000 },
  { name: 'Consistent Saver', description: 'Contribute six months in a row', group: 'contribution', trigger: 'months', value: 6 },
  { name: 'Ambassador', description: 'Refer 3 friends', group: 'social', trigger: 'referrals', value: 3 },
  { name: 'Influencer', description: 'Refer 10 friends', group: 'social', trigger: 'referrals', value: 10 },
  { name: 'Simulator Pro', description: 'Run the simulator 5 times', group: 'special', trigger: 'simulator', value: 5 },
  { name: 'AI Explorer', description: 'Have 10 conversations with the coach', group: 'special', trigger: 'chats', value: 10 },
  { name: 'Multilingual', description: 'Use two languages', group: 'special', trigger: 'languages', value: 2 },
]

export const TOTAL_QUESTS = 10
