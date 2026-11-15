import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Briefcase, Building2, Check, Gem, House, Landmark, Lightbulb, PieChart, PiggyBank, Plus, Shield, Target, TrendingUp, Wallet, X } from '../components/ui/icons'
import { Label, Range, StateChip } from '../components/ui/kit'
import CountUp from '../ui/CountUp'
import ScoreRing from '../ui/ScoreRing'
import Hero from '../components/tracker/Hero'
import { tc } from '../components/tracker/strings'
import { Accuracy, ActionSheet, Lessons, markWeek, NextMoves, Quests, Weekly, WhatIf } from '../components/tracker/Body'
import QuickScore from '../components/tracker/QuickScore'
import MarketCard from '../components/tracker/MarketCard'
import { dateLabel, isLinked, quoteOf, quotes, useMarketDay } from '../lib/marketDay'
import { useToast } from '../ui/Toast'
import { spring } from '../ui/motion'
import { useI18n } from '../lib/i18n'
import { today, useSession } from '../lib/session'
import { CLASS, futureValue, insights, norm, rateOf, resetMoney, setMoney, toToday, totals, TYPES, useMoney, type Asset, type AssetType, type Money } from '../lib/tracker'
import { readiness, weakest, type Part } from '../lib/readiness'
import { rupees, rupeesShort } from '../lib/format'
import { play } from '../lib/sound'

const ICON: Record<AssetType, ComponentType<{ size?: number; strokeWidth?: number }>> = { fd: Landmark, stocks: TrendingUp, mf: PieChart, esop: Briefcase, epf: Building2, ppf: PiggyBank, nps: Shield, gold: Gem, property: House, cash: Wallet, other: Target }
const TINT: Record<AssetType, string> = { fd: '#D4D4D8', stocks: '#FFFFFF', mf: '#A1A1AA', esop: '#E8654F', epf: '#E4E4E7', ppf: '#8E8E98', nps: '#F2B544', gold: '#F6CD7D', property: '#B4B4BC', cash: '#C8C8CF', other: '#71717A' }
const QUEST_COINS = 25
const SHELVES: { key: string; types: AssetType[] }[] = [
  { key: 'safe', types: ['cash', 'fd', 'gold'] },
  { key: 'growth', types: ['mf', 'stocks', 'esop', 'other'] },
  { key: 'retire', types: ['nps', 'epf', 'ppf', 'property'] },
]

/** Tracker: everything you own, earn, spend and owe, as a vault you fill. Drives the Readiness Score. */
export default function Tracker() {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const { user, progress, saveProgress } = useSession()
  const money = useMoney()
  const toast = useToast()
  const [edit, setEdit] = useState<{ type: AssetType; id?: string } | null>(null)
  const [cost, setCost] = useState({ name: '', amt: '' })
  const [sheet, setSheet] = useState(false)
  const [more, setMore] = useState(false)
  const [quick, setQuick] = useState(() => !money.unlocked.includes('quick') && !money.income && !money.assets.length)
  const [open, setOpen] = useState<string | null>(null)
  const loc = useLocation() as { state?: { extra?: number; plan?: number } | null }
  const [extra, setExtra] = useState(loc.state?.extra ?? 0)
  const [action, setAction] = useState<{ k: Part['key']; start?: number } | null>(loc.state?.plan ? { k: 'saving', start: loc.state.plan } : null)
  const [accOpen, setAccOpen] = useState<string | null>(null)
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } markWeek() }, [money])
  const years = Math.max((user?.retirement_age ?? 60) - (user?.age ?? 25), 0)
  const tot = totals(money, years), r = readiness(money, years)
  const prev = useRef(r.score)

  // the score moving is the feedback: say so when it changes
  useEffect(() => {
    // wait until typing settles, then report the net change once
    const id = setTimeout(() => {
      const d = r.score - prev.current; prev.current = r.score
      if (d) toast(`${t('tr.score')} ${d > 0 ? '+' : '−'}${Math.abs(d)}`)
    }, 1200)
    return () => clearTimeout(id)
  }, [r.score]) // eslint-disable-line react-hooks/exhaustive-deps

  /** One-time rewards: each vault slot, each lesson read, each quest. */
  const reward = (key: string, coins: number, msg: string) => {
    if (money.unlocked.includes(key)) return
    setMoney({ unlocked: [...money.unlocked, key] }); saveProgress({ coins: progress.coins + coins, simDay: today() })
    toast(`${msg} +${coins}`); play('good'); navigator.vibrate?.(15)
  }
  const save = (p: Partial<Money>) => { setMoney(p); saveProgress({ simDay: today() }) }

  const quests = [
    { key: 'q-assets', done: tot.byType.length >= 3, text: t('tr.q1'), have: Math.min(tot.byType.length, 3), of: 3 },
    { key: 'q-flow', done: money.income > 0 && money.expenses > 0, text: t('tr.q2'), have: +(money.income > 0) + +(money.expenses > 0), of: 2 },
    { key: 'q-safe', done: money.health && money.term, text: t('tr.q3'), have: +money.health + +money.term, of: 2 },
  ]
  useEffect(() => { quests.forEach(q => { if (q.done) reward(q.key, QUEST_COINS, t('tr.questDone')) }) }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null
  if (quick) return <QuickScore years={years} onDone={() => setQuick(false)} />
  const started = money.assets.length > 0 || money.income > 0
  const gain = Math.round(weakest(r).max - weakest(r).got)
  const act = (k: Part['key']) => setAction({ k })
  const ask = (k: Part['key']) => nav('/coach', { state: { ask: tc(`ask_${k}`, lang), ctx: k } })
  const plan = money.assets.find(a => a.id === 'plan')?.monthly ?? 0
  const filled = [money.income, money.expenses, money.emi, money.loans, money.tax].filter(x => x > 0).length + money.assets.length
  const goAcc = (k: string) => { setAccOpen(k); document.getElementById('acc-h')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  const added = [money.income, money.expenses, money.emi, money.loans, money.tax].filter(x => x > 0).length + +money.health + +money.term
  const list = insights(money, years)
  const eff = norm(money)
  const real = (a: Asset) => toToday(futureValue(a, years), years, money.inflation)
  const boosted = readiness({ ...money, assets: [...money.assets, { id: 'x', type: 'mf', value: 0, monthly: extra }] }, years)
  const flow = [['expenses', eff.expenses, '#E8654F'], ['emi', money.emi, '#F2B544'], ['invest', tot.investing, '#4FA66A'], ['left', Math.max(tot.surplus, 0), '#A9BB85']] as const
  const num = (k: keyof Money, label: string) => (
    <div><label htmlFor={k} className="label">{label}</label>
      <div className="relative mt-1"><span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft">₹</span>
        <input id={k} inputMode="numeric" className="field !min-h-[44px] !pl-8" value={(money[k] as number) || ''} placeholder="0" onChange={e => save({ [k]: Number(e.target.value.replace(/[^\d]/g, '')) } as Partial<Money>)} /></div></div>
  )

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
      <div data-guide="tracker-score"><Hero r={r} stats={{ now: tot.netWorth, future: tot.future, real: tot.real }} age={user.retirement_age} started={started} hasAssets={money.assets.length > 0}
        onAct={act} onAsk={ask} onStart={n => (n === 1 ? goAcc('income') : n === 2 ? setEdit({ type: 'cash' }) : setQuick(true))} /></div>

      <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }} data-guide="tracker-moves"><NextMoves r={r} started={started} onAct={act} onStart={() => setQuick(true)} /></m.div>


      <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          {/* the vault: one slot per kind of asset */}
          <section aria-labelledby="vault" data-guide="tracker-vault">
            <div className="flex items-baseline justify-between gap-3"><h2 id="vault" className="text-[1.8rem] text-ink">{t('tr.vault')}</h2><Label>{tot.byType.length} / {TYPES.length} {t('tr.slots')}</Label></div>
            <div className="grid gap-x-5 xl:grid-cols-3">
            {SHELVES.map(sh => {
              const shown = sh.types.filter((ty, i) => more || i < 2 || money.assets.some(a => a.type === ty))
              return (
                <div key={sh.key} className="mt-4">
                  <Label>{t(`tr.sh.${sh.key}`)}</Label>
                  <ul className="mt-2 grid grid-cols-2 gap-3">
                    {shown.map((ty, i) => {
                const mine = money.assets.filter(x => x.type === ty), Icon = ICON[ty]
                const sum = mine.reduce((x, a) => x + a.value, 0)
                return (
                  <m.li key={ty} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
                    <button onClick={() => { setEdit({ type: ty }); play('tick') }} className={`vault ${mine.length ? 'vault-on' : ''}`} style={{ '--tint': TINT[ty] } as React.CSSProperties}>
                      <span className="vault-icon"><Icon size={22} strokeWidth={1.6} /></span>
                      {mine.length > 0 && tot.now > 0 && <svg viewBox="0 0 36 36" className="absolute right-3 top-3 h-8 w-8 -rotate-90" role="img" aria-label={`${Math.round((sum / tot.now) * 100)}%`}><circle cx="18" cy="18" r="14" fill="none" stroke="rgb(var(--mist))" strokeWidth="4" /><circle cx="18" cy="18" r="14" fill="none" stroke={TINT[ty]} strokeWidth="4" strokeDasharray={`${88 * (sum / tot.now)} 88`} /></svg>}
                      <span className="mt-3 block font-serif text-[17px] leading-tight text-ink">{t(`as.${ty}`)}</span>
                      {mine.length ? <><span className="num mt-1 block text-[1.35rem] leading-none text-ink">{rupeesShort(sum)}</span>
                        <span className="label mt-1.5 block">{(() => { const at = Math.max(...mine.map(a => a.at ?? 0)); if (!at) return `→ ${rupeesShort(mine.reduce((x, a) => x + real(a), 0))}`; const d = Math.floor((Date.now() - at) / 864e5); return d ? tc('updated', lang, { n: d }) : tc('updToday', lang) })()}</span></>
                        : <span className="label mt-2 flex items-center gap-1"><Plus size={12} />{t('tr.add')}</span>}
                    </button>
                  </m.li>
                )
                    })}
                  </ul>
                </div>
              )
            })}
            </div>
            <button className="link mt-1" onClick={() => setMore(!more)} aria-expanded={more}>{more ? t('tr.less') : t('tr.more')}</button>
            {tot.now > 0 && (
              <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label={t('tr.mix')}>
                {tot.byType.map(b => <span key={b.type} title={`${t(`as.${b.type}`)} ${Math.round((b.value / tot.now) * 100)}%`} style={{ width: `${(b.value / tot.now) * 100}%`, background: TINT[b.type] }} />)}
              </div>
            )}
            {/* every holding, editable; add as many as you like, of any kind */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-[1.3rem] text-ink">{t('tr.holdings')}</h3>
              <button className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-forest px-4 font-medium text-forest hover:bg-haze" onClick={() => setEdit({ type: 'other' })}><Plus size={16} />{t('tr.addHolding')}</button>
            </div>
            {money.assets.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-card">
                {money.assets.map(a => (
                  <li key={a.id}>
                    <button onClick={() => setEdit({ type: a.type, id: a.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-haze">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TINT[a.type] }} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-ink">{a.name || t(`as.${a.type}`)}</span>
                        <span className="label block truncate">{isLinked(a) ? `${a.symbol} · ${t('mk.shares', { n: a.qty! })}` : t(`as.${a.type}`)} · {rateOf(a)}%{a.monthly ? ` · +${rupees(a.monthly)}${t('common.perMonth')}` : ''}</span></span>
                      <span className="text-right"><span className="num block text-lg text-ink">{rupeesShort(a.value)}</span><span className="label block">→ {rupeesShort(real(a))}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Lessons r={r} filled={filled} onAct={act} onAsk={ask} />

          <WhatIf money={money} years={years} r={r} age={user.retirement_age} extra={extra} setExtra={setExtra} onApply={() => setAction({ k: 'saving', start: plan + extra })} />
        </div>

        <aside className="space-y-5">
          <MarketCard onLink={() => setEdit({ type: 'stocks', id: money.assets.find(a => a.type === 'stocks' && !isLinked(a))?.id })} />
          <Weekly onOpen={() => goAcc('income')} />
          <Accuracy money={money} openKey={accOpen} setOpenKey={setAccOpen} save={save} />
          <button className="link" onClick={() => setSheet(true)}>{t('tr.assume')}</button>
          <Quests coins={QUEST_COINS} list={quests} onGo={k => (k === 'q-assets' ? setEdit({ type: TYPES.find(x => !money.assets.some(a => a.type === x)) ?? 'other' }) : k === 'q-flow' ? goAcc(money.income ? 'expenses' : 'income') : act('protection'))} />
          <Link to="/coach" className="link">{t('tr.ask')}</Link>
          <p className="text-[13px] text-soft">{t('tr.data')} <button className="underline underline-offset-2 hover:text-rust" onClick={() => { if (window.confirm(t('tr.delete') + '?')) { resetMoney(); setQuick(true) } }}>{t('tr.delete')}</button></p>
        </aside>
      </m.div>

      <AnimatePresence>
        {sheet && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid items-end overflow-y-auto bg-[#000000]/60 sm:place-items-center" onClick={() => setSheet(false)}>
            <m.div role="dialog" aria-modal="true" aria-label={t('tr.acc')} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={spring}
              onClick={e => e.stopPropagation()} className="surface-float max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl p-6 sm:max-w-lg sm:rounded-2xl">
              <div className="mb-2 flex items-center justify-between"><Label>{t('tr.accN', { n: added })}</Label>
                <button onClick={() => setSheet(false)} aria-label={t('ls.close')} className="grid h-11 w-11 place-items-center rounded text-soft hover:text-ink"><X size={20} /></button></div>
          <section aria-labelledby="flow" data-guide="tracker-flow">
            <h2 id="flow" className="text-[1.5rem] text-ink">{t('tr.flow')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {num('income', t('tr.income'))}{num('expenses', t('tr.expenses'))}{num('emi', t('tr.emi'))}{num('loans', t('tr.loans'))}
              <div className="col-span-2">{num('tax', t('tr.tax'))}</div>
            </div>
            {/* your own cost lines: rent, school fees, parents, anything */}
            <p className="label mt-4">{t('tr.costs')}</p>
            <ul className="mt-1 space-y-1">
              {money.costs.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-[15px] text-ink">
                  <span className="truncate">{c.name}</span>
                  <span className="flex items-center gap-1"><span className="num">{rupees(c.amt)}</span>
                    <button type="button" aria-label={`${t('tr.remove')} ${c.name}`} onClick={() => save({ costs: money.costs.filter(x => x.id !== c.id) })} className="grid h-9 w-9 place-items-center rounded text-soft hover:text-rust"><X size={15} /></button></span>
                </li>
              ))}
            </ul>
            <form className="mt-1 grid grid-cols-[1fr_96px_auto] gap-2" onSubmit={e => { e.preventDefault(); const a = Number(cost.amt); if (!cost.name.trim() || !(a > 0)) return; save({ costs: [...money.costs, { id: 'c' + Date.now(), name: cost.name.trim(), amt: a }] }); setCost({ name: '', amt: '' }) }}>
              <input aria-label={t('tr.costName')} placeholder={t('tr.costName')} className="field !min-h-[44px]" value={cost.name} maxLength={30} onChange={e => setCost({ ...cost, name: e.target.value })} />
              <input aria-label={t('tr.costAmt')} placeholder="₹" inputMode="numeric" className="field !min-h-[44px]" value={cost.amt} onChange={e => setCost({ ...cost, amt: e.target.value.replace(/[^\d]/g, '') })} />
              <button className="grid h-11 w-11 place-items-center rounded-md border border-line bg-paper text-ink hover:border-forest" aria-label={t('tr.addCost')}><Plus size={18} /></button>
            </form>
            {money.income > 0 && (
              <><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-mist" aria-hidden>{flow.map(([k, v, c]) => <span key={k} style={{ width: `${Math.min((v / money.income) * 100, 100)}%`, background: c }} />)}</div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{flow.map(([k, v, c]) => <li key={k} className="label flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{t(`tr.f.${k}`)} {Math.round((v / money.income) * 100)}%</li>)}</ul></>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['health', 'term'] as const).map(k => (
                <button key={k} role="switch" aria-checked={money[k]} onClick={() => { save({ [k]: !money[k] } as Partial<Money>); play('tick') }} className="row !min-h-[48px] !px-3 text-[14px]">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border ${money[k] ? 'border-forest bg-forest text-on-forest' : 'border-soft/60'}`}>{money[k] && <Check size={13} />}</span>{t(`tr.${k}`)}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 border-t border-line pt-5" aria-labelledby="as">
            <h2 id="as" className="text-[1.5rem] text-ink">{t('tr.assume')}</h2>
            <div className="mt-3 space-y-1">
              <Range label={t('tr.inflation')} value={money.inflation} min={3} max={10} step={0.5} onChange={v => save({ inflation: v })} format={v => `${v}%`} />
              <Range label={t('tr.retireSpend')} value={money.retireSpend} min={50} max={120} step={5} onChange={v => save({ retireSpend: v })} format={v => `${v}%`} />
            </div>
          </section>

              <button className="btn game-btn mt-6 w-full" onClick={() => setSheet(false)}>{t('tr.save')}</button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{action && <ActionSheet k={action.k} start={action.start} money={money} years={years} onClose={() => setAction(null)} onDone={d => { setAction(null); setExtra(0); toast(`${t('tr.score')} ${d >= 0 ? '+' : '−'}${Math.abs(d)} · ${tc('xp', lang, { n: 10 })}`) }} />}</AnimatePresence>
      <AnimatePresence>{edit && <Editor type={edit.type} id={edit.id} years={years} onClose={() => setEdit(null)} onFirst={ty => reward('v-' + ty, 5, t('tr.unlocked'))} />}</AnimatePresence>
    </div>
  )
}

/** Sheet to add or change one holding: your own name, its kind, value, monthly addition and expected return. */
function Editor({ type, id, years, onClose, onFirst }: { type: AssetType; id?: string; years: number; onClose: () => void; onFirst: (t: AssetType) => void }) {
  const { t } = useI18n()
  const money = useMoney()
  const { saveProgress } = useSession()
  const cur = money.assets.find(a => a.id === id)
  const [kind, setKind] = useState<AssetType>(cur?.type ?? type)
  const [name, setName] = useState(cur?.name ?? '')
  const [value, setValue] = useState(cur?.value ? String(cur.value) : '')
  const [monthly, setMonthly] = useState(cur?.monthly ? String(cur.monthly) : '')
  const [rate, setRate] = useState(cur?.rate !== undefined ? String(cur.rate) : '')
  const { data: mkt, real } = useMarketDay()
  const [sym, setSym] = useState(cur?.symbol ?? '')
  const [qty, setQty] = useState(cur?.qty ? String(cur.qty) : '')
  const q = kind === 'stocks' && real && mkt ? quoteOf(mkt, sym) : null
  const linkedValue = q && Number(qty) > 0 ? Math.round(Number(qty) * q.price) : null
  const a: Asset = { at: Date.now(), id: cur?.id ?? 'a' + Date.now(), type: kind, value: linkedValue ?? (Number(value) || 0), ...(linkedValue !== null ? { symbol: sym, qty: Number(qty) } : {}), monthly: Number(monthly) || 0, ...(name.trim() ? { name: name.trim() } : q ? { name: q.name } : {}), ...(rate !== '' ? { rate: Math.min(Number(rate) || 0, 30) } : {}) }
  const fv = futureValue(a, years)
  const commit = (remove = false) => {
    const rest = money.assets.filter(x => x.id !== a.id)
    setMoney({ assets: remove || (!a.value && !a.monthly) ? rest : [...rest, a] }); saveProgress({ simDay: today() })
    if (!remove && (a.value || a.monthly)) onFirst(kind)
    onClose()
  }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const field = (fid: string, label: string, v: string, set: (s: string) => void, prefix = '₹', ph = '0') => (
    <div><label htmlFor={fid} className="label">{label}</label>
      <div className="relative mt-1"><span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft">{prefix}</span>
        <input id={fid} inputMode="decimal" autoFocus={fid === 'val'} className="field !pl-8" value={v} placeholder={ph} onChange={e => set(e.target.value.replace(/[^\d.]/g, ''))} /></div></div>
  )
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid items-end overflow-y-auto bg-[#000000]/60 sm:place-items-center" onClick={onClose}>
      <m.form role="dialog" aria-modal="true" aria-labelledby="ed-t" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={spring}
        onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); commit() }} className="surface-float w-full rounded-t-2xl p-6 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ed-t" className="text-[1.8rem] text-ink">{cur ? (cur.name || t(`as.${kind}`)) : t('tr.addHolding')}</h2>
          <button type="button" onClick={onClose} aria-label={t('ls.close')} className="grid h-11 w-11 place-items-center rounded text-soft hover:text-ink"><X size={20} /></button>
        </div>
        <p className="mt-1 text-[14px] text-soft">{t(`as.${kind}.d`)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label htmlFor="kind" className="label">{t('tr.type')}</label>
            <select id="kind" className="field mt-1" value={kind} onChange={e => setKind(e.target.value as AssetType)}>{TYPES.map(x => <option key={x} value={x}>{t(`as.${x}`)}</option>)}</select></div>
          <div><label htmlFor="nm" className="label">{t('tr.name')}</label><input id="nm" className="field mt-1" value={name} maxLength={30} onChange={e => setName(e.target.value)} placeholder={t(`as.${kind}`)} /></div>
          {kind === 'stocks' && real && mkt && (
            <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div><label htmlFor="sym" className="label">{t('mk.field')}</label>
                <select id="sym" className="field mt-1" value={sym} onChange={e => setSym(e.target.value)}>
                  <option value="">{t('mk.notLinked')}</option>
                  {quotes(mkt).map(x => <option key={x.symbol} value={x.symbol}>{x.name} ({x.symbol})</option>)}
                </select></div>
              {sym && <div><label htmlFor="qty" className="label">{t('mk.qty')}</label><input id="qty" inputMode="numeric" className="field mt-1" value={qty} placeholder="0" onChange={e => setQty(e.target.value.replace(/[^\d]/g, ''))} /></div>}
            </div>
          )}
          {linkedValue !== null && q && mkt
            ? <p className="col-span-2 rounded-lg bg-haze p-3 text-[14px] text-ink">{t('mk.valueAt', { date: dateLabel(mkt), value: rupees(linkedValue), qty, price: rupees(q.price) })}</p>
            : (
          <div className="col-span-2">{field('val', t('tr.value'), value, setValue)}
            <input type="range" aria-label={t('tr.value')} min={0} max={1000000} step={5000} value={Math.min(Number(value) || 0, 1000000)} onChange={e => setValue(e.target.value)} className="mt-2 h-8 w-full accent-[rgb(var(--forest))]" />
            <div className="mt-1 flex flex-wrap gap-1.5">{[10000, 50000, 100000, 500000].map(v => <button type="button" key={v} aria-pressed={Number(value) === v} onClick={() => setValue(String(v))} className={`min-h-[36px] rounded-full border px-3 font-mono text-[12px] ${Number(value) === v ? 'border-forest bg-haze text-forest' : 'border-line hover:border-forest'}`}>{rupeesShort(v)}</button>)}</div></div>)}
          {field('mon', t('tr.monthly'), monthly, setMonthly)}
          <div>{field('rt', t('tr.rateField'), rate, setRate, '%', String(CLASS[kind].rate))}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-haze p-3"><p className="label">{t('tr.atRetire')}</p><p className="num mt-1 text-2xl text-ink"><CountUp value={fv} format={rupeesShort} /></p></div>
          <div className="rounded-lg bg-haze p-3"><p className="label">{t('tr.real')}</p><p className="num mt-1 text-2xl text-ink"><CountUp value={toToday(fv, years, money.inflation)} format={rupeesShort} /></p></div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          {cur ? <button type="button" className="link" onClick={() => commit(true)}>{t('tr.remove')}</button> : <span />}
          <button className="btn game-btn min-w-[150px]">{t('tr.save')}</button>
        </div>
      </m.form>
    </m.div>
  )
}
