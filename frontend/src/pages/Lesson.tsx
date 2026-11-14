import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Check, Star, X } from '../components/ui/icons'
import { Label, useCountUp } from '../components/ui/kit'
import { LocalQuestion, answerText, isCorrect, isReady, type Answer } from '../components/lesson/QuestionTypes'
import { useI18n } from '../lib/i18n'
import { today, useSession } from '../lib/session'
import { api, type Quest } from '../lib/api'
import { LESSON_COINS, NODES, starsFor } from '../lib/path'
import { bankFor, type LocalQ } from '../lib/questions'
import { useGameEvents } from '../lib/events'
import { play } from '../lib/sound'
import { getMeta, recordLesson, setMeta, STREAK_MILESTONES } from '../lib/meta'

const KEYS = ['a', 'b', 'c', 'd']
type Item =
  | { kind: 'mc'; quest: Quest; correct?: string; explanation?: string; retry?: boolean }
  | { kind: 'local'; q: LocalQ; retry?: boolean }
interface Saved { answered: number; mistakes: number; xp: number; bonus: number; slot: number }
const SAVE = (id: string) => `pq.lesson.${id}`

/** Full-screen lesson: backend questions mixed with the other question types, a feedback sheet after each, then a summary. */
export default function Lesson() {
  const { id = '' } = useParams()
  const idx = NODES.findIndex(n => n.id === id)
  const node = NODES[idx]
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const { progress, saveProgress, refresh } = useSession()
  const { push } = useGameEvents()
  const replay = !!progress.nodes[id]
  // the running order: 'mc' pulls the next backend quest, numbers index the local questions
  const local = useRef(bankFor(Math.max(idx, 0), node?.type === 'boss' ? 3 : replay ? 4 : 2)).current
  const slots = useRef<('mc' | number)[]>(replay ? local.map((_, i) => i)
    : node?.type === 'boss' ? ['mc', 0, 'mc', 'mc', 1, 'mc', 2, 'mc'] : ['mc', 0, 'mc', 'mc', 1]).current
  const saved: Saved = JSON.parse(localStorage.getItem(SAVE(id)) ?? 'null') ?? { answered: 0, mistakes: 0, xp: 0, bonus: 0, slot: 0 }
  const slot = useRef(saved.slot)
  const [item, setItem] = useState<Item | null>(null)
  const [queue, setQueue] = useState<Item[]>([]) // wrong answers come back at the end
  const [answered, setAnswered] = useState(saved.answered)
  const [ans, setAns] = useState<Answer>(null)
  const [planBest, setPlanBest] = useState<'a' | 'b'>()
  const [fb, setFb] = useState<{ ok: boolean; correct: string; explanation: string; bonus: number } | null>(null)
  const [stats, setStats] = useState({ xp: saved.xp, mistakes: saved.mistakes, bonus: saved.bonus, streak: progress.streak })
  const [combo, setCombo] = useState(0)
  const [done, setDone] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [shake, setShake] = useState(0)
  const [checking, setChecking] = useState(false)
  const started = useRef(Date.now())
  const journal = useRef(progress.journal)

  const advance = useCallback(async (): Promise<boolean> => {
    while (slot.current < slots.length) {
      const s = slots[slot.current++]
      if (s === 'mc') {
        const q = await api.dailyQuest().catch(() => null)
        if (q && 'id' in q) { setItem({ kind: 'mc', quest: q }); return true }
        continue // backend has no quests left: the local ones still run
      }
      setItem({ kind: 'local', q: local[s] }); return true
    }
    return false
  }, [slots, local])
  useEffect(() => { advance().then(ok => { if (!ok) setEmpty(true) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ready = item && !fb && (item.kind === 'mc' ? ans !== null : isReady(item.q, ans))

  async function check() {
    if (!item || !ready) return
    let ok: boolean, correct: string, explanation: string, xp = 0
    if (item.kind === 'local') {
      ok = isCorrect(item.q, ans, planBest); explanation = item.q.why[lang]
      correct = answerText(item.q, lang, t('qt.true'), t('qt.false'), planBest)
    } else if (item.correct) { // a second try: the server already has the first answer
      correct = item.correct; explanation = item.explanation ?? ''; ok = ans === correct
    } else {
      setChecking(true)
      const r = await api.submitQuest(item.quest.id, ans as string).finally(() => setChecking(false))
      correct = r.correct_answer.toLowerCase(); explanation = r.explanation; ok = r.is_correct
      xp = r.xp_earned + r.streak.streak_bonus_xp
      journal.current = [...journal.current, { title: item.quest.title, correct: ok }]
      // a rest day carries the streak over a gap (device-side until the server supports it)
      const shield = getMeta().shield
      const streak = r.streak.current_streak === 1 && shield ? shield.streak + 1 : r.streak.current_streak
      if (shield) setMeta({ shield: null })
      if (STREAK_MILESTONES.includes(streak) && streak !== progress.streak) push({ kind: 'badge', title: t('meta.streakDays', { n: streak }), detail: t('meta.lanterns') })
      saveProgress({ streak, longest: Math.max(r.streak.longest_streak, streak), journal: journal.current, questDay: today() })
      setStats(s => ({ ...s, streak }))
      ;(r.new_badges as { name: string; description: string }[]).forEach(b => push({ kind: 'badge', title: b.name, detail: b.description }))
    }
    const first = !item.retry
    const nextCombo = ok ? combo + 1 : 0
    // focused streaks inside a lesson pay coins (server XP is the backend's to give)
    const bonus = ok && (nextCombo === 3 ? 5 : nextCombo === 5 ? 10 : 0)
    setCombo(nextCombo)
    setStats(s => ({ ...s, xp: s.xp + xp, mistakes: s.mistakes + (ok || !first ? 0 : 1), bonus: s.bonus + (bonus || 0) }))
    if (!ok) {
      setQueue(q => [...q, item.kind === 'mc' ? { ...item, correct, explanation, retry: true } : { ...item, retry: true }])
      setShake(s => s + 1); navigator.vibrate?.([30, 40, 30])
    } else navigator.vibrate?.(nextCombo >= 3 ? [15, 30, 15] : 15)
    play(ok ? 'good' : 'bad')
    setFb({ ok, correct: item.kind === 'mc' ? correct.toUpperCase() : correct, explanation, bonus: bonus || 0 })
  }

  async function next() {
    const a = answered + 1
    setFb(null); setAns(null); setPlanBest(undefined); setAnswered(a)
    localStorage.setItem(SAVE(id), JSON.stringify({ answered: a, mistakes: stats.mistakes, xp: stats.xp, bonus: stats.bonus, slot: slot.current }))
    if (await advance()) return
    if (queue.length) { setItem(queue[0]); setQueue(q => q.slice(1)); return }
    finish()
  }

  function finish() {
    localStorage.removeItem(SAVE(id))
    setDone(true); refresh()
    const stars = starsFor(stats.mistakes), acc = answered ? (answered - stats.mistakes) / answered : 1
    saveProgress({ nodes: { ...progress.nodes, [id]: Math.max(progress.nodes[id] ?? 0, stars) }, coins: progress.coins + (LESSON_COINS + stats.bonus) * (Date.now() < getMeta().boostUntil ? 2 : 1) })
    recordLesson({ accuracy: acc, xp: stats.xp })
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (done || !item) return
      const k = e.key.toLowerCase()
      if (!fb && item.kind === 'mc' && KEYS.includes(k) && item.quest.options[k]) { setAns(k); play('tick') }
      if (e.key === 'Enter') { e.preventDefault(); fb ? next() : check() }
    }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  })

  if (!node) return null
  const segs = Math.max(slots.length, answered + queue.length + (item ? 1 : 0))
  if (done) return <Summary xp={stats.xp} bonus={stats.bonus} mistakes={stats.mistakes} asked={answered} seconds={Math.round((Date.now() - started.current) / 1000)} streak={stats.streak}
    onContinue={() => nav('/home', { state: { walkFrom: idx, bossDone: node.type === 'boss' && !replay } })} />

  const key = item ? (item.kind === 'mc' ? item.quest.id : item.q.id) + (item.retry ? 'r' : '') : 'none'
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-[720px] items-center gap-3 px-5 pt-5">
        <button onClick={() => nav('/home')} aria-label={t('ls.close')} className="grid h-11 w-11 place-items-center rounded text-soft hover:text-ink"><X size={22} aria-hidden /></button>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={segs} aria-valuenow={answered}>
          {Array.from({ length: segs }, (_, i) => (
            <span key={i} className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-mist">
              <m.span className="absolute inset-0 origin-left rounded-full bg-forest" initial={false}
                animate={{ scaleX: i < answered ? 1 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} />
            </span>
          ))}
        </div>
        {combo >= 3 && <m.span key={combo} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`label rounded px-2 py-1 !text-on-forest ${combo >= 5 ? 'bg-amber shadow-[0_0_18px_rgb(var(--amber-soft))]' : 'bg-forest'}`}>{t('ls.combo', { n: combo })}</m.span>}
        <span className="label hidden sm:inline">{t('ls.focus')} {Math.max(0, 100 - stats.mistakes * 20)}</span>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-5 pb-48 pt-8">
        {empty && !item && <p className="font-serif text-2xl text-ink">{t('path.empty')}</p>}
        <AnimatePresence mode="wait">
          {item && (
            <m.div key={key} initial={{ opacity: 0, x: 40, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              <div key={shake} className={shake ? 'shake' : ''}>
                {item.retry && <Label className="mb-2 block">{t('ls.retry')}</Label>}
                {item.kind === 'local' ? (
                  <LocalQuestion key={key} q={item.q} value={ans} onChange={setAns} locked={!!fb} onPlanBest={setPlanBest} />
                ) : (
                  <>
                    <Label>{`${t('node.lesson', { n: node.n || 1 })} · ${item.quest.difficulty}`}</Label>
                    <h1 className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] leading-tight text-ink">{item.quest.title}</h1>
                    <p className="mt-3 text-[17px] leading-relaxed text-ink">{item.quest.description}</p>
                    <div role="radiogroup" className="mt-6 space-y-2.5">
                      {KEYS.filter(k => item.quest.options[k]).map(k => (
                        <button key={k} role="radio" aria-checked={ans === k} disabled={!!fb} onClick={() => { setAns(k); play('tick') }}
                          className={`row !min-h-[58px] ${fb && k.toUpperCase() === fb.correct ? '!border-forest !bg-haze' : ''} ${fb && !fb.ok && k === ans ? '!border-rust' : ''}`}>
                          <kbd className="label grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-paper !text-ink">{k}</kbd>
                          <span className="flex-1 py-3 text-[16px]">{item.quest.options[k]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-paper" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[720px] justify-end px-5 py-4">
          <button className={`btn game-btn w-full sm:w-auto sm:min-w-[180px] ${ready ? '' : '!bg-mist !text-soft'}`} disabled={!ready || checking} onClick={check}>
            <span className={checking ? 'invisible' : ''}>{t('ls.check')}</span>
            {checking && <span aria-hidden className="spin absolute h-5 w-5 rounded-full border-2 border-on-forest/40 border-t-on-forest" />}
          </button>
        </div>
      </footer>
      <AnimatePresence>
        {fb && (
          <m.div role="status" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed inset-x-0 bottom-0 overflow-hidden border-t-2 ${fb.ok ? 'border-forest bg-haze' : 'border-amber bg-[#FBEFDD] dark:bg-[#2E261A]'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {fb.ok && <span aria-hidden className="sweep" />}
            <div className="relative mx-auto flex max-w-[720px] flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`flex items-center gap-2 font-serif text-2xl ${fb.ok ? 'text-forest' : 'text-rust'}`}>
                  {fb.ok ? <Check size={22} aria-hidden /> : <X size={22} aria-hidden />}
                  {fb.ok ? t('q.correct') : `${t('ls.wrong')} ${t('q.answer', { x: fb.correct })}`}
                </p>
                <p className="mt-1 max-w-lg text-[15px] text-ink">{fb.explanation}</p>
                {fb.bonus > 0 && <p className="label mt-1 !text-rust">{t('ls.comboBonus', { n: fb.bonus })}</p>}
              </div>
              <button className={`btn game-btn ${fb.ok ? '' : 'game-btn-amber'} sm:min-w-[180px]`} onClick={next} autoFocus>{t('common.continue')}</button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Summary({ xp, bonus, mistakes, asked, seconds, streak, onContinue }: { xp: number; bonus: number; mistakes: number; asked: number; seconds: number; streak: number; onContinue: () => void }) {
  const { t } = useI18n()
  const shown = useCountUp(xp, 1100)
  const coins = useCountUp(LESSON_COINS + bonus, 900)
  const stars = starsFor(mistakes)
  const acc = asked ? Math.round(((asked - mistakes) / asked) * 100) : 100
  useEffect(() => { play('level'); navigator.vibrate?.([20, 60, 20, 60, 40]) }, [])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-paper px-5">
      <div className="w-full max-w-md text-center">
        <Label>{t('sum.road')}</Label>
        <h1 className="mt-2 text-[2.6rem] leading-none text-ink">{t('sum.title')}</h1>
        <div className="mt-7 flex justify-center gap-3" role="img" aria-label={`${stars} / 3`}>
          {[1, 2, 3].map(k => (
            <m.span key={k} initial={{ scale: 0, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.3 + k * 0.28, type: 'spring', stiffness: 260, damping: 12 }}>
              <Star size={46} strokeWidth={1.4} className={k <= stars ? 'fill-amber text-amber drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]' : 'text-line'} />
            </m.span>
          ))}
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[[t('sum.xp'), `+${Math.round(shown)}`], [t('sum.acc'), `${acc}%`], [t('sum.time'), `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`], [t('sum.coins'), `+${Math.round(coins)}`]].map(([k, v], i) => (
            <m.div key={k} className="hud p-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + i * 0.1 }}>
              <dt className="label">{k}</dt><dd className="num mt-1 text-2xl text-ink">{v}</dd>
            </m.div>
          ))}
        </dl>
        <p className="label mt-4">{t('home.streak')} {streak}</p>
        <button className="btn game-btn mt-8 w-full" onClick={onContinue} autoFocus>{t('common.continue')}</button>
      </div>
    </div>
  )
}
