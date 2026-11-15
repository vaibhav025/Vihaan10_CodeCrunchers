import { useState } from 'react'
import { m } from 'framer-motion'
import { DailyQuests, StreakNotes } from '../components/meta/MetaPanels'
import ToolsStrip from '../components/meta/ToolsStrip'
import { MonthCard, NextStep, TipCard, rise, useLabRows } from '../components/dash/panels'
import MarketPulse from '../components/dash/MarketPulse'
import { LabBoard, ProgressBoard, VaultBoard } from '../components/dash/boards'
import { checkIn } from '../lib/meta'
import { useSession } from '../lib/session'

/** Dashboard: the next step, the score and what it lacks, money at 60, Lab progress, today's quests and the month so far. */
export default function Path() {
  const { user } = useSession()
  const [gap] = useState(checkIn)
  const { rows, failed } = useLabRows()
  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-5 sm:px-8">
      <StreakNotes gap={gap} />
      <NextStep rows={rows} />
      <div data-guide="progress"><ProgressBoard rows={rows} i={1} /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div data-guide="market"><MarketPulse i={2} /></div>
          <div data-guide="vault"><VaultBoard i={3} /></div>
          <div data-guide="lab-scores"><LabBoard rows={rows} failed={failed} i={4} /></div>
          <m.div {...rise(5)} data-guide="tools"><ToolsStrip tools /></m.div>
        </div>
        <aside className="space-y-5">
          <m.div {...rise(2)} data-guide="quests"><DailyQuests /></m.div>
          <MonthCard i={3} />
          <TipCard i={4} />
        </aside>
      </div>
    </div>
  )
}
