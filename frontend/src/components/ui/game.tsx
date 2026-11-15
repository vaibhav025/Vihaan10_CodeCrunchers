import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { CoinIcon, Volume2, VolumeX } from './icons'
import { Flame, Label, StateChip, useCountUp } from './kit'
import Term from './Term'
import { useI18n } from '../../lib/i18n'
import { useSession } from '../../lib/session'
import { useGameEvents } from '../../lib/events'
import { levelInfo } from '../../lib/game'
import { pad2 } from '../../lib/format'
import { setSound, soundOn } from '../../lib/sound'
import { loadFonts } from '../../lib/fonts'
import { today } from '../../lib/session'

/** Opening screen: holds until fonts and the saved session are ready. */
export function Boot({ ready }: { ready: boolean }) {
  const [minTime, setMinTime] = useState(false)
  const [fonts, setFonts] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setMinTime(true), 1300)
    loadFonts().then(() => setFonts(true))
    return () => clearTimeout(id)
  }, [])
  const done = ready && fonts && minTime
  return (
    <AnimatePresence>
      {!done && (
        <m.div
          exit={{ opacity: 0 }} transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-paper" role="status" aria-label="Loading SixtyFy"
        >
          <div className="flex flex-col items-center">
            <svg width="150" height="120" viewBox="0 0 150 120" aria-hidden>
              <g className="boot-tile" style={{ animationDelay: '0s' }}><path d="M75 96 20 68v10l55 28 55-28V68Z" fill="#8E7054" /></g>
              <g className="boot-tile" style={{ animationDelay: '.18s' }}><path d="M75 84 20 56v12l55 28 55-28V56Z" fill="#B98E66" /></g>
              <g className="boot-tile" style={{ animationDelay: '.36s' }}><path d="M75 28 20 56l55 28 55-28Z" fill="#C6D6A0" /><path d="M75 84 20 56v6l55 28 55-28v-6Z" fill="#A9BB85" /></g>
              <g className="boot-pop" style={{ animationDelay: '.7s' }}><path d="M62 50V38l10-6 10 6v12l-10 5Z" fill="#F3EAD6" /><path d="M60 39 72 31l12 8-12 6Z" fill="#E8654F" /></g>
              <g className="boot-pop" style={{ animationDelay: '.85s' }}><path d="M100 60V50" stroke="#7A5C44" strokeWidth="2" /><path d="M100 34 92 52h16Z" fill="#6F8F62" /></g>
              <g className="boot-pop" style={{ animationDelay: '1s' }}><path d="M46 62V54" stroke="#7A5C44" strokeWidth="2" /><path d="m46 42-7 14h14Z" fill="#D9823F" /></g>
            </svg>
            <p className="mt-5 font-serif text-[26px] leading-none text-ink">SixtyFy</p>
            <span className="loadbar mt-5 h-[2px] w-40 overflow-hidden rounded bg-line" />
            <Label className="mt-3">Surveying terrain</Label>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

/** Always-on readout: level, XP and streak, with a ticker whenever XP is earned. */
export function HudBar() {
  const { t } = useI18n()
  const { user, progress } = useSession()
  const [sound, setS] = useState(soundOn)
  const [gain, setGain] = useState<{ n: number; id: number } | null>(null)
  const prev = useRef<number | null>(null)
  const xp = user?.total_xp ?? 0
  const shown = useCountUp(xp, 900)
  const ringPct = useCountUp(levelInfo(xp).pct, 700)
  const rose = progress.questDay === today() && progress.streak > 0

  useEffect(() => {
    if (prev.current !== null && xp > prev.current) {
      const g = { n: xp - prev.current, id: Date.now() }
      setGain(g)
      const id = setTimeout(() => setGain(cur => (cur?.id === g.id ? null : cur)), 1800)
      prev.current = xp
      return () => clearTimeout(id)
    }
    prev.current = xp
  }, [xp])

  if (!user) return null
  const lv = levelInfo(xp)
  const ring = Math.max(0, Math.min(100, ringPct))
  return (
    <div className="mx-auto w-full max-w-[1320px] px-3 sm:px-8">
      <div className="hud flex items-center gap-3 !rounded-full px-4 py-2 sm:gap-5 sm:px-6">
        <span tabIndex={0} data-guide="hud-state" data-tip={t('hud.tipState')} className="hidden rounded sm:inline-flex"><StateChip state={user.avatar_state} /></span>
        <span tabIndex={0} data-guide="hud-level" data-tip={t('hud.tipLevel')} aria-label={t('pro.level', { n: lv.level })} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden>
            <circle cx="20" cy="20" r="17" fill="none" className="stroke-line" strokeWidth="2" />
            <circle cx="20" cy="20" r="17" fill="none" className="stroke-forest" strokeWidth="2.5"
              strokeDasharray={106.8} strokeDashoffset={106.8 * (1 - ring / 100)} strokeLinecap="round" />
          </svg>
          <span className="num absolute text-[17px] leading-none text-ink">{lv.level}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="label truncate"><span className="sr-only">{t('pro.level', { n: lv.level })}. </span><span aria-hidden>LV {pad2(lv.level)} · </span>{lv.title}</p>
          <p className="relative mt-0.5 flex items-baseline gap-1.5">
            <span className="num text-[20px] leading-none text-ink">{Math.round(shown)}</span>
            <span className="label"><Term k="xp" />{lv.next ? ` / ${lv.next}` : ''}</span>
            <AnimatePresence>
              {gain && (
                <m.span key={gain.id} role="status"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: -2, scale: 1 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35 }} className="label ml-1 rounded bg-forest px-1.5 py-0.5 !text-on-forest">
                  +{gain.n} XP
                </m.span>
              )}
            </AnimatePresence>
          </p>
        </div>
        <p tabIndex={0} data-guide="hud-streak" data-tip={t('hud.tipStreak')} data-tip-side="end" className="flex items-center gap-1.5 rounded text-ink">
          <span className={`${progress.streak ? 'text-amber' : 'text-soft'} ${rose ? 'flicker' : ''}`}><Flame size={18} /></span>
          <span className="num text-[20px] leading-none">{progress.streak}</span>
          <span className="label hidden sm:inline">{t('home.streak')}</span>
        </p>
        <p tabIndex={0} data-guide="hud-coins" data-tip={t('hud.tipCoins')} data-tip-side="end" className="flex items-center gap-1.5 rounded text-ink">
          <span className="text-amber"><CoinIcon size={17} strokeWidth={1.5} aria-hidden /></span>
          <span className="num text-[20px] leading-none">{progress.coins}</span>
          <span className="label hidden sm:inline">{t('path.coins')}</span>
        </p>
        <button data-guide="hud-sound"
          onClick={() => { setSound(!sound); setS(!sound) }} aria-pressed={sound} aria-label="Sound"
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink transition-transform active:scale-95 hover:border-ink/40"
        >
          {sound ? <Volume2 size={17} strokeWidth={1.5} aria-hidden /> : <VolumeX size={17} strokeWidth={1.5} aria-hidden />}
        </button>
      </div>
    </div>
  )
}

/** Full-screen reveal for a new level or a new insignia. */
export function Celebration() {
  const { t } = useI18n()
  const { current, dismiss } = useGameEvents()
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!current) return
    btn.current?.focus()
    // the dialog has one control, so Tab stays on it
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); if (e.key === 'Tab') { e.preventDefault(); btn.current?.focus() } }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [current, dismiss])

  return (
    <AnimatePresence>
      {current && (
        <m.div
          key={current.kind + current.title}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-[#000000]/95 p-6 text-ink backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-labelledby="cel-title" onClick={dismiss}
        >
          <div className="flex max-w-md flex-col items-center text-center" onClick={e => e.stopPropagation()}>
            <m.div initial={{ scale: 0.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }} className="relative grid h-36 w-36 place-items-center">
              <m.span aria-hidden className="absolute inset-0 rounded-full border border-ink/60"
                animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
              <span aria-hidden className="absolute inset-0 rounded-full border-2 border-ink shadow-[0_0_60px_rgba(255,255,255,0.45)]" />
              <span aria-hidden className="absolute inset-3 rounded-full border border-dashed border-ink/70" />
              {current.kind === 'level'
                ? <span className="num text-[64px] leading-none">{current.level}</span>
                : <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" aria-hidden><path d="m12 3 2.700 5.600 6.100.900-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.900L12 3Z" /></svg>}
            </m.div>
            <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="label mt-8 !text-ink">{t(current.kind === 'level' ? 'cel.level' : 'cel.badge')}</m.p>
            <m.h2 id="cel-title" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="mt-2 text-[clamp(2.4rem,7vw,3.6rem)] leading-[1.05]">{current.title}</m.h2>
            <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 text-[17px] text-[#A1A1AA]">
              {current.kind === 'level' ? t('cel.levelSub') : current.detail}
            </m.p>
            <m.button ref={btn} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} onClick={dismiss}
              className="btn mt-8">
              {t('common.continue')}
            </m.button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
