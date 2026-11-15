import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import WorldStill from '../components/world/WorldStill'
import { spring } from '../ui/motion'
import { prefersLessMotion } from '../lib/motionPref'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { answerOffline, factSheet, retrieve } from '../lib/rag'
import { getMoney } from '../lib/tracker'
import { dateLabel, isLinked, useMarketDay } from '../lib/marketDay'
import { ArrowDown, ArrowUp, Check, Coins, Lock, Mic, Plus, RotateCcw, Square, Volume2, X } from '../components/ui/icons'
import RoadBackdrop from '../components/RoadBackdrop'
import Segmented from '../ui/Segmented'
import CoachDisclaimer from '../components/CoachDisclaimer'
import { useToast } from '../ui/Toast'
import { Sidekick } from '../game/character/Character'
import { tc } from '../components/tracker/strings'
import { readiness, weakest } from '../lib/readiness'
import { recordLesson, setMeta } from '../lib/meta'
import { REWARDS } from '../game/economy'
import { Label } from '../components/ui/kit'
import { useI18n, type Lang } from '../lib/i18n'
import { today, useSession } from '../lib/session'
import { api } from '../lib/api'
import { monthlyIncome, recommended } from '../lib/game'
import { rupees, rupeesShort } from '../lib/format'

interface Fig { big: string; bars: number[]; assume: string; monthly: number }
interface Msg { role: 'user' | 'assistant'; content: string; at: string; cite?: string; sources?: string[]; fig?: Fig; follow?: string[]; err?: boolean }
type Topic = 'money' | 'tax' | 'retire' | 'risk'
const TOPICS: Topic[] = ['money', 'tax', 'retire', 'risk']
const SAVE = /how much|save|बचा|बचत|कितना|किती/
/** Where a source chip links to. Dates are when the note was last checked against that site. */
const srcLink = (x: string) => (/pfrda|nps|tier|pension|पेंशन/i.test(x) ? 'https://www.pfrda.org.in' : /tax|80c|कर/i.test(x) ? 'https://incometaxindia.gov.in' : null)
const REVIEWED = '2026-06'
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
const VOICE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

// Field notes used when the server has no AI key. Facts follow the rules in the backend's coach prompt.
const NOTES: Record<'what' | 'tax' | 'tier', Record<Lang, string>> = {
  what: {
    en: 'NPS is the National Pension System, a government-backed retirement scheme regulated by PFRDA. You pay in during your working years, the money is invested, and at 60 you take part as a lump sum and part as a monthly pension.',
    hi: 'NPS यानी राष्ट्रीय पेंशन प्रणाली, सरकार समर्थित सेवानिवृत्ति योजना है जिसे PFRDA नियंत्रित करता है। आप नौकरी के वर्षों में जमा करते हैं, पैसा निवेश होता है, और 60 की उम्र में कुछ हिस्सा एकमुश्त और कुछ मासिक पेंशन के रूप में मिलता है।',
    mr: 'NPS म्हणजे राष्ट्रीय पेन्शन प्रणाली, PFRDA च्या नियंत्रणाखालील सरकार समर्थित निवृत्ती योजना. तुम्ही नोकरीच्या काळात पैसे भरता, ते गुंतवले जातात, आणि 60 व्या वर्षी काही भाग एकरकमी व काही मासिक पेन्शन म्हणून मिळतो.',
  },
  tax: {
    en: 'Under the old tax regime, 80CCD(1) may qualify within the 80C limit and 80CCD(1B) may allow an extra ₹50,000. Under the new regime, personal NPS contributions do not get those deductions; eligible employer contributions under 80CCD(2) may qualify. NPS exit and tax rules are separate: eligible non-government normal exits can allow up to 80% lump sum and at least 20% annuity, subject to corpus thresholds and current tax law.',
    hi: 'पुरानी कर व्यवस्था में 80CCD(1) और अतिरिक्त 80CCD(1B) कटौती लागू हो सकती है। नई व्यवस्था में व्यक्तिगत NPS योगदान पर ये कटौतियाँ नहीं; पात्र नियोक्ता योगदान पर 80CCD(2) लागू हो सकता है। निकासी नियम अलग हैं: पात्र गैर-सरकारी सामान्य निकासी में सीमा और कोष राशि के अनुसार 80% तक एकमुश्त और कम से कम 20% वार्षिकी हो सकती है।',
    mr: 'जुन्या करप्रणालीत 80CCD(1) आणि अतिरिक्त 80CCD(1B) वजावट लागू होऊ शकते. नव्या करप्रणालीत वैयक्तिक NPS योगदानावर ही वजावट नाही; पात्र नियोक्ता योगदानासाठी 80CCD(2) लागू होऊ शकते. पात्र बिगर-सरकारी सामान्य निर्गमनात मर्यादा व कोषानुसार 80% पर्यंत एकरकमी आणि किमान 20% वार्षिकी असू शकते.',
  },
  tier: {
    en: 'PFRDA lists ₹500 as the minimum Tier I contribution per transaction and ₹1,000 as the minimum per year for the All Citizen Model. Tier II is an optional account with more flexible withdrawals. Check current rules for your NPS model.',
    hi: 'PFRDA के अनुसार All Citizen Model में Tier I का न्यूनतम प्रति योगदान ₹500 और वार्षिक न्यूनतम ₹1,000 है। Tier II वैकल्पिक खाता है और इससे निकासी अधिक लचीली है। अपने NPS मॉडल के वर्तमान नियम जाँचें।',
    mr: 'PFRDA नुसार All Citizen Model मध्ये Tier I साठी प्रत्येक योगदान किमान ₹500 आणि वार्षिक किमान ₹1,000 आहे. Tier II हे अधिक लवचिक पैसे काढण्याचे ऐच्छिक खाते आहे. आपल्या NPS मॉडेलचे चालू नियम तपासा.',
  },
}

export default function Coach() {
  const { t, lang } = useI18n()
  const { user, refresh } = useSession()
  const market = useMarketDay()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState<number | null>(null)
  const [readPct, setReadPct] = useState(0)
  const loc = useLocation() as { state?: { ask?: string; ctx?: string } | null }
  const nav = useNavigate()
  const toast = useToast()
  const [topic, setTopic] = useState<Topic>('money')
  const [lastQ, setLastQ] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  const [useCtx, setUseCtx] = useState(() => localStorage.getItem('pq.coach.ctx') === '1')
  const [about, setAbout] = useState(loc.state?.ctx)
  const [copied, setCopied] = useState<number | null>(null)
  const [fb, setFb] = useState<Record<string, 1 | -1>>(() => { try { return JSON.parse(localStorage.getItem('pq.coach.fb') ?? '{}') } catch { return {} } })
  useEffect(() => { if (loc.state?.ask) setInput(loc.state.ask) }, [loc.state?.ask])
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false); addEventListener('online', on); addEventListener('offline', off); return () => { removeEventListener('online', on); removeEventListener('offline', off) } }, [])
  const rec = useRef<any>(null)
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null

  // --- scrolling: the chat card has a fixed height; a new question is pinned near the top and nothing else moves the list
  const list = useRef<HTMLDivElement>(null), lastTurn = useRef<HTMLElement>(null), body = useRef<HTMLDivElement>(null), ta = useRef<HTMLTextAreaElement>(null)
  const pin = useRef(false), manual = useRef(false), req = useRef(0)
  const [listH, setListH] = useState(0)
  const [jump, setJump] = useState(false)       // the answer continues below the visible area
  const [stuck, setStuck] = useState(false)     // the question has scrolled out above the top
  const [priv, setPriv] = useState(false)
  const [topics, setTopics] = useState(false)
  const [said, setSaid] = useState('')
  const calm = prefersLessMotion()
  const pinQuestion = useCallback(() => { const l = list.current, tn = lastTurn.current; if (l && tn) l.scrollTo({ top: tn.offsetTop - 12, behavior: calm ? 'auto' : 'smooth' }) }, [calm])
  const measure = useCallback(() => {
    const l = list.current, b = body.current
    if (!l) return
    l.style.setProperty('--rb-s', String(l.scrollHeight > l.clientHeight ? l.scrollTop / (l.scrollHeight - l.clientHeight) : 0))
    if (!b) { setJump(false); return }
    setJump(b.getBoundingClientRect().bottom > l.getBoundingClientRect().bottom + 24)
  }, [])
  useLayoutEffect(() => {
    const l = list.current; if (!l) return
    const ro = new ResizeObserver(() => { setListH(l.clientHeight); measure() }); ro.observe(l); if (body.current) ro.observe(body.current)
    return () => ro.disconnect()
  }, [measure, msgs.length, busy])
  // after a send: wait two frames for the new turn to lay out, then put the question 12px from the top
  useEffect(() => {
    if (!pin.current) return
    pin.current = false
    let b = 0; const a = requestAnimationFrame(() => { b = requestAnimationFrame(pinQuestion) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [msgs.length, pinQuestion])
  // wheel, touch and scroll keys mean the reader is in charge until the next send
  useEffect(() => {
    const l = list.current; if (!l) return
    const hand = () => { manual.current = true }
    const keys = (e: KeyboardEvent) => { if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) manual.current = true }
    l.addEventListener('wheel', hand, { passive: true }); l.addEventListener('touchmove', hand, { passive: true }); l.addEventListener('keydown', keys); l.addEventListener('scroll', measure, { passive: true })
    return () => { l.removeEventListener('wheel', hand); l.removeEventListener('touchmove', hand); l.removeEventListener('keydown', keys); l.removeEventListener('scroll', measure) }
  }, [measure])
  // the sticky question bar appears when the pinned question leaves through the top
  useEffect(() => {
    const l = list.current, q = lastTurn.current?.querySelector('[data-q]')
    if (!l || !q) { setStuck(false); return }
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 8), { root: l, threshold: 0 })
    io.observe(q); return () => io.disconnect()
  }, [msgs.length])
  // phone keyboard: keep the card inside the visible viewport and re-pin the question
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return
    const on = () => { document.documentElement.style.setProperty('--vvh', `${vv.height}px`); if (!manual.current && msgs.length) pinQuestion() }
    vv.addEventListener('resize', on); return () => { vv.removeEventListener('resize', on); document.documentElement.style.removeProperty('--vvh') }
  }, [pinQuestion, msgs.length])
  const stop = useCallback(() => { req.current++; setBusy(false) }, [])
  // shortcuts: "/" focuses the box, Esc stops a pending answer; the pointer nudges the backdrop on fine pointers
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && busy) stop()
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); ta.current?.focus() }
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [busy, stop])
  const grow = () => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px` } }
  useEffect(grow, [input])
  useEffect(() => () => { rec.current?.abort?.(); window.speechSynthesis?.cancel() }, [])

  /** Answer from the field notes; the numbers come from the calculator API. */
  let cite: string | undefined
  let fig: Fig | undefined
  async function briefing(q: string): Promise<string> {
    const s = q.toLowerCase()
    if (/tax|80c|कर |कर$|टैक्स/.test(s)) return NOTES.tax[lang]
    if (/tier|टियर/.test(s)) return NOTES.tier[lang]
    if (SAVE.test(s) && user) {
      const target = recommended(user.income_range)
      const returnPct = user.risk_profile === 'conservative' ? 8 : user.risk_profile === 'aggressive' ? 12 : 10
      const r = await api.simulate({
        current_age: user.age, retirement_age: user.retirement_age, monthly_contribution: target,
        annual_return_pct: returnPct, risk_profile: user.risk_profile, annual_income: monthlyIncome(user.income_range) * 12,
      })
      const a = rupees(target), c = rupeesShort(r.projected_corpus), p = rupees(r.monthly_pension)
      const low = rupeesShort(r.corpus_range['8']), high = rupeesShort(r.corpus_range['12'])
      cite = `${a}${t('common.perMonth')} · ${c} · ${p}${t('common.perMonth')}`
      fig = { big: c, bars: [r.corpus_range['8'], r.corpus_range['10'] ?? r.projected_corpus, r.corpus_range['12']], assume: `${a}${t('common.perMonth')} · ${returnPct}% · ${user.age} → ${user.retirement_age}`, monthly: target }
      return {
        en: `The guideline is 10% of income, which is ${a} a month for you. At ${returnPct}%, the projected corpus by age ${user.retirement_age} is ${c} nominally and ₹${rupeesShort(r.corpus_in_today_rupees)} in today's rupees; 8/10/12% scenarios range from ${low} to ${high}. These are estimates, not guarantees.`,
        hi: `दिशानिर्देश आय का 10% है, यानी आपके लिए ${a} प्रति माह। ${returnPct}% पर ${user.retirement_age} वर्ष तक अनुमानित राशि ${c} है और आज के रुपयों में ₹${rupeesShort(r.corpus_in_today_rupees)}। 8/10/12% परिदृश्यों में राशि ${low} से ${high} तक है। ये अनुमान हैं, गारंटी नहीं।`,
        mr: `मार्गदर्शक तत्त्व उत्पन्नाच्या 10% आहे, म्हणजे तुमच्यासाठी ${a} प्रति महिना. ${returnPct}% परताव्याने ${user.retirement_age} व्या वर्षापर्यंत अंदाजे ${c}, आजच्या रुपयांत ₹${rupeesShort(r.corpus_in_today_rupees)}. 8/10/12% परिदृश्यांमध्ये अंदाज ${low} ते ${high} आहेत; हमी नाही.`,
      }[lang]
    }
    return NOTES.what[lang]
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    const id = ++req.current
    pin.current = true; manual.current = false; setTopics(false); ta.current?.focus()
    const history = msgs.filter(m => !m.err).map(({ role, content }) => ({ role, content }))
    setMsgs(m => [...m.filter(x => !x.err), { role: 'user', content: q, at: now() }])
    setInput(''); setBusy(true); setLastQ(q)
    if (!localStorage.getItem('pq.coach.first')) { localStorage.setItem('pq.coach.first', '1'); recordLesson({ accuracy: 1, xp: REWARDS.xp[1] }); toast(`${tc('firstQ', lang)} · ${tc('xp', lang, { n: REWARDS.xp[1] })}`) }
    // retrieve: the most relevant notes, plus the player's own numbers only when they allow it
    setMeta({ coachDay: today() })
    const docs = retrieve(q), facts = user && useCtx ? factSheet(user) : ''
    let sources = [...(facts ? [t('coach.yours')] : []), ...docs.map(d => d.title)]
    let reply: string
    try {
      // The server computes every figure itself; an outside model, if allowed, only ever sees placeholders.
      const safeHistory = history.filter(m => m.role === 'user').slice(-6)
      const r = user && online ? await api.chat(q.slice(0, 1000), safeHistory) : null
      if (id !== req.current) return // stopped
      if (r) { reply = r.reply; if (r.sources?.length) sources = r.sources; setOffline(r.provider === 'private'); if (SAVE.test(q.toLowerCase()) && user) await briefing(q).catch(() => '') }
      else {
        // no AI connected: the built-in adviser answers from the same retrieved notes (and the tracker, if allowed)
        setOffline(true)
        const basic = lang !== 'en' && docs[0] && ['nps', 'tier', 'tax'].includes(docs[0].id) && !/\d{3,}/.test(q)
        if (basic || !user || !useCtx) reply = await briefing(q)
        else { const a = answerOffline(q, user, docs); reply = a.text; cite = a.cite }
      }
    } catch {
      if (id !== req.current) return
      setMsgs(m => [...m, { role: 'assistant', content: tc('failed', lang), at: now(), err: true }]); setBusy(false); cite = undefined; fig = undefined; return
    }
    if (id !== req.current) return
    const msg: Msg = { role: 'assistant', content: reply, at: now(), cite, fig, sources } // capture before the reset below
    setMsgs(m => [...m, msg]); setSaid(`${tc('replied', lang)} ${msg.at}`)
    cite = undefined; fig = undefined
    setBusy(false)
  }

  function listen() {
    if (listening) { rec.current?.stop(); return }
    const r = new SR()
    r.lang = VOICE[lang]; r.interimResults = false
    r.onresult = (e: any) => send(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r; setListening(true); r.start()
  }

  function read(i: number) {
    const synth = window.speechSynthesis
    synth.cancel()
    if (speaking === i) { setSpeaking(null); return }
    const u = new SpeechSynthesisUtterance(msgs[i].content)
    u.lang = VOICE[lang]; u.rate = 0.95
    u.onend = () => { setSpeaking(null); setReadPct(0) }
    u.onboundary = e => setReadPct(e.charIndex / Math.max(msgs[i].content.length, 1))
    setSpeaking(i); synth.speak(u)
  }

  const hasData = getMoney().assets.length > 0 || getMoney().income > 0
  const years = Math.max((user?.retirement_age ?? 60) - (user?.age ?? 25), 0), rd = readiness(getMoney(), years)
  const retry = () => { setMsgs(m => m.filter(x => !x.err).slice(0, -1)); setTimeout(() => send(lastQ)) }
  const vote = (k: string, v: 1 | -1) => { const n = { ...fb, [k]: v }; setFb(n); try { localStorage.setItem('pq.coach.fb', JSON.stringify(n)) } catch { /* storage off */ } }
  const tip = tc(`tip${Math.floor(Date.now() / 864e5) % 3}`, lang)
  const tool = 'grid h-10 w-10 place-items-center rounded text-soft hover:bg-haze hover:text-ink focus-visible:bg-haze aria-pressed:text-forest'
  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex min-h-[44px] w-full items-center gap-2 rounded px-1 text-left text-[14px] text-ink hover:bg-haze">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-forest' : 'bg-mist'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></span>{label}
    </button>
  )
  const AV = <span aria-hidden className="mt-1 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-card"><Sidekick id="dadi" size={34} moving={busy} /></span>
  // each exchange is one turn: the question, then everything the coach said back
  const turns: number[][] = []
  msgs.forEach((x, i) => { if (x.role === 'user' || !turns.length) turns.push([i]); else turns[turns.length - 1].push(i) })
  const bubble = (msg: Msg, i: number) => (
            <m.div key={i} initial={{ opacity: 0, y: msg.role === 'user' ? 8 : 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && AV}
              <div className={msg.role === 'user' ? 'max-w-[min(80%,72ch)]' : 'min-w-0 max-w-[min(92%,72ch)]'}>
                <Label className={msg.role === 'user' ? 'block text-right' : ''}>{msg.at} · {t(msg.role === 'user' ? 'coach.you' : 'coach.coach')}</Label>
                {msg.role === 'user'
                  ? <p data-q className="mt-1 whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-ink/20 bg-ink/[0.12] px-4 py-3 text-[16.5px] leading-[1.6] text-ink">{msg.content}</p>
                  : msg.err ? <div className="mt-1 flex flex-wrap items-center gap-3 rounded-xl border border-rust/50 bg-card px-4 py-3"><span className="text-ink">{msg.content}</span><button className="row !min-h-[40px] gap-1.5 !px-3" onClick={retry}><RotateCcw size={14} />{tc('retry', lang)}</button></div>
                  : <div className="mt-1 rounded-2xl rounded-tl-sm border border-line bg-card px-5 py-4"><Stream text={msg.content} instant={i !== msgs.length - 1} /></div>}
                {speaking === i && <span aria-hidden className="mt-2 block h-0.5 origin-left bg-forest transition-transform duration-200" style={{ transform: `scaleX(${readPct})` }} />}
                {msg.fig && (
                  <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.4 }} className="mt-3 rounded-lg border border-amber/50 bg-card p-4">
                    <Label className="flex items-center gap-1.5"><Coins size={12} aria-hidden />{tc('fromCalc', lang)}</Label>
                    <p className="num mt-1 text-[2rem] leading-none text-ink">{msg.fig.big}</p>
                    <div className="mt-3 space-y-1.5">{msg.fig.bars.map((v, k) => <div key={k} className="flex items-center gap-2"><span className="label w-9">{[8, 10, 12][k]}%</span><span className="h-2 flex-1 overflow-hidden rounded bg-mist"><m.span className="block h-full w-full origin-left bg-forest" initial={{ scaleX: 0 }} animate={{ scaleX: v / Math.max(...msg.fig!.bars, 1) }} transition={{ ...spring, delay: 0.5 + k * 0.08 }} /></span><span className="num w-16 text-right text-[13px] text-ink">{rupeesShort(v)}</span></div>)}</div>
                    <p className="label mt-2">{tc('assume', lang)}: {msg.fig.assume}</p>
                  </m.div>
                )}
                {msg.cite && !msg.fig && <p className="label mt-2 inline-flex items-center gap-1.5 rounded border border-amber/50 bg-card px-2 py-1 !text-ink"><Coins size={12} aria-hidden />{t('qt.calc')} · {msg.cite}</p>}
                {msg.sources && msg.sources.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5"><span className="label">{t('coach.sources')}</span>
                    {msg.sources.map(x => { const href = srcLink(x); return href
                      ? <a key={x} href={href} target="_blank" rel="noreferrer" className="label rounded border border-line bg-card px-2 py-0.5 !normal-case !tracking-normal !text-ink hover:border-forest focus-visible:border-forest">{x} · {REVIEWED}</a>
                      : <span key={x} className="label rounded border border-line bg-card px-2 py-0.5 !normal-case !tracking-normal !text-ink">{x}</span> })}</p>
                )}
                {msg.role === 'assistant' && !msg.err && (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <button className={tool} aria-label={tc(copied === i ? 'copied' : 'copy', lang)} title={tc('copy', lang)} onClick={() => { navigator.clipboard?.writeText(msg.content); setCopied(i); setTimeout(() => setCopied(null), 1200) }}>{copied === i ? <Check size={15} /> : <span aria-hidden className="text-[15px]">⧉</span>}</button>
                      {'speechSynthesis' in window && <button onClick={() => read(i)} className={tool} aria-label={speaking === i ? t('coach.silence') : t('coach.read')}>{speaking === i ? <Square size={14} aria-hidden /> : <Volume2 size={16} strokeWidth={1.5} aria-hidden />}</button>}
                      <button className={tool} aria-pressed={fb[msg.at + i] === 1} aria-label={tc('up', lang)} onClick={() => vote(msg.at + i, 1)}>👍</button>
                      <button className={tool} aria-pressed={fb[msg.at + i] === -1} aria-label={tc('down', lang)} onClick={() => vote(msg.at + i, -1)}>👎</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => nav('/tracker', { state: { extra: msg.fig?.monthly ?? 0 } })}>{tc('trySim', lang)}</button>
                      {msg.fig && <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => nav('/tracker', { state: { plan: msg.fig!.monthly } })}>{tc('addPlan', lang)}</button>}
                      {hasData && <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => setInput(tc(`ask_${weakest(rd).key}`, lang))}>{tc('askPillar', lang)}</button>}
                    </div>
                  </>
                )}
              </div>
            </m.div>
  )
  return (
    <div className="coach-shell mx-auto grid w-full max-w-[1240px] gap-5 px-3 sm:px-8 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      {/* the coach, topics and starters */}
      {topics && <button type="button" aria-label={tc('close', lang)} className="fixed inset-0 z-[55] bg-black/60 lg:hidden" onClick={() => setTopics(false)} />}
      <m.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={`band min-h-0 overflow-y-auto p-5 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[56] max-lg:max-h-[80dvh] max-lg:!rounded-b-none lg:h-full ${topics ? '' : 'max-lg:hidden'}`}>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink/10"><Sidekick id="dadi" size={46} /></span>
            <div><h1 className="text-[1.35rem] leading-[1.15]">{tc('coachName', lang)}</h1>
              <p className="label mt-1 flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#9AD08F]' : 'bg-ink'}`} />{tc('calcBacked', lang)}</p></div>
          </div>
          <div className="mt-5 [&_*]:!text-[13px]"><Segmented label={tc('tp_money', lang)} value={topic} onChange={setTopic} options={TOPICS.map(x => ({ id: x, name: tc(`tp_${x}`, lang) }))} /></div>
          <ul className="mt-3 grid gap-2" data-guide="coach-starters">
            {[1, 2].map((n, i) => { const q = tc(`st_${topic}${n}`, lang); return (
              <m.li key={topic + n} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.06 }}>
                <button onClick={() => send(q)} disabled={busy} className="tile pressable flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] hover:border-ink/60 focus-visible:border-ink disabled:opacity-60">{q}</button>
              </m.li>) })}
            {market.real && market.data && [getMoney().assets.some(isLinked) ? 'mk.askMine' : null, 'mk.askMarket'].filter(Boolean).map(k => { const q = t(k!, { date: dateLabel(market.data!) }); return (
              <li key={k}><button onClick={() => send(q)} disabled={busy} className="tile pressable flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] hover:border-[#FFFFFF]/60 focus-visible:border-[#FFFFFF] disabled:opacity-60">{q}</button></li>) })}
          </ul>
          <div className="mt-4 rounded-xl border border-ink/15 bg-ink/5 p-3"><p className="label !text-ink">{tc('tip', lang)}</p><p className="mt-1 text-[13.5px] leading-snug">{tip}</p></div>
          {!hasData && <Link to="/tracker" className="mt-4 block rounded-lg border border-ink/50 px-4 py-3 text-[14px] text-ink hover:bg-ink/5">{t('coach.noData')}</Link>}
          {offline && <p className="mt-5 border-l-2 border-ink pl-3 text-[13px] leading-relaxed text-ink/70">{t('coach.offline')}</p>}
        </div>
      </m.aside>

      {/* the conversation */}
      <m.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }} className="hud relative flex h-full min-h-0 flex-col overflow-hidden"
        onPointerMove={e => { if (e.pointerType === 'mouse' && !calm) { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--rb-x', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)) } }}>
        <header className="relative z-10 flex shrink-0 items-center gap-2 border-b border-line bg-card px-4 py-2.5 sm:px-5">
          <p className="flex-1 truncate font-serif text-[1.2rem] text-ink">{t('nav.coach')}</p>
          <button type="button" className="row !min-h-[44px] !w-auto shrink-0 !px-3 text-[14px] lg:hidden" aria-expanded={topics} onClick={() => setTopics(o => !o)}>{tc('topics', lang)}</button>
          <CoachDisclaimer />
          <button className="row !min-h-[44px] !w-auto shrink-0 gap-1.5 !px-3 text-[14px] sm:!min-h-[40px]" aria-label={tc('newChat', lang)} onClick={() => { stop(); setMsgs([]); setAbout(undefined); setLastQ(''); window.speechSynthesis?.cancel(); ta.current?.focus() }}><Plus size={15} /><span className="max-sm:hidden">{tc('newChat', lang)}</span></button>
          {busy && <span aria-hidden className="coach-line" />}
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <RoadBackdrop steps={msgs.filter(x => x.role === 'assistant' && !x.err).length} dim={msgs.length > 0} />
          {stuck && lastQ && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-line bg-card px-4 py-1.5">
              <p className="min-w-0 flex-1 truncate text-[14px] text-soft">{lastQ}</p>
              <button type="button" aria-label={tc('backToQ', lang)} title={tc('backToQ', lang)} onClick={() => { manual.current = false; pinQuestion() }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/20 text-ink hover:border-ink/50"><ArrowUp size={16} aria-hidden /></button>
            </div>
          )}
          <div ref={list} tabIndex={0} className="coach-list space-y-5 p-4 sm:p-6" role="log" aria-live="off" aria-label={t('nav.coach')}>
            {!online && <p className="relative z-[1] rounded-md border border-amber/50 bg-card px-3 py-2 text-[14px] text-ink">{tc('offline', lang)}</p>}
            {msgs.length === 0 && (
              <div className="relative z-[1] flex gap-3">
                {AV}
                <div className="max-w-[min(92%,72ch)]"><div className="rounded-2xl rounded-tl-sm border border-line bg-card px-5 py-4"><Stream text={tc('hello', lang)} /></div>
                  <p className="label mt-3">{tc('tryAsk', lang)}</p>
                  {/* three picks from the other topics, so they never repeat the list on the left */}
                  <div className="mt-1.5 flex flex-wrap gap-2">{TOPICS.filter(x => x !== topic).map(x => tc(`st_${x}1`, lang)).map(q => <button key={q} onClick={() => send(q)} className="min-h-[44px] rounded-full border border-line bg-card px-3.5 text-left text-[14.5px] text-ink hover:-translate-y-0.5 hover:border-forest focus-visible:border-forest active:scale-[0.97]">{q}</button>)}</div></div>
              </div>
            )}
            {turns.map((idx, ti) => { const last = ti === turns.length - 1; return (
              <section key={ti} className="turn" ref={last ? lastTurn : undefined} style={last ? { minHeight: Math.max(listH - 28, 0) } : undefined}>
                <div ref={last ? body : undefined} className="space-y-5 pb-2">
                  {idx.map(i => bubble(msgs[i], i))}
                  {last && busy && (
                    <div className="flex items-center gap-3" role="status" aria-label={t('coach.thinking')}>
                      {AV}
                      <span className="flex items-center gap-1.5 rounded-2xl border border-line bg-card px-4 py-3">{[0, 1, 2].map(d => <span key={d} className="dot h-2 w-2 rounded-full bg-soft" style={{ animationDelay: `${d * 0.15}s` }} />)}</span>
                    </div>
                  )}
                </div>
              </section>
            ) })}
          </div>
          {jump && (
            <button type="button" onClick={() => { const l = list.current, bd = body.current; if (l && bd) l.scrollTo({ top: l.scrollTop + bd.getBoundingClientRect().bottom - l.getBoundingClientRect().bottom + 16, behavior: calm ? 'auto' : 'smooth' }) }}
              className="absolute bottom-3 left-1/2 z-10 inline-flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full border border-ink/25 bg-card px-4 text-[14px] text-ink shadow-lg hover:border-ink/60">
              <span aria-hidden className="h-2 w-2 rounded-full bg-up" /><ArrowDown size={15} aria-hidden />{tc('jump', lang)}
            </button>
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{said}</p>

        <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input) }} className="relative z-10 shrink-0 border-t border-line bg-card p-3 sm:p-4" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {/* one pill for both privacy switches; both are off unless the person turns them on */}
            <span className="relative">
              <button type="button" data-guide="coach-consent" aria-expanded={priv} aria-haspopup="dialog" onClick={() => setPriv(o => !o)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink/20 px-3 text-[13px] text-ink hover:border-ink/50 sm:min-h-[36px]">
                <Lock size={13} strokeWidth={1.6} aria-hidden />
                <span>{tc('pillAI', lang)}: <b className="font-medium">{tc(user?.ai_consent ? 'on' : 'off', lang)}</b> · {tc('pillTr', lang)}: <b className="font-medium">{tc(useCtx ? 'on' : 'off', lang)}</b></span>
              </button>
              {priv && (
                <div role="dialog" aria-label={tc('privTitle', lang)} className="surface-float absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-40px))] p-4">
                  <div className="flex items-center justify-between gap-2"><p className="label">{tc('privTitle', lang)}</p>
                    <button type="button" aria-label={tc('close', lang)} onClick={() => setPriv(false)} className="grid h-11 w-11 place-items-center rounded-full text-soft hover:text-ink"><X size={16} aria-hidden /></button></div>
                  <Toggle on={Boolean(user?.ai_consent)} set={v => { api.update({ ai_consent: v }).then(() => refresh()).catch(() => {}) }} label={tc('extAI', lang)} />
                  <p className="mb-3 mt-1 text-[13px] leading-relaxed text-soft"><b className="block font-medium text-ink">{t('coach.shareAI')}</b>{t('coach.shareNote')}</p>
                  <Toggle on={useCtx} set={v => { setUseCtx(v); try { localStorage.setItem('pq.coach.ctx', v ? '1' : '0') } catch { /* storage off */ } }} label={tc('useTr', lang)} />
                  <p className="mt-1 text-[13px] leading-relaxed text-soft">{tc('trNote', lang)}</p>
                </div>
              )}
            </span>
            {useCtx && user && [tc('cAge', lang, { n: user.age }), tc('cScore', lang, { n: rd.score })].map(c => <span key={c} className="label rounded-full border border-forest/40 bg-haze px-2.5 py-1 !text-forest">{c}</span>)}
            {about && <button type="button" onClick={() => setAbout(undefined)} className="label rounded-full border border-amber/60 bg-card px-2.5 py-1 !text-ink hover:border-rust">{tc('cAbout', lang, { x: t(`tr.p.${about}`) })} ×</button>}
            {/* follow-up styles for the last answer, once there is one */}
            {lastQ && !busy && msgs.some(x => x.role === 'assistant' && !x.err) && (['qSimple', 'qMath', 'qHindi'] as const).map(k => <button type="button" key={k} onClick={() => send(`${tc(k, lang)}: ${lastQ}`)} className="min-h-[44px] rounded-full border border-line bg-card px-3 text-[13px] text-ink hover:border-forest focus-visible:border-forest active:scale-[0.97] sm:min-h-[36px]">{tc(k, lang)}</button>)}
          </div>
          <div className="flex items-end gap-2">
            <label htmlFor="ask" className="sr-only">{t('coach.place')}</label>
            <textarea id="ask" ref={ta} rows={1} data-guide="coach-input" className="field coach-ta min-w-0 flex-1 py-3" value={input} onChange={e => setInput(e.target.value)} placeholder={t('coach.place')} maxLength={1000} autoComplete="off"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }} />
            {SR && (
              <button type="button" data-guide="coach-mic" onClick={listen} aria-label={listening ? t('coach.stop') : t('coach.listen')} aria-pressed={listening}
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-md border bg-card ${listening ? 'border-amber text-rust' : 'border-line text-ink hover:border-forest'}`}>
                {listening && <span aria-hidden className="listen-ring absolute inset-0 rounded-md border-2 border-amber" />}
                {listening
                  ? <span aria-hidden className="flex h-4 items-center gap-[3px]">{[0, 1, 2, 3, 4].map(b => <span key={b} className="wave w-[3px] rounded bg-current" style={{ animationDelay: `${b * 0.1}s` }} />)}</span>
                  : <Mic size={18} strokeWidth={1.5} aria-hidden />}
              </button>
            )}
            {busy
              ? <button type="button" className="btn-quiet !min-h-[48px] gap-2" onClick={stop}><Square size={14} aria-hidden />{tc('stop', lang)}</button>
              : <m.button className="btn !min-h-[48px]" disabled={!input.trim()} animate={{ scale: input.trim() ? [1, 1.08, 1] : 0.96 }} transition={spring}>{t('coach.send')}</m.button>}
          </div>
          <p className="label mt-2 flex justify-between gap-3"><span className="truncate">{tc('note', lang)}</span>{input.length > 800 && <span className="num shrink-0" aria-live="polite">{input.length} / 1000</span>}</p>
        </form>
      </m.section>
    </div>
  )
}

/** The coach's reply arrives word by word (all at once under reduced motion). */
function Stream({ text, instant = false }: { text: string; instant?: boolean }) {
  const words = text.split(' ')
  const [n, setN] = useState(() => (prefersLessMotion() ? words.length : 0))
  // an older answer finishes at once when a new question is sent, so nothing above the new question keeps growing
  useEffect(() => { if (instant) setN(words.length) }, [instant, words.length])
  useEffect(() => {
    if (n >= words.length) return
    const id = setTimeout(() => setN(c => c + 1), 28)
    return () => clearTimeout(id)
  }, [n, words.length])
  return <p className="whitespace-pre-wrap text-[16.5px] leading-[1.6] text-ink">{words.slice(0, n).join(' ')}<span className="sr-only">{words.slice(n).join(' ')}</span></p>
}
