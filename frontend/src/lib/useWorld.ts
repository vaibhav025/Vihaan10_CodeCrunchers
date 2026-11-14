import { useSession } from './session'
import { levelInfo, TOTAL_QUESTS, vitalityOf } from './game'

/** The signed-in player's world, from their saved state and progress. */
export function useWorldValues() {
  const { user, progress } = useSession()
  return {
    vitality: vitalityOf(user?.avatar_state ?? 'zero'),
    // a newcomer still sees the first stretch of road once they start saving
    road: Math.min(0.12 + (progress.journal.length / TOTAL_QUESTS) * 0.88, 1),
    lanterns: Math.min(progress.streak, 7),
    level: levelInfo(user?.total_xp ?? 0).level,
    questRoad: true,
  }
}

// ---- Life Road ----
import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import type { Profile } from '../components/world/worldFromProfile'

/** Everything worldFromProfile needs, from the session plus contribution and badge counts. */
export function useLifeProfile(): Profile | null {
  const { user, progress } = useSession()
  const [counts, setCounts] = useState({ contributions: 0, badges: 0 })
  const xp = user?.total_xp ?? 0
  // XP changes whenever a contribution or badge lands, so refetch the counts then
  useEffect(() => {
    if (!user) return
    let live = true
    Promise.all([api.history().catch(() => null), api.badges().catch(() => null)]).then(([h, b]) => {
      if (live) setCounts({ contributions: h?.count ?? 0, badges: b?.total ?? 0 })
    })
    return () => { live = false }
  }, [user?.id, xp]) // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => user && {
    xp, questsCompleted: progress.journal.length, streakDays: progress.streak,
    contributionCount: counts.contributions, futureYouState: user.avatar_state, badgesUnlocked: counts.badges,
  }, [user, xp, progress.journal.length, progress.streak, counts])
}
