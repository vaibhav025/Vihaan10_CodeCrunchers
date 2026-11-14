import { useState } from 'react'
import { DailyQuests, GoalRing, League, StreakNotes } from '../components/meta/MetaPanels'
import ToolsStrip from '../components/meta/ToolsStrip'
import { checkIn } from '../lib/meta'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'

/** Dashboard: today's goal and quests, streak, league, Readiness Score and the safety tools. */
export default function Path() {
  const { t } = useI18n()
  const { user } = useSession()
  const [gap] = useState(checkIn)
  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
      <h1 className="sr-only">{t('nav.path')}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <StreakNotes gap={gap} />
          <ToolsStrip />
        </div>
        <aside className="space-y-4"><GoalRing /><DailyQuests /><League compact /></aside>
      </div>
    </div>
  )
}
