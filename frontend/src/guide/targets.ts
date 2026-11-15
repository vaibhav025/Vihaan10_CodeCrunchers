/** Every `data-guide` id, by the route it lives on. Tours, explain mode and `npm run guide:check` all read this. */
export const GLOBAL = ['guide-launcher', 'nav-home', 'nav-tracker', 'nav-lab', 'nav-coach', 'nav-profile', 'lang', 'account', 'hud-state', 'hud-level', 'hud-streak', 'hud-coins', 'hud-sound']
export const TARGETS: Record<string, string[]> = {
  '/home': ['next-step', 'future-line', 'progress', 'market', 'vault', 'lab-scores', 'quests', 'month', 'tip', 'tools'],
  '/tracker': ['tracker-quick', 'tracker-score', 'tracker-moves', 'tracker-vault', 'tracker-flow'],
  '/lab': ['lab-retire', 'lab-stocks', 'lab-funds', 'lab-schemes'],
  '/lab/retire': ['rr-setup', 'rr-facts', 'rr-mine', 'rr-rate', 'rr-begin', 'rr-year', 'rr-savings', 'rr-chart', 'rr-last', 'rr-risk', 'rr-next', 'rr-five', 'rr-end', 'rr-split', 'rr-b-nps', 'rr-b-apy', 'rr-b-ppf', 'rr-b-epf', 'rr-b-mf', 'rr-b-etf', 'rr-b-stocks', 'rr-npseq', 'rr-result', 'rr-ghosts', 'rr-learned', 'rr-apply'],
  '/lab/stocks': ['st-account', 'st-next', 'st-play', 'st-new', 'st-board', 'st-company', 'st-trade', 'st-why', 'st-news', 'st-lessons'],
  '/lab/funds': ['fn-steps', 'fn-exp', 'fn-sliders', 'fn-quiz', 'fn-next'],
  '/lab/schemes': ['gs-tabs', 'gs-rules', 'gs-calc', 'gs-quiz'],
  '/coach': ['coach-starters', 'coach-input', 'coach-mic', 'coach-consent'],
  '/profile': ['profile-edit', 'contrib-log', 'leaderboard', 'settings-lang', 'reset-device'],
}
/** Targets that only exist on some devices or states, so a missing one is not an error. */
export const OPTIONAL = ['coach-mic', 'hud-state', 'tracker-quick']
export const routeOf = (id: string) => Object.keys(TARGETS).find(r => TARGETS[r].includes(id))
/** The visible element for a guide id (tabs exist twice: top bar and phone bar). */
export function findTarget(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-guide="${id}"]`)) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return el }
  return null
}
