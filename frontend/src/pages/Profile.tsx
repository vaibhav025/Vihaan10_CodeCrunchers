import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Coins, Star, Users, X } from '../components/ui/icons'
import { AnimatePresence, m } from 'framer-motion'
import { spring } from '../ui/motion'
import WorldStill from '../components/world/WorldStill'
import { Flame, Label, StateChip, XpBar } from '../components/ui/kit'
import { LANGS, useI18n, type Lang } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useTheme } from '../lib/theme'
import { api, type Contribution, type Rank } from '../lib/api'
import { BADGES, LEVEL_TITLES, levelInfo, monthlyIncome, recommended, type BadgeGroup } from '../lib/game'
import { project } from '../lib/nps'
import { pad2, rupees } from '../lib/format'
import { loadFonts } from '../lib/fonts'
import { FriendQuest, League, Shop } from '../components/meta/MetaPanels'
import { setReduceMotion, useReduceMotion } from '../lib/motionPref'
import CountUp from '../ui/CountUp'
import { getMoney } from '../lib/tracker'
import { readiness } from '../lib/readiness'
import { useMeta } from '../lib/useMeta'
import Tilt from '../ui/Tilt'
import Segmented from '../ui/Segmented'
import { useToast } from '../ui/Toast'
import { useInView } from '../ui/Reveal'
import { Skeleton } from '../ui/PressableCard'
import { lazy, Suspense } from 'react'
import { canRunLive } from '../components/world/World'
const TrophyShelf = lazy(() => import('../components/profile/TrophyShelf'))
import { palette, stateColor, stateVitality } from '../design-tokens'

const GLYPH: Record<BadgeGroup, (p: { size: number }) => ReactNode> = {
  learning: p => <BookOpen {...p} strokeWidth={1.2} aria-hidden />,
  streak: p => <Flame {...p} />,
  contribution: p => <Coins {...p} strokeWidth={1.2} aria-hidden />,
  social: p => <Users {...p} strokeWidth={1.2} aria-hidden />,
  special: p => <Star {...p} strokeWidth={1.2} aria-hidden />,
}

export default function Profile() {
  const { t, lang, setLang } = useI18n()
  const { user, progress, refresh, reset } = useSession()
  const [editing, setEditing] = useState(false)
  const [theme, setTheme] = useTheme()
  const reduce = useReduceMotion()
  const meta = useMeta()
  const nav = useNavigate()
  const [earned, setEarned] = useState<string[]>([])
  const [history, setHistory] = useState<{ contributions: Contribution[]; total: number; count: number } | null>(null)
  const [board, setBoard] = useState('national')
  const [ranks, setRanks] = useState<{ leaderboard: Rank[]; user_rank: Rank | null } | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const loadHistory = useCallback(() => api.history().then(setHistory).catch(() => {}), [])
  useEffect(() => { loadHistory(); api.badges().then(b => setEarned(b.badges.map(x => x.name))).catch(() => {}) }, [loadHistory])
  useEffect(() => { setRanks(null); api.leaderboard(board).then(setRanks).catch(() => setRanks({ leaderboard: [], user_rank: null })) }, [board])

  const toast = useToast()
  const [fresh, setFresh] = useState<string[]>([])
  useEffect(() => {
    if (!earned.length) return
    const seen: string[] = JSON.parse(localStorage.getItem('pq.seenBadges') ?? '[]')
    const added = earned.filter(e => !seen.includes(e))
    if (added.length) { setFresh(added); added.forEach(a => toast(`${t('pro.unlocked')}: ${a}`)); localStorage.setItem('pq.seenBadges', JSON.stringify(earned)) }
  }, [earned]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null
  const lv = levelInfo(user.total_xp)
  const have: Record<string, number | undefined> = {
    quests: progress.journal.filter(j => j.correct).length, streak: progress.streak,
    contributions: history?.count, total: history?.total,
  }

  async function log(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!(n > 0)) { setNote({ ok: false, text: t('pro.amountErr') }); return }
    setBusy(true); setNote(null)
    try {
      const r = await api.contribute(n)
      setAmount(''); setNote({ ok: true, text: t('pro.logged', { state: t(`state.${r.avatar_state}`) }) })
      await Promise.all([refresh(), loadHistory()])
      api.leaderboard(board).then(setRanks).catch(() => {})
      api.badges().then(b => setEarned(b.badges.map(x => x.name))).catch(() => {})
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : String(err) }) }
    finally { setBusy(false) }
  }

  const monthly = history?.count ? history.total / history.count : recommended(user.income_range)
  const returnPct = user.risk_profile === 'conservative' ? 8 : user.risk_profile === 'aggressive' ? 12 : 10
  const pension = project({ age: user.age, retireAge: user.retirement_age, monthly, returnPct, annualIncome: monthlyIncome(user.income_range) * 12 }).monthly_pension

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-12 px-5 sm:px-8">
      {/* player card: who you are in the game, on a deep forest stage */}
      <header className="band p-6 sm:p-9">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="relative mx-auto h-[132px] w-[132px] lg:mx-0">
            <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="66" cy="66" r="60" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="6" />
              <circle cx="66" cy="66" r="60" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeDasharray={377} strokeDashoffset={377 * (1 - lv.pct / 100)} />
            </svg>
            <Avatar wear={meta.equipped} />
            <span className="num absolute -bottom-1 -right-1 grid h-11 w-11 place-items-center rounded-full bg-[#FFFFFF] text-[22px] text-[#0A0A0A] ring-4 ring-[#0A0A0A]">{lv.level}</span>
          </div>
          <div className="min-w-0 text-center lg:text-left">
            <Label>{t('pro.title')}</Label>
            <h1 className={`mt-1 leading-[1.05] [overflow-wrap:anywhere] ${user.name.length > 16 ? 'text-[clamp(1.8rem,3.4vw,2.6rem)]' : 'text-[clamp(2.4rem,5vw,3.8rem)]'}`} title={user.name}>{user.name}</h1>
            <button onClick={() => setEditing(true)} className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/25 px-3.5 text-[14px] text-[#FFFFFF] transition-colors hover:border-[#FFFFFF] hover:bg-white/5 focus-visible:border-[#FFFFFF]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>Edit profile
            </button>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <StateChip state={user.avatar_state} />
              <Label>{t('pro.level', { n: pad2(lv.level) })} · {lv.title}</Label>
            </div>
            <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/15 lg:mx-0" role="progressbar" aria-valuenow={lv.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full origin-left rounded-full bg-[#FFFFFF] transition-transform duration-700" style={{ transform: `scaleX(${lv.pct / 100})` }} />
            </div>
            <p className="label mt-2">{lv.next ? t('home.toNext', { xp: lv.toNext, title: LEVEL_TITLES[lv.level] }) : t('home.max')}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 lg:gap-3">
            {[[t('pro.xp'), user.total_xp], [t('home.streak'), progress.streak], [t('tr.score'), readiness(getMoney(), Math.max(user.retirement_age - user.age, 0)).score], [t('path.coins'), progress.coins]].map(([k, v]) => (
              <div key={k as string} className="tile px-3 py-3 text-center lg:min-w-[124px] lg:px-4 lg:text-left">
                <dt className="label truncate">{k}</dt><dd className="num mt-1 text-[1.9rem] leading-none"><CountUp value={v as number} /></dd>
              </div>
            ))}
          </dl>
        </div>
        {/* this week's lanterns */}
        <div className="relative z-10 mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
          <Label className="shrink-0">{t('home.lanterns')}</Label>
          <div className="flex flex-1 gap-2" role="img" aria-label={`${Math.min(progress.streak, 7)} / 7`}>
            {Array.from({ length: 7 }, (_, i) => <span key={i} className={`h-3 flex-1 rounded-full ${i < progress.streak ? 'bg-[#FFFFFF] shadow-[0_0_14px_rgb(240_182_122/0.8)]' : 'bg-white/10'}`} />)}
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)]">
        <ShareCard name={user.name} state={user.avatar_state} level={lv.level} title={lv.title} pension={pension} road={progress.journal.length / 10} />
        <section aria-labelledby="ins">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="ins" className="text-[1.9rem] text-ink">{t('pro.badges')}</h2>
            <Label>{t('pro.earned', { n: earned.length, total: BADGES.length })}</Label>
          </div>
          {/* the shelf shows what is earned; empty, it repeats the grid below as grey outlines */}
          {canRunLive() && earned.length > 0 && <Suspense fallback={<div className="h-[190px]" />}><TrophyShelf earned={BADGES.map(b => earned.includes(b.name))} total={BADGES.length} /></Suspense>}
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
            {BADGES.map(b => <Medal key={b.name} b={b} got={earned.includes(b.name)} fresh={fresh.includes(b.name)} have={have[b.trigger]} />)}
          </ul>
        </section>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="con">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="con" className="text-[1.9rem] text-ink">{t('pro.contrib')}</h2>
            <Label>{t('pro.total')} · {rupees(history?.total ?? 0)}</Label>
          </div>
          <form onSubmit={log} className="mt-5" noValidate>
            <label htmlFor="amt" className="label">{t('pro.amount')}</label>
            <div className="mt-1.5 flex gap-2">
              <input id="amt" className="field flex-1" inputMode="numeric" value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^\d]/g, '')); setNote(null) }}
                aria-invalid={note && !note.ok ? true : undefined} aria-describedby="amt-note" />
              <button className="btn" disabled={busy}>{t('pro.log')}</button>
            </div>
            <p id="amt-note" role={note && !note.ok ? 'alert' : 'status'} className={`mt-2 min-h-[1.5em] text-[14px] ${note ? (note.ok ? 'text-ink' : 'text-rust') : 'text-soft'}`}>
              {note ? note.text : t('pro.payNote')}
            </p>
          </form>
          {history && history.count === 0 ? <div className="mt-3 flex items-center gap-4"><WorldStill vitality={0.1} className="h-20 w-24 shrink-0 opacity-70" /><p className="text-soft">{t('pro.none')}</p></div> : (
            <ol className="mt-3 divide-y divide-line border-y border-line">
              {history?.contributions.slice(0, 6).map(c => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <Label>{c.contributed_at ? new Date(c.contributed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} · FY {c.financial_year}</Label>
                  <span className="num text-xl text-ink">{rupees(c.amount)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="brd">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="brd" className="text-[1.9rem] text-ink">{t('pro.board')}</h2>
            <div role="radiogroup" aria-label={t('pro.board')} className="flex">
              {['national', 'streak', 'contribution'].map(b => (
                <button key={b} role="radio" aria-checked={board === b} onClick={() => setBoard(b)}
                  className={`label h-11 border-b px-2.5 ${board === b ? 'border-forest !text-ink' : 'border-transparent'}`}>{t(`board.${b}`)}</button>
              ))}
            </div>
          </div>
          {!ranks ? <div className="mt-4 space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div> : ranks.leaderboard.length === 0 ? (
            <p className="mt-5 text-soft">{t('pro.boardEmpty')}</p>
          ) : (
            <ol className="mt-3 divide-y divide-line">
              {ranks.leaderboard.map((r, i) => (
                <li key={i} className="flex items-baseline gap-4 py-2.5">
                  <Label>{pad2(Number(r.rank ?? i + 1))}</Label>
                  <span className="flex-1 text-ink">{String(r.name ?? '—')}</span>
                  <span className="num text-xl text-ink">{Math.round(Number(r.score ?? r.xp ?? 0))}</span>
                </li>
              ))}
            </ol>
          )}
          {ranks?.user_rank?.rank != null && <p className="label mt-3">{t('pro.rank')} · {pad2(Number(ranks.user_rank.rank))}</p>}
        </section>
      </div>

      <Shop />
      <div className="grid gap-4 md:grid-cols-2"><League /><FriendQuest /></div>

      <section aria-labelledby="set" className="border-t border-line pt-6">
        <h2 id="set" className="text-[1.9rem] text-ink">{t('pro.settings')}</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="label">{t('pro.lang')}</legend>
            <Segmented label={t('pro.lang')} options={LANGS} value={lang} onChange={(l: Lang) => { setLang(l); api.update({ language: l }).catch(() => {}) }} />
          </fieldset>
          <fieldset>
            <legend className="label">{t('pro.theme')}</legend>
            <Segmented label={t('pro.theme')} options={[{ id: 'light' as const, name: t('pro.light') }, { id: 'dark' as const, name: t('pro.dark') }]} value={theme} onChange={setTheme} />
          </fieldset>
        </div>
        <label className="mt-6 flex items-center gap-3 text-ink"><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--forest))]" checked={reduce} onChange={e => setReduceMotion(e.target.checked)} />{t('set.reduce')}</label>
        <label className="mt-5 flex items-start gap-3 text-ink"><input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--forest))]" checked={user.ai_consent} onChange={e => { const value = e.target.checked; api.update({ ai_consent: value }).then(() => refresh()).catch(() => {}) }} /><span><strong>Allow AI coach provider</strong><span className="block text-sm text-soft">With consent, an AI model helps word the answers. It sees your question with amounts and IDs masked, never your figures: those are filled in on our server.</span></span></label>
        <label className="mt-5 flex items-start gap-3 text-ink"><input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--forest))]" checked={user.show_on_leaderboard} onChange={e => { const value = e.target.checked; api.update({ show_on_leaderboard: value }).then(() => refresh()).catch(() => {}) }} /><span>Show me on the leaderboard using my public handle</span></label>
        <label className="mt-3 block text-sm text-soft">Public handle<input className="field mt-1" maxLength={32} placeholder="SavvyTiger42" defaultValue={user.public_handle ?? ''} onBlur={e => api.update({ public_handle: e.target.value || null }).catch(() => {})} /></label>
        <button className="link mt-6" onClick={() => { if (window.confirm(`${t('pro.reset')}? ${t('pro.resetNote')}`)) { reset(); nav('/') } }}>{t('pro.reset')}</button>
        <p className="text-[13px] text-soft">{t('pro.resetNote')}</p>
      </section>
      <AnimatePresence>{editing && <EditProfile onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh() }} />}</AnimatePresence>
    </div>
  )
}

/** Poster of the player's standing, drawn to a canvas so it can be saved as an image. */
function ShareCard({ name, state, level, title, pension, road }: {
  name: string; state: keyof typeof stateVitality; level: number; title: string; pension: number; road: number
}) {
  const { t } = useI18n()
  const canvas = useRef<HTMLCanvasElement>(null)
  const still = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    const draw = async () => {
      const cv = canvas.current, svg = still.current?.querySelector('svg')
      if (!cv || !svg) return
      await loadFonts()
      await document.fonts.ready
      const W = 1080, H = 1350, ctx = cv.getContext('2d')!
      ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, W, H)
      const glow = ctx.createRadialGradient(W * 0.9, 0, 0, W * 0.9, 0, 900)
      glow.addColorStop(0, '#FFFAE8'); glow.addColorStop(1, 'rgba(255,250,232,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = palette.ink; ctx.lineWidth = 2; ctx.strokeRect(48, 48, W - 96, H - 96)

      // the live 3D frame from the player's last visit to the path, or the still drawing
      const frame = localStorage.getItem('pq.worldFrame')
      const img = new Image()
      const xml = new XMLSerializer().serializeToString(svg)
      await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = frame ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}` })
      if (!live) return
      if (frame) { const h = 860 * img.height / Math.max(img.width, 1); ctx.drawImage(img, 110, 420 + Math.max(0, (654 - h) / 2), 860, Math.min(h, 654)) }
      else ctx.drawImage(img, 110, 420, 860, 654)

      const mono = (s: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
        // tracked caps sized to stay readable when the card is shown small, shrunk to fit the frame
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        const text = s.toUpperCase(), max = W - 192
        let size = 30
        const set = () => { ctx.font = `500 ${size}px "IBM Plex Mono", monospace`; c.letterSpacing = `${Math.round(size * 0.12)}px` }
        set()
        while (ctx.measureText(text).width > max && size > 16) { size--; set() }
        ctx.fillStyle = palette.soft; ctx.textAlign = align
        ctx.fillText(text, x, y)
        c.letterSpacing = '0px'
      }
      mono('SixtyFy', 96, 128); mono(`Level ${pad2(level)}`, W - 96, 128, 'right')
      ctx.fillStyle = palette.ink; ctx.textAlign = 'left'
      ctx.font = '400 104px "Newsreader Variable", "Noto Serif Devanagari", serif'
      ctx.fillText(name.length > 14 ? `${name.slice(0, 13)}…` : name, 96, 280)
      ctx.font = 'italic 400 64px "Newsreader Variable", serif'; ctx.fillStyle = palette.leaf
      ctx.fillText('at sixty.', 96, 360)
      ctx.fillStyle = stateColor[state]; ctx.fillRect(96, 400, 14, 14)
      mono(`${t(`state.${state}`)} · ${title}`, 124, 414)

      mono(t('land.pension'), 96, 1112)
      ctx.font = '400 96px "Newsreader Variable", serif'; ctx.fillStyle = palette.ink; ctx.textAlign = 'left'
      ctx.fillText(rupees(pension), 96, 1206)
      mono(t('common.disclaimer'), 96, 1268)
    }
    draw()
    return () => { live = false }
  }, [name, state, level, title, pension, t])

  const share = () => {
    canvas.current?.toBlob(async blob => {
      if (!blob) return
      const file = new File([blob], 'pensionquest-future-self.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
      if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'SixtyFy' }).catch(() => {})
      else save()
    })
  }
  const save = () => {
    const a = document.createElement('a')
    a.download = 'pensionquest-future-self.png'
    a.href = canvas.current!.toDataURL('image/png')
    a.click()
  }

  return (
    <section aria-labelledby="card" className="h-fit lg:sticky lg:top-24">
      <h2 id="card" className="text-[1.9rem] text-ink">{t('pro.card')}</h2>
      <p className="mt-1 text-soft">{t('pro.cardSub')}</p>
      <Tilt max={8} glare className="mt-4 overflow-hidden rounded-lg">
        <canvas ref={canvas} width={1080} height={1350} className="block w-full rounded-lg border border-line shadow-lift"
          role="img" aria-label={`${name}. ${t(`state.${state}`)}. ${title}. ${t('land.pension')}: ${rupees(pension)}`} />
      </Tilt>
      <div className="sticky bottom-20 mt-4 flex gap-2 md:static">
        <button className="btn flex-1" onClick={save}>{t('pro.download')}</button>
        <button className="btn-quiet flex-1 !min-h-[48px]" onClick={share}>{t('pro.share')}</button>
      </div>
      <div ref={still} hidden><WorldStill vitality={stateVitality[state]} road={Math.max(road, level / 7)} level={level} /></div>
    </section>
  )
}

/** An insignia: metallic and glowing when earned, an outline with a progress ring when locked. */
function Medal({ b, got, fresh, have }: { b: (typeof BADGES)[number]; got: boolean; fresh: boolean; have?: number }) {
  const { t } = useI18n()
  const [ref, seen] = useInView<HTMLLIElement>()
  const Icon = GLYPH[b.group]
  const pct = have === undefined ? null : Math.min(have / b.value, 1)
  const C = 2 * Math.PI * 38
  return (
    <li ref={ref} className="medal group relative flex flex-col items-center text-center">
      <button className={`relative grid h-[84px] w-[84px] place-items-center rounded-full transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105 ${fresh && seen ? 'medal-new' : ''}`}
        aria-describedby={`tip-${b.trigger}-${b.value}`}>
        {got ? (
          <span className={`absolute inset-[6px] overflow-hidden rounded-full border border-[#A97C2C] bg-[radial-gradient(circle_at_35%_30%,#F6DDA0,#F2B544_55%,#9C6F22)] text-[#1A1304] shadow-[0_0_24px_rgb(var(--amber-soft)/0.65)] ${seen ? 'shine' : ''}`}>
            <span className="absolute inset-[5px] rounded-full border border-[#FFF3D0]/50" />
          </span>
        ) : <span className="absolute inset-[6px] rounded-full border border-dashed border-soft/60" />}
        {!got && pct !== null && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 84 84" aria-hidden>
            <circle cx="42" cy="42" r="38" fill="none" className="stroke-line" strokeWidth="2.5" />
            <circle cx="42" cy="42" r="38" fill="none" className="stroke-forest" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
        )}
        <span className={`relative ${got ? 'text-[#1A1304]' : 'text-soft'}`}><Icon size={26} /></span>
      </button>
      <span className="mt-2.5 font-serif text-[17px] leading-tight text-ink">{b.name}</span>
      <span className="label mt-1">{got ? t('pro.unlocked') : pct !== null ? `${Math.floor(have!)} / ${b.value}` : t('pro.locked')}</span>
      <span id={`tip-${b.trigger}-${b.value}`} role="tooltip" className="surface-float pointer-events-none absolute -top-2 left-1/2 z-20 w-44 -translate-x-1/2 -translate-y-full rounded-md px-3 py-2 text-[13px] text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">{b.description}</span>
    </li>
  )
}

/** Future You as a portrait, wearing whatever is equipped from the shop. */
function Avatar({ wear }: { wear: string[] }) {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-[10px] rounded-full bg-[#18181B]" aria-hidden>
      <path d="M22 120c2-26 18-38 38-38s36 12 38 38Z" fill="#4C6A58" />
      {wear.includes('scarf') && <path d="M40 84c6 8 34 8 40 0l3 9c-10 9-36 9-46 0Z" fill="#E8654F" />}
      <circle cx="60" cy="56" r="24" fill="#D9B99B" />
      <path d="M36 54c-2-22 12-32 24-32s26 10 24 32c-6-12-14-17-24-17s-18 5-24 17Z" fill="#E4E4DE" />
      {wear.includes('glasses') && <g fill="none" stroke="#2B2B28" strokeWidth="2.2"><circle cx="50" cy="58" r="7" /><circle cx="70" cy="58" r="7" /><path d="M57 58h6" /></g>}
      <path d="M52 68c5 4 11 4 16 0" fill="none" stroke="#8A6A52" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Edit the account basics: name, mobile, age, retirement age and risk preference. */
function EditProfile({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useSession()
  const toast = useToast()
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', age: String(user?.age ?? 25), retirement_age: String(user?.retirement_age ?? 60), risk_profile: user?.risk_profile ?? 'moderate' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const age = Number(f.age), ret = Number(f.retirement_age)
  const problems = [f.name.trim().length < 2 && 'Enter your name (at least 2 letters).', f.phone && !/^[6-9]\d{9}$/.test(f.phone) && 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.', (age < 18 || age > 100) && 'Age must be between 18 and 100.', (ret < 50 || ret > 75) && 'Retirement age must be between 50 and 75.', ret <= age && 'Retirement age must be more than your current age.'].filter(Boolean) as string[]
  async function save(e: FormEvent) {
    e.preventDefault(); if (problems.length) { setErr(problems[0]); return }
    setBusy(true); setErr(null)
    try {
      await api.update({ name: f.name.trim(), age, retirement_age: ret, risk_profile: f.risk_profile, ...(f.phone ? { phone: f.phone } : {}) })
      toast('Profile updated'); onSaved()
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); setBusy(false) }
  }
  const input = (id: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <div><label htmlFor={`ep-${id}`} className="label">{label}</label><input id={`ep-${id}`} className="field mt-1.5" value={f[id]} onChange={e => setF({ ...f, [id]: id === 'name' ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, id === 'phone' ? 10 : 3) })} {...props} /></div>
  )
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid items-end overflow-y-auto bg-[#000000]/60 sm:place-items-center" onClick={onClose}>
      <m.form role="dialog" aria-modal="true" aria-labelledby="ep-h" onSubmit={save} noValidate initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={spring}
        onClick={e => e.stopPropagation()} className="surface-float w-full rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3"><h2 id="ep-h" className="text-[1.8rem] text-ink">Edit profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded text-soft hover:text-ink"><X size={20} /></button></div>
        <div className="mt-4 grid gap-4">
          {input('name', 'Name', { autoComplete: 'name', maxLength: 60, autoFocus: true })}
          <div><label htmlFor="ep-phone" className="label">Mobile number</label>
            <div className="relative mt-1.5"><span className="num pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft">+91</span>
              <input id="ep-phone" type="tel" inputMode="numeric" className="field !pl-14" value={f.phone} placeholder="98765 43210" onChange={e => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div></div>
          <div className="grid grid-cols-2 gap-3">{input('age', 'Current age', { inputMode: 'numeric' })}{input('retirement_age', 'Retirement age', { inputMode: 'numeric' })}</div>
          <div role="radiogroup" aria-label="Risk preference"><span className="label">Risk preference</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">{(['conservative', 'moderate', 'aggressive'] as const).map(r => (
              <button key={r} type="button" role="radio" aria-checked={f.risk_profile === r} onClick={() => setF({ ...f, risk_profile: r })} className={`min-h-[44px] rounded-md border text-[14px] capitalize transition-colors ${f.risk_profile === r ? 'border-forest bg-forest text-on-forest' : 'border-line bg-card text-ink hover:border-forest'}`}>{r}</button>
            ))}</div></div>
          <p className="text-[13px] text-soft">Email: {user?.email} (used to sign in, can't be changed here)</p>
        </div>
        {err && <p role="alert" className="mt-4 text-[14px] text-rust">{err}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" className="link" onClick={onClose}>Cancel</button><button className="btn game-btn min-w-[140px]" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </m.form>
    </m.div>
  )
}
