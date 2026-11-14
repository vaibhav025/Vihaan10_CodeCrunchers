import { lazy, Suspense, useRef, useState, type ComponentType } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { LifeBuoy, Volume2, VolumeX, X } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useGameEvents } from '../lib/events'
import { getMeta, recordLesson, setMeta } from '../lib/meta'
import { setSound, soundOn } from '../lib/sound'
import { prefersLessMotion } from '../lib/motionPref'
import { stageById, WORLDS } from '../game/content'
import { ACHIEVEMENTS, ASSIST_AFTER, CHEST, MEGA_BOX, REWARDS } from '../game/economy'
import { gt } from '../game/strings'
import { grant, itemOf, owned, tx } from '../game/character/roster'
import { LootBox, Results, WorldDone, type Res } from '../game/results/Results'
import type { EngineProps, StageResult, StageType } from '../game/types'

// each engine is its own lazy chunk
const ENGINES: Record<StageType, ComponentType<EngineProps>> = {
  runner: lazy(() => import('../game/stages/runner/Runner')), hopper: lazy(() => import('../game/stages/hopper/Hopper')),
  fork: lazy(() => import('../game/stages/fork/Fork')), snowball: lazy(() => import('../game/stages/snowball/Snowball')),
  sorter: lazy(() => import('../game/stages/sorter/Sorter')), spotter: lazy(() => import('../game/stages/spotter/Spotter')),
  boss: lazy(() => import('../game/stages/boss/Boss')),
}

/** Plays one stage: play, shared results, then the chest or Mega Box, then back to the map. Retries are unlimited. */
export default function Play() {
  const { id = '' } = useParams()
  const stage = stageById(id)
  const { lang } = useI18n()
  const nav = useNavigate()
  const { progress, saveProgress } = useSession()
  const { push } = useGameEvents()
  const world = WORLDS.find(w => w.id === stage?.world)
  const failKey = `pq.fail.${id}`
  const [assist, setAssist] = useState(() => Number(localStorage.getItem(failKey) ?? 0) >= ASSIST_AFTER)
  const [sound, setSnd] = useState(soundOn)
  const [phase, setPhase] = useState<'play' | 'result' | 'loot' | 'world'>('play')
  const [run, setRun] = useState(0)
  const [res, setRes] = useState<Res | null>(null)
  const [loot, setLoot] = useState<string[] | null>(null)
  // a shield held when an action stage starts is used on it
  const shield = useRef(!!stage && (stage.engine === 'runner' || stage.engine === 'hopper') && progress.power.shield > 0)

  if (!stage || !world) return <Navigate to="/home" replace />
  const ids = world.stages.map(s => s.id)
  const prev = world.stages[stage.order - 2]
  if (prev && !progress.nodes[prev.id]) return <Navigate to="/home" replace />
  const first = !progress.nodes[stage.id]

  function done(r: StageResult) {
    // one-star finishes count as failures; three of them turn assist on
    const fails = r.stars === 1 && !r.skipped ? Number(localStorage.getItem(failKey) ?? 0) + 1 : 0
    localStorage.setItem(failKey, String(fails)); if (fails >= ASSIST_AFTER) setAssist(true)
    const doubled = progress.power.double > 0
    const total = (r.coins + REWARDS.clear[r.stars] + (r.stars === 3 ? REWARDS.perfectBonus : 0)) * (doubled ? 2 : 1)
    const nodes = { ...progress.nodes, [stage!.id]: Math.max(progress.nodes[stage!.id] ?? 0, r.stars) }
    const ctx = { stageId: stage!.id, type: stage!.engine, stars: r.stars, coins: r.coins, cleared: Object.fromEntries(ids.filter(i => nodes[i]).map(i => [i, nodes[i]])), worldStages: ids }
    const earned = ACHIEVEMENTS.filter(a => !progress.achievements.includes(a.id) && a.test(ctx)).map(a => a.id)
    earned.forEach(a => push({ kind: 'badge', title: gt(`a_${a}`, lang), detail: gt(`d_${a}`, lang) }))
    const achievements = [...progress.achievements, ...earned]
    const box = first && !r.skipped ? (stage!.reward === 'chest' ? CHEST : stage!.reward === 'mega' ? MEGA_BOX : null) : null
    let extra = 0
    const lines: string[] = []
    if (box) {
      lines.push(gt('l_xp', lang, { n: box.xp }), gt('l_coins', lang, { n: box.coins }))
      if (box.shield) lines.push(gt('l_shield', lang)); if (box.double) lines.push(gt('l_double', lang)); if (box.restTokens) lines.push(gt('l_rest', lang))
      const it = box.collectible ? itemOf(box.collectible) : undefined
      if (it && owned(it, { ...progress, nodes, achievements })) { extra = REWARDS.duplicateCoins; lines.push(gt('l_dup', lang, { x: tx(it.name, lang), n: extra })) }
      else if (it) { grant(box.collectible!); lines.push(gt('l_new', lang, { x: tx(it.name, lang) })) }
      setMeta({ restTokens: getMeta().restTokens + box.restTokens })
    }
    saveProgress({
      nodes, coins: progress.coins + total + (box?.coins ?? 0) + extra, achievements,
      power: { shield: progress.power.shield - (shield.current ? 1 : 0) + (box?.shield ?? 0), double: progress.power.double - (doubled ? 1 : 0) + (box?.double ?? 0) },
    })
    const xp = first && !r.skipped ? REWARDS.xp[r.stars] + (box?.xp ?? 0) : 0
    recordLesson({ accuracy: r.stars / 3, xp })
    setLoot(box ? lines : null); setRes({ ...r, total, doubled, xp }); setPhase('result')
  }
  const back = () => nav('/home', { state: { walkFrom: stage.order - 1 } })
  const Engine = ENGINES[stage.engine]
  const tog = 'grid h-11 min-w-11 place-items-center rounded px-2 text-soft hover:text-ink aria-pressed:text-forest'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button onClick={() => nav('/home')} aria-label="Close" className={tog}><X size={22} /></button>
        <div className="min-w-0 flex-1"><Label>{gt('stage', lang, { n: stage.order })} · {gt(`t_${stage.engine}`, lang)}</Label><p className="truncate font-serif text-xl leading-tight text-ink">{stage.title[lang]}</p></div>
        <button aria-pressed={assist} title={gt('assistBtn', lang)} aria-label={gt('assistBtn', lang)} onClick={() => { setAssist(!assist); setRun(run + 1) }} className={tog}><LifeBuoy size={20} /></button>
        <button aria-pressed={sound} title={gt('soundBtn', lang)} aria-label={gt('soundBtn', lang)} onClick={() => { setSound(!sound); setSnd(!sound) }} className={tog}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </header>
      <main className="relative min-h-0 flex-1">
        {phase === 'play' && <Suspense fallback={<div className="grid h-full place-items-center"><span className="loadbar h-[2px] w-28 overflow-hidden rounded bg-line" /></div>}>
          <Engine key={run} config={stage} lang={lang} shield={shield.current} assist={assist} reducedMotion={prefersLessMotion()} onComplete={done} />
        </Suspense>}
        {phase === 'result' && res && <Results stage={stage} lang={lang} res={res} box={loot ? stage.reward ?? null : null}
          onNext={() => (loot ? setPhase('loot') : back())} onReplay={() => { setRes(null); setRun(run + 1); setPhase('play') }} onTry={() => nav('/tracker')} />}
        {phase === 'loot' && loot && <LootBox mega={stage.reward === 'mega'} lines={loot} lang={lang} onDone={() => (stage.reward === 'mega' ? setPhase('world') : back())} />}
        {phase === 'world' && <WorldDone world={world.id} lang={lang} onDone={back} />}
      </main>
    </div>
  )
}
