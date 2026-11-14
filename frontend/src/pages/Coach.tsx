import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import WorldStill from '../components/world/WorldStill'
import { spring } from '../ui/motion'
import { prefersLessMotion } from '../lib/motionPref'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { answerOffline, factSheet, retrieve } from '../lib/rag'
import { getMoney } from '../lib/tracker'
import { Check, Coins, Info, Mic, Plus, RotateCcw, Square, Volume2 } from '../components/ui/icons'
import Segmented from '../ui/Segmented'
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
const topicOf = (q: string): Topic => (/tax|80c|कर|टैक्स/i.test(q) ? 'tax' : /nps|tier|retire|pension|रिटायर|निवृत्त|पेंशन|पेन्शन/i.test(q) ? 'retire' : /risk|insur|spread|term|बीमा|विमा|जोखि/i.test(q) ? 'risk' : 'money')
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
  const end = useRef<HTMLDivElement>(null)
  const rec = useRef<any>(null)
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])
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

  const followUps = (q: string) => { const tp = topicOf(q); return [...[1, 2].map(n => tc(`st_${tp}${n}`, lang)), ...TOPICS.filter(x => x !== tp).map(x => tc(`st_${x}1`, lang))].filter(x => x !== q).slice(0, 3) }

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
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
      if (r) { reply = r.reply; if (r.sources?.length) sources = r.sources; setOffline(r.provider === 'private'); if (SAVE.test(q.toLowerCase()) && user) await briefing(q).catch(() => '') }
      else {
        // no AI connected: the built-in adviser answers from the same retrieved notes (and the tracker, if allowed)
        setOffline(true)
        const basic = lang !== 'en' && docs[0] && ['nps', 'tier', 'tax'].includes(docs[0].id) && !/\d{3,}/.test(q)
        if (basic || !user || !useCtx) reply = await briefing(q)
        else { const a = answerOffline(q, user, docs); reply = a.text; cite = a.cite }
      }
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: tc('failed', lang), at: now(), err: true }]); setBusy(false); cite = undefined; fig = undefined; return
    }
    const msg: Msg = { role: 'assistant', content: reply, at: now(), cite, fig, sources, follow: followUps(q) } // capture before the reset below
    setMsgs(m => [...m, msg])
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
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex min-h-[40px] items-center gap-2 rounded px-1 text-[13px] text-ink hover:bg-haze">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-forest' : 'bg-mist'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></span>{label}
    </button>
  )
  return (
    <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-5 sm:px-8 lg:h-[calc(100dvh-150px)] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
      {/* the coach, topics and starters */}
      <m.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="band overflow-y-auto p-6 lg:h-full">
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/10"><Sidekick id="dadi" size={64} /></span>
            <div><h1 className="text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.1]">{tc('coachName', lang)}</h1>
              <p className="label mt-1 flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#9AD08F]' : 'bg-[#FFFFFF]'}`} />{tc('calcBacked', lang)}</p></div>
          </div>
          <div className="mt-5 [&_*]:!text-[13px]"><Segmented label={tc('tp_money', lang)} value={topic} onChange={setTopic} options={TOPICS.map(x => ({ id: x, name: tc(`tp_${x}`, lang) }))} /></div>
          <ul className="mt-3 grid gap-2">
            {[1, 2].map((n, i) => { const q = tc(`st_${topic}${n}`, lang); return (
              <m.li key={topic + n} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.06 }}>
                <button onClick={() => send(q)} disabled={busy} className="tile pressable flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] hover:border-[#FFFFFF]/60 focus-visible:border-[#FFFFFF] disabled:opacity-60">{q}</button>
              </m.li>) })}
          </ul>
          <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4"><p className="label !text-[#FFFFFF]">{tc('tip', lang)}</p><p className="mt-1 text-[15px] leading-relaxed">{tip}</p></div>
          {!hasData && <Link to="/tracker" className="mt-4 block rounded-lg border border-[#FFFFFF]/50 px-4 py-3 text-[14px] text-[#FFFFFF] hover:bg-white/5">{t('coach.noData')}</Link>}
          {offline && <p className="mt-5 border-l-2 border-[#FFFFFF] pl-3 text-[13px] leading-relaxed text-[#FFFFFF]/70">{t('coach.offline')}</p>}
        </div>
      </m.aside>

      {/* the conversation */}
      <m.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }} className="hud relative flex min-h-[75dvh] flex-col overflow-hidden lg:h-full lg:min-h-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card/95 px-5 py-3">
          <p className="font-serif text-[1.2rem] text-ink">{t('nav.coach')}</p>
          <button className="row !min-h-[40px] !w-auto shrink-0 gap-1.5 !px-3 text-[14px]" onClick={() => { setMsgs([]); setAbout(undefined); window.speechSynthesis?.cancel() }}><Plus size={15} />{tc('newChat', lang)}</button>
        </header>
        <div className="relative flex-1 space-y-5 overflow-y-auto p-5 sm:p-7" role="log" aria-live="polite" aria-label={t('nav.coach')}>
          <WorldStill vitality={0.9} level={3} className="pointer-events-none absolute bottom-4 right-4 h-[140px] w-[190px] opacity-[0.08]" />
          {!online && <p className="rounded-md border border-amber/50 bg-haze px-3 py-2 text-[14px] text-ink">{tc('offline', lang)}</p>}
          <div className="flex gap-3">
            <span aria-hidden className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest"><span className="h-3 w-3 rounded-full bg-amber-soft" /></span>
            <div className="max-w-[88%]"><div className="rounded-xl rounded-tl-sm border border-line bg-haze px-5 py-4"><Stream text={tc('hello', lang)} /></div>
              {msgs.length === 0 && <><p className="label mt-3">{tc('tryAsk', lang)}</p><div className="mt-1.5 flex flex-wrap gap-2">{TOPICS.map(x => tc(`st_${x}1`, lang)).map(q => <button key={q} onClick={() => send(q)} className="min-h-[40px] rounded-full border border-line bg-card px-3 text-[14px] text-ink hover:-translate-y-0.5 hover:border-forest focus-visible:border-forest active:scale-[0.97]">{q}</button>)}</div></>}</div>
          </div>
          {msgs.map((msg, i) => (
            <m.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 24 : -24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={spring}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && <span aria-hidden className="mt-6 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest"><span className="h-3 w-3 rounded-full bg-amber-soft" /></span>}
              <div className={msg.role === 'user' ? 'max-w-[80%]' : 'min-w-0 max-w-[88%]'}>
                <Label className={msg.role === 'user' ? 'block text-right' : ''}>{msg.at} · {t(msg.role === 'user' ? 'coach.you' : 'coach.coach')}</Label>
                {msg.role === 'user'
                  ? <p className="mt-1 whitespace-pre-wrap rounded-xl rounded-tr-sm bg-forest px-4 py-3 leading-relaxed text-on-forest shadow-paper">{msg.content}</p>
                  : msg.err ? <div className="mt-1 flex flex-wrap items-center gap-3 rounded-xl border border-rust/50 bg-card px-4 py-3"><span className="text-ink">{msg.content}</span><button className="row !min-h-[40px] gap-1.5 !px-3" onClick={retry}><RotateCcw size={14} />{tc('retry', lang)}</button></div>
                  : <div className="mt-1 rounded-xl rounded-tl-sm border border-line bg-haze px-5 py-4"><Stream text={msg.content} /></div>}
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
                    {msg.follow && msg.follow.length > 0 && i === msgs.length - 1 && <><p className="label mt-2">{tc('askNext', lang)}</p><div className="mt-1 flex flex-wrap gap-2">{msg.follow.map(q => <button key={q} onClick={() => send(q)} disabled={busy} className="min-h-[40px] rounded-full border border-line bg-card px-3 text-[14px] text-ink hover:-translate-y-0.5 hover:border-forest focus-visible:border-forest active:scale-[0.97] disabled:opacity-60">{q}</button>)}</div></>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => nav('/tracker', { state: { extra: msg.fig?.monthly ?? 0 } })}>{tc('trySim', lang)}</button>
                      {msg.fig && <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => nav('/tracker', { state: { plan: msg.fig!.monthly } })}>{tc('addPlan', lang)}</button>}
                      {hasData && <button className="row !min-h-[40px] !px-3 text-[14px]" onClick={() => setInput(tc(`ask_${weakest(rd).key}`, lang))}>{tc('askPillar', lang)}</button>}
                    </div>
                  </>
                )}
              </div>
            </m.div>
          ))}
          <AnimatePresence>
            {busy && (
              <m.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3" aria-label={t('coach.thinking')}>
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-forest"><span className="h-3 w-3 rounded-full bg-amber-soft" /></span>
                <span className="flex items-center gap-1.5 rounded-xl border border-line bg-haze px-4 py-3">{[0, 1, 2].map(d => <span key={d} className="dot h-2 w-2 rounded-full bg-soft" style={{ animationDelay: `${d * 0.15}s` }} />)}</span>
              </m.div>
            )}
          </AnimatePresence>
          <div ref={end} />
        </div>

        <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input) }} className="border-t border-line bg-paper/60 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center"><Toggle on={Boolean(user?.ai_consent)} set={v => { api.update({ ai_consent: v }).then(() => refresh()).catch(() => {}) }} label={tc('extAI', lang)} />
              <button type="button" className="tip-host relative grid h-9 w-9 place-items-center rounded text-soft hover:text-ink" aria-label={`${tc('info', lang)}: ${tc('extAI', lang)}`}><Info size={14} />
                <span role="tooltip" className="tip pointer-events-none absolute bottom-full left-0 z-20 mb-1 w-[min(320px,80vw)] rounded-md bg-ink p-3 text-left text-[13px] leading-relaxed text-paper opacity-0 shadow-lg transition-opacity"><b className="block">{t('coach.shareAI')}</b>{t('coach.shareNote')}</span></button></span>
            <span className="flex items-center"><Toggle on={useCtx} set={v => { setUseCtx(v); try { localStorage.setItem('pq.coach.ctx', v ? '1' : '0') } catch { /* storage off */ } }} label={tc('useTr', lang)} />
              <button type="button" className="tip-host relative grid h-9 w-9 place-items-center rounded text-soft hover:text-ink" aria-label={`${tc('info', lang)}: ${tc('useTr', lang)}`}><Info size={14} />
                <span role="tooltip" className="tip pointer-events-none absolute bottom-full left-0 z-20 mb-1 w-[min(280px,80vw)] rounded-md bg-ink p-3 text-left text-[13px] leading-relaxed text-paper opacity-0 shadow-lg transition-opacity">{tc('trNote', lang)}</span></button></span>
          </div>
          {(useCtx && user || about) && <div className="mb-2 flex flex-wrap gap-1.5" aria-label={tc('useTr', lang)}>
            {useCtx && user && [tc('cAge', lang, { n: user.age }), tc('cScore', lang, { n: rd.score })].map(c => <span key={c} className="label rounded-full border border-forest/40 bg-haze px-2.5 py-1 !text-forest">{c}</span>)}
            {about && <button type="button" onClick={() => setAbout(undefined)} className="label rounded-full border border-amber/60 bg-card px-2.5 py-1 !text-ink hover:border-rust">{tc('cAbout', lang, { x: t(`tr.p.${about}`) })} ×</button>}
          </div>}
          {lastQ && <div className="mb-2 flex flex-wrap gap-1.5">{(['qSimple', 'qMath', 'qHindi'] as const).map(k => <button type="button" key={k} disabled={busy} onClick={() => send(`${tc(k, lang)}: ${lastQ}`)} className="min-h-[36px] rounded-full border border-line bg-card px-3 text-[13px] text-ink hover:border-forest focus-visible:border-forest active:scale-[0.97] disabled:opacity-60">{tc(k, lang)}</button>)}</div>}
          <div className="flex gap-2">
            <label htmlFor="ask" className="sr-only">{t('coach.place')}</label>
            <input id="ask" className="field min-w-0 flex-1 focus-visible:shadow-[0_0_0_4px_rgb(var(--forest)/0.15)]" value={input} onChange={e => setInput(e.target.value)} placeholder={t('coach.place')} maxLength={1000} autoComplete="off" />
            {SR && (
              <button type="button" onClick={listen} aria-label={listening ? t('coach.stop') : t('coach.listen')} aria-pressed={listening}
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-md border bg-card ${listening ? 'border-amber text-rust' : 'border-line text-ink hover:border-forest'}`}>
                {listening && <span aria-hidden className="listen-ring absolute inset-0 rounded-md border-2 border-amber" />}
                {listening
                  ? <span aria-hidden className="flex h-4 items-center gap-[3px]">{[0, 1, 2, 3, 4].map(b => <span key={b} className="wave w-[3px] rounded bg-current" style={{ animationDelay: `${b * 0.1}s` }} />)}</span>
                  : <Mic size={18} strokeWidth={1.5} aria-hidden />}
              </button>
            )}
            <m.button className="btn" disabled={!input.trim() || busy} animate={{ scale: input.trim() ? [1, 1.08, 1] : 0.96 }} transition={spring}>{t('coach.send')}</m.button>
          </div>
          <p className="label mt-2">{tc('note', lang)}</p>
        </form>
      </m.section>
    </div>
  )
}

/** The coach's reply arrives word by word (all at once under reduced motion). */
function Stream({ text }: { text: string }) {
  const words = text.split(' ')
  const [n, setN] = useState(() => (prefersLessMotion() ? words.length : 0))
  useEffect(() => {
    if (n >= words.length) return
    const id = setTimeout(() => setN(c => c + 1), 28)
    return () => clearTimeout(id)
  }, [n, words.length])
  return <p className="whitespace-pre-wrap font-serif text-[19px] leading-relaxed text-ink">{words.slice(0, n).join(' ')}<span className="sr-only">{words.slice(n).join(' ')}</span></p>
}
