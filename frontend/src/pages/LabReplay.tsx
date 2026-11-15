import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FastForward, Pause, Play, RotateCcw } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { LabHead, LineChart, Move, Stat, Tick, useLabSave } from '../components/lab/kit'
import { useI18n } from '../lib/i18n'
import { rupees, rupeesShort } from '../lib/format'
import {
  START_CASH, buy, dayReport, emptyPortfolio, loadReplay, longRunSip, pctChange, pricesAt, replayScore, sell, whyMoved, worth,
  type ReplayData,
} from '../sim/replay'

const SPEEDS = [1, 5, 15]
const SPEED_KEY = ['rp.slow', 'rp.fast', 'rp.faster']
const TICK_MS = 500
const BUY = [5000, 20000]
const sign = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`

export default function LabReplay() {
  const { t } = useI18n()
  const save = useLabSave()
  const [data, setData] = useState<ReplayData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'bad'>('loading')
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [sel, setSel] = useState(0)
  const [port, setPort] = useState(() => emptyPortfolio(0))
  const [saved, setSaved] = useState(false)
  const savedOnce = useRef(false)

  useEffect(() => {
    let live = true
    loadReplay().then(d => { if (live) { setData(d); setPort(emptyPortfolio(d.stocks.length)); setStatus('ready') } })
      .catch(e => { if (live) setStatus(e instanceof Error && e.message === 'missing' ? 'missing' : 'bad') })
    return () => { live = false }
  }, [])

  const last = data ? data.times.length - 1 : 0
  const ended = status === 'ready' && at >= last
  const advance = useCallback((n: number) => setAt(a => Math.min(a + n, last)), [last])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => advance(speed), TICK_MS)
    return () => clearInterval(id)
  }, [playing, speed, advance])
  useEffect(() => { if (ended) setPlaying(false) }, [ended])

  const report = data && ended ? dayReport(data, port, at) : null
  useEffect(() => {
    if (!report || savedOnce.current) return
    savedOnce.current = true
    void save('stocks', replayScore(report), 'replay', ['replay']).then(r => { if (r) setSaved(true) })
  }, [report, save])

  if (status !== 'ready' || !data) {
    return (
      <div className="lab mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
        <LabHead title={t('rp.title')} sub={t('rp.note')} />
        <p className="hud p-5 text-[15px] text-soft" role="status">{t(status === 'loading' ? 'rp.loading' : status === 'missing' ? 'rp.missing' : 'rp.bad')}</p>
      </div>
    )
  }

  const prices = pricesAt(data, at)
  const total = worth(port, prices)
  const values = port.shares.map((n, i) => n * prices[i])
  const s = data.stocks[sel]
  const why = whyMoved(data, sel, at)
  const dateText = new Date(`${data.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const niftyPct = pctChange(data.index.close[at], data.index.prevClose)
  const dayLabel = t('rp.clock', { date: data.synthetic ? '—' : dateText, time: data.times[at] })
  const doBuy = (amt: number) => setPort(p => buy(p, sel, prices[sel], amt))
  const doSell = (f: number) => setPort(p => sell(p, sel, prices[sel], f))
  const restart = () => { setAt(0); setPlaying(false); setPort(emptyPortfolio(data.stocks.length)); savedOnce.current = false; setSaved(false) }
  const gap = report ? report.player - report.index : 0

  return (
    <div className="lab mx-auto w-full max-w-[1100px] space-y-6 px-5 sm:px-8">
      <LabHead title={t('rp.title')} sub={t('rp.sub', { date: data.synthetic ? '—' : dateText })} />
      <p className={`rounded-md border px-4 py-3 text-[14px] ${data.synthetic ? 'border-rust text-rust' : 'border-line text-soft'}`} role="note">
        {t(data.synthetic ? 'rp.sample' : 'rp.note')}
      </p>

      <section aria-label={t('lab.s.account')} className="hud p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <Label className="!text-rust">{t('lab.s.virtual')}</Label>
            <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
              <Stat label={t('lab.s.value')} value={rupees(total)} sub={<Move pct={pctChange(total, START_CASH)} />} />
              <Stat label={t('lab.s.cash')} value={rupees(port.cash)} />
              <Stat label={t('rp.nifty')} value={<Move pct={niftyPct} />} />
            </dl>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mr-1" aria-live="off">{dayLabel}</span>
            <button className="btn-quiet" disabled={ended} aria-pressed={playing} onClick={() => setPlaying(p => !p)}>
              {playing ? <Pause size={16} strokeWidth={1.5} aria-hidden /> : <Play size={16} strokeWidth={1.5} aria-hidden />}{t(playing ? 'lab.s.pause' : 'lab.s.play')}
            </button>
            <button className="btn-quiet" disabled={ended} onClick={() => advance(30)}><FastForward size={16} strokeWidth={1.5} aria-hidden />{t('rp.plus30')}</button>
            <button className="btn-quiet" onClick={() => setSpeed(x => SPEEDS[(SPEEDS.indexOf(x) + 1) % SPEEDS.length])}>
              {t('rp.speed', { x: t(SPEED_KEY[SPEEDS.indexOf(speed)]) })}
            </button>
            <button className="btn-quiet" onClick={restart}><RotateCcw size={16} strokeWidth={1.5} aria-hidden />{t('rp.restart')}</button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section aria-labelledby="rpboard" className="hud p-5 sm:p-6">
          <h2 id="rpboard" className="text-[1.45rem] text-ink">{t('lab.s.board')}</h2>
          <ul className="mt-3 space-y-1.5">
            {data.stocks.map((st, i) => (
              <li key={st.symbol}>
                <button aria-pressed={sel === i} onClick={() => setSel(i)}
                  aria-label={`${st.name}. ${t('lab.s.price')} ${rupees(prices[i])}`}
                  className="row !grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-x-3 !px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium leading-snug text-ink">{st.name}</span>
                    <span className="block truncate text-[12px] text-soft">{st.symbol}{port.shares[i] > 0 ? ` · ${t('lab.s.hold')} ${rupees(values[i])}` : ''}</span>
                  </span>
                  <span className="num text-right text-[16px] text-ink"><Tick value={prices[i]}>{rupees(prices[i])}</Tick></span>
                  <span className="text-right text-[14px]"><Move pct={pctChange(prices[i], st.prevClose)} /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="rpco" className="hud p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="rpco" className="text-[1.45rem] text-ink">{s.name}</h2>
              <span className="num text-[1.45rem] text-ink"><Tick value={prices[sel]}>{rupees(prices[sel])}</Tick></span>
            </div>
            <div className="mt-3">
              <LineChart label={t('rp.chart', { name: s.name })} height={150} format={n => `₹ ${Math.round(n)}`}
                series={[{ name: s.name, values: s.close.slice(0, at + 1) }, { name: t('rp.prev'), values: s.close.map(() => s.prevClose), tone: 'soft', dashed: true }]} />
            </div>
            <p className="mt-3 text-[14px] text-soft">{t('lab.s.hold')}: <span className="text-ink">{rupees(values[sel])}</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BUY.map(a => <button key={a} className="btn-quiet" disabled={ended} onClick={() => doBuy(a)}>{t('lab.s.buy', { amt: rupees(a) })}</button>)}
              <button className="btn-quiet" disabled={ended || !port.shares[sel]} onClick={() => doSell(0.5)}>{t('lab.s.sellHalf')}</button>
              <button className="btn-quiet" disabled={ended || !port.shares[sel]} onClick={() => doSell(1)}>{t('lab.s.sellAll')}</button>
            </div>
            {!ended && port.cash < 1 && <p className="mt-2 text-[13px] text-soft">{t('lab.s.noCash')}</p>}
          </section>

          <section aria-labelledby="rpwhy" className="hud p-5 sm:p-6">
            <h2 id="rpwhy" className="text-[1.3rem] text-ink">{t('rp.why.t')}</h2>
            <p className="mt-1 text-[14px] text-soft">{t('rp.why.sub')}</p>
            <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
              <Stat label={t('rp.why.market')} value={<Move pct={why.market} />} />
              <Stat label={t('rp.why.own')} value={<Move pct={why.own} />} />
            </dl>
            <p className="mt-3 text-[14px] leading-relaxed text-soft">
              {t('rp.why.read', { name: s.name, total: sign(why.total), market: sign(why.market), idx: sign(niftyPct), own: sign(why.own) })}
            </p>
          </section>
        </div>
      </div>

      {report && (
        <section aria-labelledby="rpend" className="hud space-y-4 p-5 sm:p-6" aria-live="polite">
          <h2 id="rpend" className="text-[1.6rem] text-ink">{t('rp.end.t')}</h2>
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat label={t('rp.end.you')} value={<Move pct={report.player} />} />
            <Stat label={t('rp.end.nifty')} value={<Move pct={report.index} />} />
            <Stat label={t('rp.end.basket')} value={<Move pct={report.basket} />} />
            <Stat label={t('rp.end.idle')} value={<Move pct={0} />} />
          </dl>
          <p className="text-[15px] text-ink">{t(Math.abs(gap) < 0.05 ? 'rp.end.flat' : gap > 0 ? 'rp.end.beat' : 'rp.end.lag', { gap: `${Math.abs(gap).toFixed(2)}%` })}</p>
          <p className="text-[14px] leading-relaxed text-soft">
            {t('rp.end.facts', {
              best: report.best.name, bestPct: sign(report.best.pct), worst: report.worst.name, worstPct: sign(report.worst.pct),
              swing: report.biggestSwing.name, swingPct: sign(report.biggestSwing.pct), trades: report.trades, holds: report.holdings,
            })}
          </p>
          <p className="text-[14px] leading-relaxed text-soft">{t('rp.end.lesson')}</p>
          <div className="border-t border-line pt-4">
            <h3 className="text-[1.15rem] text-ink">{t('rp.ret.t')}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-soft">
              {t('rp.ret.body', { name: report.biggestSwing.name, swing: sign(report.biggestSwing.pct), corpus: rupeesShort(longRunSip(10000, 30)) })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/lab/retire" className="btn-quiet">{t('rp.ret.run')}<ChevronRight size={16} aria-hidden /></Link>
              <Link to="/tracker" className="btn-quiet">{t('rp.ret.plan')}<ChevronRight size={16} aria-hidden /></Link>
            </div>
          </div>
          {saved && <p className="text-[13px] text-soft">{t('rp.saved')}</p>}
        </section>
      )}
    </div>
  )
}
