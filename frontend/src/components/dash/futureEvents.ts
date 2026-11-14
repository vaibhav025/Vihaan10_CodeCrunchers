/** Life events for the dashboard's future line. `impact` is a fraction of the line's amplitude. Labels and lessons live in i18n (`fl.e.<id>`, `fl.e.<id>.l`). */
export interface LifeEvent { id: string; type: 'up' | 'down'; impact: number }
export const LIFE_EVENTS: LifeEvent[] = [
  { id: 'bonus', type: 'up', impact: 0.55 },
  { id: 'medical', type: 'down', impact: 0.6 },
  { id: 'sip', type: 'up', impact: 0.6 },
  { id: 'scam', type: 'down', impact: 0.7 },
  { id: 'employer', type: 'up', impact: 0.5 },
  { id: 'lifestyle', type: 'down', impact: 0.4 },
  { id: 'tax', type: 'up', impact: 0.35 },       // rule-related lesson: keep wording reviewed
  { id: 'inflation', type: 'down', impact: 0.45 },
  { id: 'raise', type: 'up', impact: 0.5 },
  { id: 'fall', type: 'down', impact: 0.55 },
  { id: 'kyc', type: 'up', impact: 0.4 },
  { id: 'skip', type: 'down', impact: 0.3 },
]
export const FL_FLAGS = { dotCount: 0 /* 0 = auto */, driftSpeed: 24 }
