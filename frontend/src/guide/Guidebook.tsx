import { useNavigate } from 'react-router-dom'
import { useGuide } from './GuideProvider'
import type { Content } from './types'

interface Hit { key: string; title: string; body: string; target?: string; route?: string; score: number }
const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{M}\p{N}₹]+/u).filter(w => w.length > 1)

/** Simple search on the device: count how many of the question's words appear in each entry, titles counting double. */
export function search(c: Content, q: string): Hit[] {
  const qs = words(q)
  if (!qs.length) return []
  const rate = (title: string, body: string) => { const t = words(title), b = words(body); return qs.reduce((s, w) => s + (t.some(x => x.startsWith(w) || w.startsWith(x)) ? 2 : 0) + (b.some(x => x.startsWith(w)) ? 1 : 0), 0) }
  const all: Hit[] = [
    ...c.faq.map((f, i) => ({ key: `q${i}`, title: f.q, body: f.a, target: f.target, route: f.route, score: rate(f.q, f.a) + 0.5 })),
    ...c.features.map(f => ({ key: `f${f.id}`, title: f.title, body: `${f.what} ${f.steps.join(' ')}`, target: f.target, route: f.route, score: rate(f.title, `${f.what} ${f.why}`) })),
    ...c.glossary.map(g => ({ key: `g${g.id}`, title: g.term, body: `${g.def} ${c.ui.eg}: ${g.example}`, score: rate(g.term, g.def) })),
    ...c.controls.map(k => ({ key: `c${k.id}`, title: k.label, body: `${k.what} ${k.happens} ${k.safe}`, target: k.id, score: rate(k.label, k.what) * 0.8 })),
  ]
  return all.filter(h => h.score >= 2).sort((a, b) => b.score - a.score).slice(0, 3)
}
export const isMoney = (c: Content, q: string) => { const s = q.toLowerCase(); return c.money.some(w => s.includes(w)) }

const btn = 'min-h-[48px] rounded-full border border-ink/20 px-4 text-[14.5px] text-ink hover:border-ink/50'

/** Every feature as a card (what it does, why it helps, three steps), then the glossary. Used in the panel and on /help. */
export function Book({ c, plain = false }: { c: Content; plain?: boolean }) {
  const g = useGuide(), nav = useNavigate(), u = c.ui
  return (
    <div className="space-y-2.5">
      {c.features.map(f => (
        <article key={f.id} className="gd-card">
          <h3 className="font-serif text-[1.1rem] text-ink">{f.title}</h3>
          <p className="mt-1 text-[14.5px] leading-snug text-ink">{f.what}</p>
          <p className="mt-1.5 text-[13.5px] leading-snug text-soft"><span className="label mr-1.5">{u.why}</span>{f.why}</p>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[14.5px] leading-snug text-ink">{f.steps.map(s => <li key={s}>{s}</li>)}</ol>
          {!plain && <div className="mt-3 flex flex-wrap gap-2">
            {f.target && <button type="button" className={btn} onClick={() => g.showMe(f.target!, f.route)}>{u.show}</button>}
            <button type="button" className={btn} onClick={() => { g.setOpen(false); nav(f.route) }}>{u.take}</button>
          </div>}
        </article>
      ))}
      <h3 className="label pt-3">{u.glossary}</h3>
      <dl className="space-y-2">{c.glossary.map(w => (
        <div key={w.id} className="gd-card"><dt className="font-serif text-[1.05rem] text-ink">{w.term}</dt><dd className="mt-1 text-[14.5px] leading-snug text-ink">{w.def}</dd><dd className="mt-1 text-[13.5px] leading-snug text-soft"><span className="label mr-1.5">{u.eg}</span>{w.example}</dd></div>
      ))}</dl>
    </div>
  )
}

/** Search results: the top three matches, a hand-off to Dadi for money questions, and a helpful / not helpful vote kept on this device. */
export function Results({ c, q }: { c: Content; q: string }) {
  const g = useGuide(), nav = useNavigate(), u = c.ui
  const hits = search(c, q), money = isMoney(c, q), voted = g.fb[q]
  const dadi = () => { g.setOpen(false); nav('/coach', { state: { ask: q } }) }
  return (
    <div className="space-y-2.5">
      {money && (
        <div className="gd-card !border-[#E9A23B]/60">
          <p className="text-[15px] text-ink">{u.moneyQ}</p>
          <button type="button" className="mt-2 flex min-h-[48px] items-center gap-2 rounded-full bg-[#E9A23B] px-4 text-[15px] font-medium text-[#1B2622]" onClick={dadi}>
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-[#1B2622] text-[13px] text-[#F3EBDA]">द</span>{u.askDadi}
          </button>
        </div>
      )}
      {hits.map(h => (
        <article key={h.key} className="gd-card">
          <h3 className="font-serif text-[1.05rem] text-ink">{h.title}</h3>
          <p className="mt-1 text-[14.5px] leading-snug text-soft">{h.body}</p>
          {h.target && <button type="button" className={`${btn} mt-2.5`} onClick={() => g.showMe(h.target!, h.route)}>{u.show}</button>}
        </article>
      ))}
      {!hits.length && <div className="gd-card"><p className="text-[15px] text-ink">{u.noResults}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {!money && <button type="button" className={btn} onClick={dadi}>{u.askDadi}</button>}
          <a className={`${btn} inline-flex items-center`} href="/privacy">{u.contact}</a>
        </div></div>}
      <div className="flex items-center gap-2 pt-1 text-[14px] text-soft" aria-live="polite">
        {voted ? u.thanks : <>{u.helpful}
          <button type="button" aria-label={u.yes} className="grid h-12 w-12 place-items-center rounded-full border border-ink/20 text-[18px] hover:border-ink/50" onClick={() => g.save({ fb: { ...g.fb, [q]: 1 } })}>👍</button>
          <button type="button" aria-label={u.no} className="grid h-12 w-12 place-items-center rounded-full border border-ink/20 text-[18px] hover:border-ink/50" onClick={() => g.save({ fb: { ...g.fb, [q]: -1 } })}>👎</button></>}
      </div>
    </div>
  )
}
