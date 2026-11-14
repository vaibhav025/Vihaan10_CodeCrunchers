import { useCallback, useEffect, useRef, useState } from 'react'
import { FastForward, Newspaper, Pause, Play, RotateCcw } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { LabHead, LabNote, LineChart, Move, Stat, useLabSave } from '../components/lab/kit'
import { ConcentrationLesson, NewsRound, PanicTest, VolatilityLesson, WhyPanel, worth } from '../components/lab/stocks'
import { useI18n } from '../lib/i18n'
import { useToast } from '../ui/Toast'
import { rupees } from '../lib/format'
import { COMPANIES, riskOf } from '../sim/companies'
import { createMarket, pct, release, run, step, type Market } from '../sim/market'

const START_CASH = 100000
const WARMUP = 60     // days of history before the player arrives, so the chart is not empty
const KEEP = 250      // days of history kept in memory
const CHART_DAYS = 60
const NEWS_CHANCE = 1 / 25
const SEED_KEY = 'pq.lab.seed'
const BUY = [5000, 20000]

const fresh = (seed: number) => run(createMarket(seed), WARMUP, { auto: 1 / 30 })
const savedSeed = () => { try { return Number(localStorage.getItem(SEED_KEY)) || 2026 } catch { return 2026 } }

export default function LabStocks() {
  const { t } = useI18n()
  const toast = useToast()
  const save = useLabSave()
  const [seed, setSeed] = useState(savedSeed)
  const [hist, setHist] = useState<Market[]>(() => fresh(seed))
  const [cash, setCash] = useState(START_CASH)
  const [shares, setShares] = useState<number[]>(() => COMPANIES.map(() => 0))
  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const m = hist[hist.length - 1]
  // each lesson is rewarded once per visit
  const rewarded = useRef(new Set<string>())
  const reward = useCallback((key: string, score: number, outcome: string, lesson: string) => {
    if (rewarded.current.has(key)) return
    rewarded.current.add(key)
    void save('stocks', score, outcome, [lesson])
  }, [save])

  const advance = useCallback((days = 1) => setHist(h => {
    let out = h
    for (let i = 0; i < days; i++) out = [...out, step(out[out.length - 1], { auto: NEWS_CHANCE })]
    return out.slice(-KEEP)
  }), [])
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => advance(), 1100)
    return () => clearInterval(id)
  }, [playing, advance])

  const newMarket = () => {
    const next = Math.floor(Math.random() * 90000) + 1000
    try { localStorage.setItem(SEED_KEY, String(next)) } catch { /* storage may be unavailable */ }
    setSeed(next); setHist(fresh(next)); setCash(START_CASH); setShares(COMPANIES.map(() => 0)); setPlaying(false)
  }

  const invested = worth(shares, m.prices)
  const total = cash + invested
  const values = shares.map((n, i) => n * m.prices[i])
  const top = values.indexOf(Math.max(...values))
  const topShare = total ? values[top] / total : 0
  const heldCount = shares.filter(n => n > 0).length

  // diversifying after the concentration warning earns XP; trading itself never does
  const warned = useRef(false)
  useEffect(() => {
    if (topShare > 0.6) warned.current = true
    else if (warned.current && heldCount >= 3 && topShare <= 0.4) { reward('diversified', 80, 'diversified', 'concentration'); toast(t('lab.c.done')) }
  }, [topShare, heldCount, reward, toast, t])

  const buy = (amount: number) => {
    const spend = Math.min(amount, cash)
    if (spend < 1) { toast(t('lab.s.noCash')); return }
    setCash(c => c - spend)
    setShares(s => s.map((n, i) => (i === sel ? n + spend / m.prices[sel] : n)))
  }
  const sell = (fraction: number) => {
    const n = shares[sel] * fraction
    if (n <= 0) return
    setCash(c => c + n * m.prices[sel])
    setShares(s => s.map((x, i) => (i === sel ? x - n : x)))
  }

  /** Releases a headline on the real board and plays five days so the reaction is visible. */
  const releaseNews = (id: string) => {
    const days = run(release(m, id), 5).slice(1)
    setHist(h => [...h, ...days].slice(-KEEP))
    return { before: m.prices, after: days[days.length - 1].prices }
  }

  const c = COMPANIES[sel]
  const chart = hist.slice(-CHART_DAYS).map(d => d.prices[sel])
  const lastNews = [...hist].reverse().find(d => d.released.length)

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('lab.s.title')} sub={t('lab.s.sub')} />
      <LabNote />

      {/* the virtual account and the clock */}
      <section aria-label={t('lab.s.account')} className="hud p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Label className="!text-rust">{t('lab.s.virtual')}</Label>
            <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
              <Stat label={t('lab.s.value')} value={rupees(total)} sub={<Move pct={(total / START_CASH - 1) * 100} />} />
              <Stat label={t('lab.s.cash')} value={rupees(cash)} />
              <Stat label={t('lab.s.invested')} value={rupees(invested)} />
            </dl>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mr-1">{t('lab.s.day', { n: m.day })} · {t('lab.s.market', { n: seed })}</span>
            <button className="btn-quiet" onClick={() => advance()}><FastForward size={16} strokeWidth={1.5} aria-hidden />{t('lab.s.next')}</button>
            <button className="btn-quiet" aria-pressed={playing} onClick={() => setPlaying(p => !p)}>
              {playing ? <Pause size={16} strokeWidth={1.5} aria-hidden /> : <Play size={16} strokeWidth={1.5} aria-hidden />}{t(playing ? 'lab.s.pause' : 'lab.s.play')}
            </button>
            <button className="btn-quiet" onClick={newMarket}><RotateCcw size={16} strokeWidth={1.5} aria-hidden />{t('lab.s.newMarket')}</button>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-[14px] text-soft" aria-live="polite">
          <Newspaper size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {lastNews ? <span>{t('lab.s.dayN', { n: lastNews.day })}: <span className="text-ink">{t(`lab.n.${lastNews.released[lastNews.released.length - 1]}.h`)}</span></span> : t('lab.s.quiet')}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* market board */}
        <section aria-labelledby="board" className="hud p-5 sm:p-6">
          <h2 id="board" className="text-[1.45rem] text-ink">{t('lab.s.board')}</h2>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-x-3 px-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4.5rem]" aria-hidden>
            <span className="label">{t('lab.s.company')}</span><span className="label text-right">{t('lab.s.price')}</span>
            <span className="label text-right">{t('lab.s.today')}</span><span className="label hidden text-right sm:block">{t('lab.s.risk')}</span>
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {COMPANIES.map((co, i) => (
              <li key={co.id}>
                <button aria-pressed={sel === i} onClick={() => setSel(i)}
                  aria-label={`${co.name}, ${t(`lab.sec.${co.sector}`)}. ${t('lab.s.price')} ${rupees(m.prices[i])}. ${t('lab.s.risk')}: ${t(`lab.risk.${riskOf(co)}`)}`}
                  className="row !grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-x-3 !px-3 py-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4.5rem]">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium leading-snug text-ink">{co.name}</span>
                    <span className="block truncate text-[12px] text-soft">{t(`lab.sec.${co.sector}`)}{shares[i] > 0 ? ` · ${t('lab.s.hold')} ${rupees(values[i])}` : ''}<span className="sm:hidden"> · {t(`lab.risk.${riskOf(co)}`)}</span></span>
                  </span>
                  <span className="num text-right text-[16px] text-ink">{rupees(m.prices[i])}</span>
                  <span className="text-right text-[14px]"><Move pct={pct(m.parts[i].total)} /></span>
                  <span className="hidden text-right text-[13px] text-soft sm:block">{t(`lab.risk.${riskOf(co)}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          {/* the selected company: chart and virtual trades */}
          <section aria-labelledby="co" className="hud p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co" className="text-[1.45rem] text-ink">{c.name}</h2>
              <span className="num text-[1.45rem] text-ink">{rupees(m.prices[sel])}</span>
            </div>
            <p className="text-[14px] text-soft">{t(`lab.sec.${c.sector}`)} · {t('lab.s.risk')}: {t(`lab.risk.${riskOf(c)}`)}</p>
            <div className="mt-3">
              <LineChart label={t('lab.s.chart', { name: c.name, n: chart.length })} series={[{ name: c.name, values: chart }]} format={n => `₹ ${Math.round(n)}`} height={150} />
            </div>
            <p className="mt-3 text-[14px] text-soft">{t('lab.s.hold')}: <span className="text-ink">{rupees(values[sel])}</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BUY.map(a => <button key={a} className="btn-quiet" onClick={() => buy(a)}>{t('lab.s.buy', { amt: rupees(a) })}</button>)}
              <button className="btn-quiet" disabled={!shares[sel]} onClick={() => sell(0.5)}>{t('lab.s.sellHalf')}</button>
              <button className="btn-quiet" disabled={!shares[sel]} onClick={() => sell(1)}>{t('lab.s.sellAll')}</button>
            </div>
          </section>
          <WhyPanel m={m} index={sel} />
        </div>
      </div>

      <NewsRound m={m} seed={seed} onRelease={releaseNews}
        onScore={(right, of) => { rewarded.current.delete('news'); reward('news', (right / of) * 100, 'news_round', 'news') }} />

      <section aria-labelledby="risk" className="space-y-4">
        <div>
          <h2 id="risk" className="text-[1.9rem] text-ink">{t('lab.s.lessons')}</h2>
          <p className="mt-1 text-[15px] text-soft">{t('lab.s.lessonsSub')}</p>
        </div>
        {topShare > 0.6 && <ConcentrationLesson index={top} share={topShare} shares={shares} cash={cash} prices={m.prices} />}
        <div className="grid gap-4 lg:grid-cols-2">
          <PanicTest m={m} shares={shares} onDone={held => reward('panic', held ? 100 : 30, held ? 'panic_hold' : 'panic_sell', 'panic')} />
          <VolatilityLesson seed={seed} onDone={() => reward('volatility', 50, 'volatility', 'volatility')} />
        </div>
        <p className="text-[14px] text-soft">{t('lab.s.xpRule')}</p>
      </section>
    </div>
  )
}
