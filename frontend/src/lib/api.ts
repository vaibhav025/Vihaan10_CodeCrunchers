import type { FutureState } from '../design-tokens'
import type { Projection } from './nps'
import type { Money } from './tracker'

// Remove bearer tokens from earlier builds; sessions now live in HttpOnly cookies.
try { localStorage.removeItem('pq.token') } catch { /* storage may be unavailable */ }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the SixtyFy server. Check that the backend is running on port 8000.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed (${res.status})`
    throw new ApiError(res.status, detail)
  }
  return res.json()
}
const post = <T,>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) })

export interface User {
  id: string; name: string; email: string; age: number; income_range: string | null; risk_profile: string
  retirement_age: number; language: string; avatar_state: FutureState; total_xp: number; level: number
  public_handle: string | null; show_on_leaderboard: boolean; ai_consent: boolean; phone?: string | null
}
export interface Quest {
  id: string; title: string; description: string; difficulty: string; xp_reward: number
  options: Record<string, string>
}
export interface QuestResult {
  is_correct: boolean; correct_answer: string; explanation: string; xp_earned: number; total_xp: number
  streak: { current_streak: number; longest_streak: number; streak_bonus_xp: number }
  new_badges: unknown[]
}
export interface Contribution { id: string; amount: number; source: string; financial_year: string; contributed_at: string | null }
export interface EarnedBadge { id: string; name: string; description: string; category: string; unlocked_at: string | null }
export interface Rank { rank?: number; name?: string; level?: number; score?: number; user_id?: string; [k: string]: unknown }

/** Market Lab progress for one module: scores and lesson ids only, never money values. */
export interface LabRow { module: string; best_score: number; runs_completed: number; last_outcome: string | null; last_lessons: string[]; updated_at: string | null }
export interface LabSaved { progress: LabRow; xp_earned: number; total_xp: number; level: number; level_up: boolean; xp_capped: boolean; daily_xp_left: number }

export const api = {
  register: (b: { email: string; phone?: string; password: string; name: string; age: number; income_range: string; language: string; retirement_age: number; risk_profile: string; financial_data: Money; consent: boolean }) =>
    post<{ user: User }>('/auth/register', b),
  login: (b: { email: string; password: string }) =>
    post<{ user: User }>('/auth/login', b),
  logout: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
  tracker: () => call<Money>('/tracker'),
  saveTracker: (b: Money) => call<Money>('/tracker', { method: 'PUT', body: JSON.stringify(b) }),
  profile: () => call<User>('/user/profile'),
  update: (b: Partial<Pick<User, 'name' | 'age' | 'income_range' | 'language' | 'retirement_age' | 'risk_profile' | 'ai_consent' | 'public_handle' | 'show_on_leaderboard' | 'phone'>>) =>
    call<unknown>('/user/update', { method: 'PUT', body: JSON.stringify(b) }),
  dailyQuest: () => call<Quest | { quest: null; message: string }>('/quests/daily'),
  submitQuest: (quest_id: string, answer: string) => post<QuestResult>('/quests/submit', { quest_id, answer }),
  simulate: (b: { current_age: number; retirement_age: number; monthly_contribution: number; annual_return_pct: number; risk_profile: string; annual_income: number }) =>
    post<Projection>('/simulator/calculate', b),
  compare: (b: { retirement_age: number; contributions: number[]; annual_return_pct: number; annual_income: number; tax_regime?: 'old' | 'new'; employer_contribution_monthly?: number; risk_profile?: string }) =>
    post<{ scenarios: (Projection & { monthly_contribution: number })[] }>('/simulator/compare', b),
  badges: () => call<{ badges: EarnedBadge[]; total: number }>('/gamification/badges'),
  leaderboard: (board: string) => call<{ leaderboard: Rank[]; user_rank: Rank | null }>(`/gamification/leaderboard?board_type=${board}&limit=10`),
  contribute: (amount: number) => post<{ avatar_state: FutureState; total_contributed: number }>('/contributions/add', { amount }),
  history: () => call<{ contributions: Contribution[]; total: number; count: number }>('/contributions/history'),
  labProgress: () => call<{ progress: LabRow[]; daily_xp_cap: number }>('/lab/progress'),
  saveLab: (b: { module: 'stocks' | 'retire' | 'funds' | 'schemes'; score: number; outcome: string; lessons: string[] }) => post<LabSaved>('/lab/progress', b),
  exportData: () => call<unknown>('/user/export'),
  deleteAccount: () => fetch('/api/user/me', { method: 'DELETE', credentials: 'include' }),
  chat: (message: string, conversation_history: { role: 'user' | 'assistant'; content: string }[]) =>
    post<{ reply: string; disclaimer: string; intent?: string; sources?: string[]; provider?: string }>('/ai/coach/chat', { message, conversation_history }),
}
