import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import WorldMap, { KIND_ICON, kindOf } from '../game/map/WorldMap'
import { getLook, itemOf, LINES, rt, tx } from '../game/character/roster'
import { CHEST, MEGA_BOX, REWARDS } from '../game/economy'
import { Link } from 'react-router-dom'
import { COMING, WORLDS, lessonOf } from '../game/content'
import { ACHIEVEMENTS } from '../game/economy'
import { gt } from '../game/strings'
import { Lock, Trophy } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { DailyQuests, GoalRing, League, StreakNotes } from '../components/meta/MetaPanels'
import ToolsStrip from '../components/meta/ToolsStrip'
import { checkIn } from '../lib/meta'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { play } from '../lib/sound'

/** Path: the world map. Tap a stage, Future You walks there, then play it. */
export default function Path() {
  const { t, lang } = useI18n()
  const { user, progress } = useSession()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { walkFrom?: number } }
  const [gap] = useState(checkIn)
  const world = WORLDS[0]
  const cleared = world.stages.filter(s => progress.nodes[s.id]).length
  const current = Math.min(cleared === 10 ? 9 : world.stages.findIndex(s => !progress.nodes[s.id]), 9)
  const [sel, setSel] = useState(current)
  const [note, setNote] = useState<string | null>(null)
  const look = getLook()
  useEffect(() => { setSel(current) }, [current])
  if (!user) return null
  const stage = world.stages[sel], st = progress.nodes[stage.id] ?? 0
  const KIcon = KIND_ICON[kindOf(stage)]
  const quip = LINES[look.sidekick]?.[sel % 3]
  const totalStars = world.stages.reduce((a, s) => a + (progress.nodes[s.id] ?? 0), 0)

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>{gt('world', lang, { n: world.id })} · {world.tagline[lang]}</Label>
          <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.05] text-ink">{world.name[lang]}</h1>
        </div>
        <div className="flex items-center gap-2" role="tablist" aria-label="Worlds">
          <span role="tab" aria-selected className="label rounded-md bg-forest px-3 py-2 !text-on-forest">{gt('world', lang, { n: 1 })}</span>
          {COMING.map(w => <span key={w.id} role="tab" aria-selected={false} aria-disabled className="label hidden items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-2 sm:inline-flex" title={gt('soon', lang)}><Lock size={11} />{w.name[lang]}</span>)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={cleared} aria-label={gt('progress', lang, { n: cleared })}>
          {world.stages.map(s => <span key={s.id} className={`h-2 flex-1 rounded-full ${progress.nodes[s.id] ? 'bg-forest' : 'bg-mist'}`} />)}
        </span>
        <span className="label">{gt('progress', lang, { n: cleared })} · {totalStars} / 30 ★</span>
      </div>

      <div className="mt-4"><WorldMap world={world} stars={progress.nodes} lang={lang} selected={sel} walkFrom={loc.state?.walkFrom} look={look}
        onSelect={(i, locked) => { if (locked) { setNote(gt('locked', lang)); play('bad') } else { setNote(null); setSel(i); play('tick') } }} /></div>

      {/* the stage Future You is standing on: the one primary action */}
      <m.section key={stage.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hud mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6" aria-live="polite">
        <div className="min-w-[220px] flex-1">
          <Label>{gt('stage', lang, { n: stage.order })} · {gt(`t_${stage.type}`, lang)}{st ? ` · ${st} / 3 ★` : ''}</Label>
          <p className="mt-1 flex items-center gap-2.5 font-serif text-[1.7rem] leading-tight text-ink"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-haze text-forest"><KIcon size={20} /></span>{stage.title[lang]}</p>
          <p className="mt-2 max-w-xl text-[15px] text-ink"><span className="label mr-2">{rt('goal', lang)}</span>{stage.learningGoal[lang]}</p>
          <p className="label mt-1.5">{rt('reward', lang, REWARDS.clear[3] + REWARDS.perfectBonus)}</p>
          {stage.reward && (() => { const b = stage.reward === 'mega' ? MEGA_BOX : CHEST, it = b.collectible ? itemOf(b.collectible) : undefined; return <p className="label mt-1 !text-forest">{gt(stage.reward === 'mega' ? 'mega' : 'chest', lang)}: {b.xp} XP · {b.coins} {gt('coins', lang)}{it ? ` · ${tx(it.name, lang)}` : ''}{b.restTokens ? ` · ${gt('l_rest', lang)}` : ''}</p> })()}
          {quip && <p className="mt-2 max-w-xl text-[14px] italic text-soft">“{tx(quip, lang)}”</p>}
          {st > 0 && <p className="mt-2 max-w-xl text-[15px] text-soft"><span className="label mr-2">{gt('why', lang)}</span>{lessonOf(stage).insight?.[lang]}</p>}
          {note && <p role="status" className="mt-2 text-rust">{note}</p>}
        </div>
        <div className="flex flex-col items-stretch gap-2"><button className="btn game-btn min-w-[170px]" onClick={() => nav(`/play/${stage.id}`)}>{st ? gt('replay', lang) : gt('play', lang)}</button>
          <Link to="/wardrobe" className="link justify-center">{rt('title', lang)}</Link></div>
      </m.section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section aria-labelledby="ach" className="hud p-5">
            <div className="flex items-baseline justify-between gap-3"><h2 id="ach" className="flex items-center gap-2 text-[1.4rem] text-ink"><Trophy size={19} strokeWidth={1.5} />{gt('achievements', lang)}</h2>
              <Label>{progress.achievements.length} / {ACHIEVEMENTS.length}{progress.power.shield ? ` · ${gt('l_shield', lang)} ×${progress.power.shield}` : ''}{progress.power.double ? ` · ×2` : ''}</Label></div>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACHIEVEMENTS.map(a => { const got = progress.achievements.includes(a.id); return (
                <li key={a.id} title={gt(`d_${a.id}`, lang)} className={`rounded-lg border px-3 py-2.5 ${got ? 'border-amber bg-amber-soft/30' : 'border-dashed border-line'}`}>
                  <span className={`block font-serif text-[16px] leading-tight ${got ? 'text-ink' : 'text-soft'}`}>{gt(`a_${a.id}`, lang)}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-soft">{gt(`d_${a.id}`, lang)}</span>
                </li>) })}
            </ul>
          </section>
          <StreakNotes gap={gap} />
          <ToolsStrip />
        </div>
        <aside className="space-y-4"><GoalRing /><DailyQuests /><League compact /></aside>
      </div>
      <span className="sr-only">{t('nav.path')}</span>
    </div>
  )
}
