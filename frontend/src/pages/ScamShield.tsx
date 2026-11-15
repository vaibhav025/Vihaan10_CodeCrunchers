import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Check, MessageSquare, Shield, X } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { useMeta } from '../lib/useMeta'
import { setMeta } from '../lib/meta'
import { SHIELD_COINS, weeklyScams, type Scam } from '../lib/scams'
import { play } from '../lib/sound'
import { spring } from '../ui/motion'
import { useToast } from '../ui/Toast'

/** Scam Shield: three real-world pension scam patterns a week. Call each one: safe or scam. */
export default function ScamShield() {
  const { t, lang } = useI18n()
  const { progress, saveProgress } = useSession()
  const meta = useMeta()
  const toast = useToast()
  const set = weeklyScams(meta.week)
  const done = meta.shieldWeek === meta.week
  const [i, setI] = useState(0)
  const [pick, setPick] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(done)
  const s = set[i]

  function answer(isScam: boolean) {
    if (pick !== null) return
    const ok = isScam === s.scam
    setPick(isScam); if (ok) setScore(x => x + 1)
    play(ok ? 'good' : 'bad'); navigator.vibrate?.(ok ? 15 : [30, 40, 30])
  }
  function next() {
    if (i < set.length - 1) { setI(i + 1); setPick(null); return }
    setFinished(true)
    if (!done) {
      setMeta({ shieldWeek: meta.week, shieldScore: score })
      saveProgress({ coins: progress.coins + SHIELD_COINS })
      toast(t('sh.earned', { n: SHIELD_COINS }))
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8">
      <section className="band p-6 sm:p-9">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-lg">
            <Label>{t('sh.week')}</Label>
            <h1 className="mt-2 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">{t('sh.title')}</h1>
            <p className="mt-2 text-[16px] leading-relaxed text-ink/80">{t('sh.sub')}</p>
          </div>
          <span aria-hidden className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-ink/10 ring-1 ring-white/15"><Shield size={44} strokeWidth={1.3} className="text-ink" /></span>
        </div>
        <div className="relative z-10 mt-6 flex gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={finished ? 3 : i}>
          {set.map((x, k) => <span key={x.id} className={`h-2 flex-1 rounded-full ${finished || k < i ? 'bg-ink' : k === i ? 'bg-ink/45' : 'bg-ink/12'}`} />)}
        </div>
      </section>

      {finished ? (
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hud mt-6 p-8 text-center">
          <Shield size={40} className="mx-auto text-forest" aria-hidden />
          <h2 className="mt-3 text-[2rem] text-ink">{t('sh.doneTitle')}</h2>
          <p className="mt-2 text-soft">{done && !score ? t('sh.doneAgain') : t('sh.score', { n: score || meta.shieldScore || 0 })}</p>
          <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left">
            {[t('sh.rule1'), t('sh.rule2'), t('sh.rule3')].map(r => <li key={r} className="flex gap-2.5 text-ink"><Check size={18} className="mt-0.5 shrink-0 text-forest" aria-hidden />{r}</li>)}
          </ul>
        </m.div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <AnimatePresence mode="wait">
            <m.div key={s.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={spring}>
              <Message s={s} lang={lang} />
            </m.div>
          </AnimatePresence>
          <div className="hud h-fit p-6">
            {pick === null ? (
              <>
                <Label>{t('sh.call', { n: i + 1 })}</Label>
                <p className="mt-2 font-serif text-xl text-ink">{t('sh.q')}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button onClick={() => answer(false)} className="btn game-btn gap-2"><Check size={18} aria-hidden />{t('sh.safe')}</button>
                  <button onClick={() => answer(true)} className="btn game-btn game-btn-amber gap-2"><X size={18} aria-hidden />{t('sh.scam')}</button>
                </div>
              </>
            ) : (
              <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status">
                <p className={`font-serif text-2xl ${pick === s.scam ? 'text-forest' : 'text-rust'}`}>{pick === s.scam ? t('q.correct') : t('ls.wrong')} {s.scam ? t('sh.itScam') : t('sh.itSafe')}</p>
                <Label className="mt-4 block">{t('sh.flags')}</Label>
                <ul className="mt-2 space-y-1.5">{s.flags.map(f => <li key={f.en} className="flex gap-2 text-[15px] text-ink"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${s.scam ? 'bg-rust' : 'bg-forest'}`} />{f[lang]}</li>)}</ul>
                <p className="mt-3 text-[15px] leading-relaxed text-soft">{s.why[lang]}</p>
                <button className="btn game-btn mt-5 w-full" onClick={next} autoFocus>{t('common.continue')}</button>
              </m.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** The scenario drawn as the phone screen it would arrive on. */
function Message({ s, lang }: { s: Scam; lang: 'en' | 'hi' | 'mr' }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[28px] border border-line bg-card p-3 shadow-lift">
      <div className="rounded-[20px] bg-paper p-5">
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-mist text-soft"><MessageSquare size={18} aria-hidden /></span>
          <div className="min-w-0"><p className="truncate font-medium text-ink">{s.from}</p><p className="label">{t(`sh.ch.${s.channel}`)}</p></div>
        </div>
        <p className={`mt-4 rounded-2xl rounded-tl-sm px-4 py-3 text-[16px] leading-relaxed text-ink ${s.channel === 'call' ? 'font-serif italic' : 'bg-haze'}`}>{s.text[lang]}</p>
      </div>
    </div>
  )
}
