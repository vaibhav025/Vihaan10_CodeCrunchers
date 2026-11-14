import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, X } from '../components/ui/icons'
import LifeWorld from '../components/world/LifeWorld'
import type { ScenePulse } from '../components/world/LifeScene'
import { ErrorNote, Label, useCountUp } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useLifeProfile } from '../lib/useWorld'
import { api, type Quest as QuestT, type QuestResult } from '../lib/api'
import { TOTAL_QUESTS } from '../lib/game'
import { pad2 } from '../lib/format'
import { useGameEvents } from '../lib/events'
import { today } from '../lib/session'
import { play } from '../lib/sound'

const KEYS = ['a', 'b', 'c', 'd']

export default function Quest() {
  const { t, lang } = useI18n()
  const { user, progress, saveProgress, refresh } = useSession()
  const profile = useLifeProfile()
  const [pulse, setPulse] = useState<ScenePulse | null>(null)
  const { push } = useGameEvents()
  const [quest, setQuest] = useState<QuestT | null | undefined>(undefined) // undefined = loading, null = none left
  const [pick, setPick] = useState<string | null>(null)
  const [result, setResult] = useState<QuestResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const done = progress.journal.length

  const load = useCallback(async () => {
    setQuest(undefined); setPick(null); setResult(null); setError(null)
    try {
      const q = await api.dailyQuest()
      setQuest('id' in q ? q : null)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }, [])
  useEffect(() => { load() }, [load, lang])

  const lock = useCallback(async () => {
    if (!quest || !pick || busy || result) return
    setBusy(true); setError(null)
    try {
      const r = await api.submitQuest(quest.id, pick)
      setResult(r)
      play(r.is_correct ? 'good' : 'bad')
      setPulse(p => ({ kind: r.is_correct ? 'correct' : 'wrong', n: (p?.n ?? 0) + 1 }))
      ;(r.new_badges as { name: string; description: string }[]).forEach(b => push({ kind: 'badge', title: b.name, detail: b.description }))
      saveProgress({
        questDay: today(),
        streak: r.streak.current_streak, longest: r.streak.longest_streak,
        journal: [...progress.journal, { title: quest.title, correct: r.is_correct }],
      })
      refresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }, [quest, pick, busy, result, progress.journal, saveProgress, refresh, push])

  // A–D pick an answer, Enter locks it
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !quest || result) return
      const k = e.key.toLowerCase()
      if (KEYS.includes(k) && quest.options[k]) { setPick(k); play('tick') }
      else if (e.key === 'Enter' && pick && (e.target as HTMLElement).tagName !== 'A') { e.preventDefault(); lock() }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [quest, result, pick, lock])

  const xp = useCountUp(result?.xp_earned ?? 0, 700)

  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
      <section className="lg:order-2">
        {profile && user && (
          <LifeWorld profile={profile} userId={user.id} mode="quest" pulse={pulse}
            className="h-[34vh] min-h-[240px] w-full lg:h-[500px]" label={`${t('q.road')}: ${done} / ${TOTAL_QUESTS}`} />
        )}
        <div className="mb-5 flex items-center gap-3">
          <Label>{t('q.roadBuilt')}</Label>
          <div className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: TOTAL_QUESTS }, (_, i) => (
              <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-line">
                <span className={`absolute inset-0 bg-forest transition-opacity duration-700 ${i < done ? 'opacity-100' : 'opacity-0'}`} />
              </span>
            ))}
          </div>
          <span className="num text-xl text-ink">{done}<span className="label"> / {TOTAL_QUESTS}</span></span>
        </div>
        <Minimap done={progress.journal} />
        <Journey done={progress.journal} />
      </section>

      <section className="lg:order-1 lg:pt-6">
        {error && <ErrorNote message={error} onRetry={quest === undefined ? load : undefined} />}
        {quest === undefined && !error && <Label>{t('common.loading')}</Label>}

        {quest === null && (
          <div className="hud p-7">
            <Label>{t('q.journey')} · {pad2(done)} / {TOTAL_QUESTS}</Label>
            {/* a new player with no quests published must not be told the road is complete */}
            <h1 className="mt-3 text-[2.2rem] leading-[1.08] text-ink">{t(done ? 'q.doneTitle' : 'q.noneTitle')}</h1>
            <p className="mt-3 leading-relaxed text-soft">{t(done ? 'q.doneSub' : 'q.noneSub')}</p>
            <Link to="/tracker" className="btn mt-6">{t('q.openSim')}</Link>
          </div>
        )}

        {quest && (
          <article className="hud p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>{t('q.label', { n: pad2(done + (result ? 0 : 1)) })} · {quest.difficulty}</Label>
              <Label>+{quest.xp_reward} XP</Label>
            </div>
            <Label className="mt-6 block">{t('q.briefing')}</Label>
            <h1 className="mt-1.5 text-[1.9rem] leading-[1.12] text-ink">{quest.title}</h1>
            <Label className="mt-5 block">{t('q.objective')}</Label>
            <p className="mt-1.5 text-[17px] leading-relaxed text-ink">{quest.description}</p>

            <div role="radiogroup" aria-label={t('q.pick')} className="mt-6 space-y-2">
              {KEYS.filter(k => quest.options[k]).map(k => {
                const right = result?.correct_answer.toLowerCase() === k
                const wrong = result && pick === k && !result.is_correct
                return (
                  <button key={k} type="button" role="radio" aria-checked={pick === k} disabled={!!result}
                    onClick={() => { setPick(k); play('tick') }}
                    className={`row ${wrong ? 'nudge' : ''} ${right ? '!border-forest !bg-haze' : ''} ${result && !right ? 'opacity-70' : ''}`}>
                    <kbd className="label grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-paper !text-ink">{k}</kbd>
                    <span className="flex-1 py-3 text-[16px]">{quest.options[k]}</span>
                    {right && <Check size={18} strokeWidth={2} className="text-forest" aria-label={t('q.correct')} />}
                    {wrong && <X size={18} strokeWidth={2} className="text-rust" aria-label={t('q.wrong')} />}
                  </button>
                )
              })}
            </div>

            {!result ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="label">{t('q.pick')}</p>
                <button className="btn" onClick={lock} disabled={!pick || busy}>{t('q.lock')}</button>
              </div>
            ) : (
              <div className="relative mt-6 overflow-hidden border-t border-line pt-5" role="status">
                {result.is_correct && <span aria-hidden className="sweep" />}
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-serif text-2xl text-ink">
                    {result.is_correct ? t('q.correct') : `${t('q.wrong')} ${t('q.answer', { x: result.correct_answer.toUpperCase() })}`}
                  </p>
                  <p className="label !text-ink">
                    +{Math.round(xp)} XP
                    {result.streak.streak_bonus_xp > 0 && ` · ${t('q.streakBonus')} +${result.streak.streak_bonus_xp}`}
                  </p>
                </div>
                <p className="mt-2 leading-relaxed text-soft">{result.explanation}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <button className="btn" onClick={load} autoFocus>{t('q.next')}</button>
                  <Link to="/home" className="link">{t('q.base')}</Link>
                </div>
              </div>
            )}
          </article>
        )}
      </section>
    </div>
  )
}

function Journey({ done }: { done: { title: string; correct: boolean }[] }) {
  const { t } = useI18n()
  return (
    <div className="mt-2">
      <Label>{t('q.journey')}</Label>
      <ol className="relative mt-3 flex items-center justify-between before:absolute before:inset-x-3 before:top-1/2 before:border-t before:border-dashed before:border-soft/50">
        {Array.from({ length: TOTAL_QUESTS }, (_, i) => {
          const entry = done[i]
          const current = i === done.length
          const name = entry ? entry.title : current ? t('q.current') : t('q.locked')
          return (
            <li key={i} className="relative" title={`${pad2(i + 1)} · ${name}`}>
              <span className={`grid h-7 w-7 place-items-center rounded border sm:h-8 sm:w-8 ${entry ? 'border-forest bg-forest text-on-forest' : current ? 'border-forest bg-card text-ink ring-2 ring-forest/25' : 'border-line bg-paper text-soft'}`}>
                {entry ? (entry.correct ? <Check size={14} aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />) : current ? <span className="label !text-ink">{i + 1}</span> : <Lock size={11} aria-hidden />}
              </span>
              <span className="sr-only">{pad2(i + 1)}: {name}</span>
            </li>
          )
        })}
      </ol>
      <details className="mt-4">
        <summary className="link cursor-pointer">{t('q.journal')}</summary>
        {done.length === 0 ? <p className="mt-1 text-soft">{t('q.empty')}</p> : (
          <ol className="mt-1 divide-y divide-line border-y border-line">
            {done.map((d, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <Label>{pad2(i + 1)}</Label>
                <span className="flex-1 text-ink">{d.title}</span>
                <Label>{d.correct ? t('q.correct') : t('q.wrong')}</Label>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  )
}

/** The Life Road seen from above, with a node for each quest: answered, current, locked. */
function Minimap({ done }: { done: { title: string; correct: boolean }[] }) {
  const { t } = useI18n()
  // a simple S-road, the same shape the 3D world uses
  const pts = Array.from({ length: TOTAL_QUESTS }, (_, i) => [20 + i * (260 / (TOTAL_QUESTS - 1)), 34 + Math.sin(i * 0.9) * 18])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  return (
    <figure className="hud mb-4 p-3">
      <svg viewBox="0 0 300 68" className="w-full" role="img" aria-label={`${t('q.journey')}: ${done.length} / ${TOTAL_QUESTS}`}>
        <path d={d} fill="none" className="stroke-line" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pts.slice(0, Math.max(done.length, 1)).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')} fill="none" className="stroke-forest" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === done.length ? 6 : 4.5}
            className={i < done.length ? (done[i].correct ? 'fill-amber' : 'fill-sage') : i === done.length ? 'fill-card stroke-forest' : 'fill-mist stroke-line'} strokeWidth="2" />
        ))}
      </svg>
    </figure>
  )
}
