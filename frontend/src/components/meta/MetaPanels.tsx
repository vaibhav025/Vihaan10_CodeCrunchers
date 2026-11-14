import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Package } from '../ui/icons'
import { Flame, Label, XpBar } from '../ui/kit'
import { useI18n } from '../../lib/i18n'
import { today, useSession } from '../../lib/session'
import { useMeta } from '../../lib/useMeta'
import { DAY_CHEST, DEMOTE_XP, LEAGUES, PROMOTE_XP, SHOP, setMeta } from '../../lib/meta'
import { api, type Rank } from '../../lib/api'
import { play } from '../../lib/sound'

/** Three daily quests, each a link to where it is done; finishing all of them opens the day chest. */
export function DailyQuests() {
  const { t } = useI18n()
  const { progress, saveProgress } = useSession()
  const meta = useMeta()
  const quests = [
    { k: 'dq.tracker', to: '/tracker', done: progress.simDay === today() },
    { k: 'dq.lab', to: '/lab', done: meta.labDay === today() },
    { k: 'dq.coach', to: '/coach', done: meta.coachDay === today() },
  ]
  const n = quests.filter(q => q.done).length, all = n === quests.length
  return (
    <section aria-labelledby="dq-h" className="hud p-5">
      <div className="flex items-baseline justify-between gap-3"><h2 id="dq-h" className="label">{t('dq.title')}</h2><span className="label" aria-live="polite">{t('dq.count', { n })}</span></div>
      <XpBar pct={Math.round((n / quests.length) * 100)} className="mt-2.5" />
      <ul className="mt-2">{quests.map(q => (
        <li key={q.k}>
          <Link to={q.to} className="-mx-2 flex min-h-[44px] items-center gap-2.5 rounded-lg px-2 text-[15px] transition-colors hover:bg-ink/[0.06]">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${q.done ? 'border-up bg-up text-black' : 'border-soft/60'}`}>{q.done && <Check size={13} strokeWidth={3} aria-hidden />}</span>
            <span className={`flex-1 ${q.done ? 'text-soft line-through' : 'text-ink'}`}>{t(q.k)}</span>
            <ChevronRight size={15} className="shrink-0 text-soft" aria-hidden />
          </Link>
        </li>))}
      </ul>
      {meta.dayChestClaimed ? <p className="label mt-3">{t('dq.chestDone', { c: DAY_CHEST.coins, t: DAY_CHEST.tokens })}</p> : (<>
        <button disabled={!all} aria-describedby={all ? undefined : 'dq-why'} className="btn-quiet mt-3 w-full gap-2" onClick={() => {
          play('level'); setMeta({ dayChestClaimed: true, restTokens: meta.restTokens + DAY_CHEST.tokens })
          saveProgress({ coins: progress.coins + DAY_CHEST.coins })
        }}><Package size={17} aria-hidden />{t('dq.chest')}</button>
        {!all && <p id="dq-why" className="mt-2 text-center text-[13px] text-soft">{t('dq.why')}</p>}
      </>)}
    </section>
  )
}

export function GoalRing() {
  const { t } = useI18n()
  const meta = useMeta()
  const pct = Math.min(meta.lessonsToday / meta.goal, 1)
  return (
    <div className="hud flex items-center gap-4 p-5">
      <svg width="58" height="58" viewBox="0 0 58 58" className="-rotate-90" aria-hidden>
        <circle cx="29" cy="29" r="24" fill="none" className="stroke-line" strokeWidth="5" />
        <circle cx="29" cy="29" r="24" fill="none" className="stroke-forest" strokeWidth="5" strokeLinecap="round" strokeDasharray={150.8} strokeDashoffset={150.8 * (1 - pct)} />
      </svg>
      <div><Label>{t('goal.title')}</Label><p className="mt-1 font-serif text-xl text-ink">{t('goal.lessons', { d: Math.min(meta.lessonsToday, meta.goal), n: meta.goal })}</p></div>
    </div>
  )
}

/** Calm warning when today's streak is not yet kept, and the re-engagement banner after a gap. */
export function StreakNotes({ gap }: { gap: number }) {
  const { t } = useI18n()
  const { progress } = useSession()
  const meta = useMeta()
  const [msg, setMsg] = useState<string | null>(null)
  const atRisk = progress.streak > 0 && progress.questDay !== today()
  return (
    <div className="space-y-3">
      {gap >= 2 && !meta.shield && (
        <div className="hud p-5">
          <p className="font-serif text-2xl text-ink">{t('meta.miss')}</p>
          <p className="mt-1 text-soft">{t('meta.missSub', { n: gap })}</p>
          <button className="btn game-btn mt-4" onClick={() => {
            if (meta.restTokens < 1) { setMsg(t('meta.noTokens')); return }
            setMeta({ restTokens: meta.restTokens - 1, shield: { streak: progress.streak, day: today() } }); setMsg(t('meta.restored')); play('good')
          }}>{t('meta.restore')}</button>
          {msg && <p role="status" className="label mt-3 !normal-case !tracking-normal">{msg}</p>}
        </div>
      )}
      {atRisk && gap < 2 && <p className="label inline-flex items-center gap-1.5 rounded border border-amber/60 bg-card px-2.5 py-1.5 !text-rust"><Flame size={13} />{t('meta.atRisk')}</p>}
    </div>
  )
}

export function League({ compact }: { compact?: boolean }) {
  const { t } = useI18n()
  const { user } = useSession()
  const meta = useMeta()
  const [rows, setRows] = useState<Rank[]>([])
  useEffect(() => { api.leaderboard('national').then(r => setRows(r.leaderboard.slice(0, compact ? 5 : 30))).catch(() => {}) }, [compact])
  return (
    <div className="hud p-5">
      <div className="flex items-baseline justify-between"><Label>{t('lg.title')}</Label><span className="font-serif text-lg text-ink">{LEAGUES[meta.league]}</span></div>
      <p className="label mt-2">{t('lg.week')} · {meta.weekXp} XP</p>
      <XpBar pct={Math.min(100, Math.round((meta.weekXp / PROMOTE_XP) * 100))} className="mt-2" />
      <ol className="mt-3 divide-y divide-line">{rows.map((r, i) => (
        <li key={i} className={`flex items-baseline gap-3 py-1.5 text-[14px] ${r.user_id === user?.id ? 'font-medium' : ''}`}>
          <span className="label w-5">{i + 1}</span><span className="flex-1 truncate text-ink">{r.user_id === user?.id ? user?.name : String(r.name ?? '—')}</span><span className="num text-ink">{Math.round(Number(r.xp ?? 0))}</span>
        </li>))}
      </ol>
      {!compact && <><p className="mt-3 text-[13px] text-soft">{t('lg.rules')}</p><p className="mt-1 text-[13px] text-soft">{t('lg.preview')}</p></>}
      <span className="sr-only">{PROMOTE_XP} {DEMOTE_XP}</span>
    </div>
  )
}

export function FriendQuest() {
  const { t } = useI18n()
  const { user } = useSession()
  const meta = useMeta()
  const [copied, setCopied] = useState(false)
  return (
    <div className="hud p-5">
      <Label>{t('fq.title')}</Label>
      <p className="mt-2 text-[15px] text-ink">{t('fq.goal')}</p>
      <XpBar pct={Math.min(100, meta.weekLessons * 5)} className="mt-3" />
      <p className="label mt-2">{t('fq.you', { n: meta.weekLessons })} / 20</p>
      <button className="link mt-1" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/?ref=${user?.id ?? ''}`); setCopied(true) }}>{copied ? t('fq.copied') : t('fq.invite')}</button>
      <p className="text-[13px] text-soft">{t('fq.note')}</p>
    </div>
  )
}

export function Shop() {
  const { t } = useI18n()
  const { progress, saveProgress } = useSession()
  const meta = useMeta()
  const [msg, setMsg] = useState<string | null>(null)
  const buy = (id: string, price: number, kind: string) => {
    if (progress.coins < price) { setMsg(t('shop.short')); play('bad'); return }
    saveProgress({ coins: progress.coins - price }); play('good'); setMsg(null)
    if (kind === 'token') setMeta({ restTokens: meta.restTokens + 1 })
    else if (kind === 'boost') setMeta({ boostUntil: Date.now() + 15 * 60_000 })
    else setMeta({ owned: [...meta.owned, id], equipped: [...meta.equipped, id] })
  }
  return (
    <section aria-labelledby="shop" className="border-t border-line pt-6">
      <div className="flex items-baseline justify-between">
        <h2 id="shop" className="text-[1.9rem] text-ink">{t('shop.title')}</h2>
        <Label>{t('meta.tokens')} · {meta.restTokens}</Label>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{SHOP.map(s => {
        const owned = meta.owned.includes(s.id), worn = meta.equipped.includes(s.id)
        return (
          <li key={s.id} className="hud flex flex-col justify-between gap-3 p-4">
            <div><p className="font-serif text-lg text-ink">{t(`shop.${s.id}`)}</p>
              <p className="text-[13px] text-soft">{s.kind === 'boost' ? t('shop.boostSub') : s.kind === 'cosmetic' ? t('shop.cosSub') : t('meta.restore')}</p></div>
            {owned ? (
              <button className="link" onClick={() => setMeta({ equipped: worn ? meta.equipped.filter(x => x !== s.id) : [...meta.equipped, s.id] })}>{worn ? t('shop.remove') : t('shop.wear')}</button>
            ) : <button className="btn-quiet self-start" onClick={() => buy(s.id, s.price, s.kind)}>{t('shop.buy', { p: s.price })}</button>}
          </li>)
      })}</ul>
      {msg && <p role="status" className="mt-3 text-rust">{msg}</p>}
    </section>
  )
}
