import { Link } from 'react-router-dom'
import '../guide/guide.css'
import { useContent } from '../guide/content'
import { Book } from '../guide/Guidebook'
import { DadaFace } from '../guide/DadaJi'
import { useI18n } from '../lib/i18n'

/** The guidebook as a plain page: the fallback if Dada Ji cannot load, and a readable, linkable help page. */
export default function Help() {
  const c = useContent()
  const { t } = useI18n()
  if (!c) return <p className="label grid min-h-[40vh] place-items-center">{t('common.loading')}</p>
  const u = c.ui
  return (
    <div className="mx-auto w-full max-w-[820px] space-y-8 px-5 sm:px-8">
      <header className="flex items-center gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[#E9A23B]/70 bg-[#1B2622]"><DadaFace size={72} /></span>
        <div><h1 className="text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.03em] text-ink">{u.helpPage}</h1><p className="mt-1 text-[16px] leading-relaxed text-soft">{u.helpIntro}</p></div>
      </header>
      <section aria-labelledby="h-faq"><h2 id="h-faq" className="label">{u.faq}</h2>
        <dl className="mt-3 space-y-2">{c.faq.map(f => <div key={f.q} className="gd-card"><dt className="font-serif text-[1.05rem] text-ink">{f.q}</dt><dd className="mt-1 text-[15px] leading-snug text-soft">{f.a}</dd></div>)}</dl>
      </section>
      <section aria-labelledby="h-book"><h2 id="h-book" className="label">{u.a_book}</h2><div className="mt-3"><Book c={c} plain /></div></section>
      <section aria-labelledby="h-ctl"><h2 id="h-ctl" className="label">{u.controls}</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">{c.controls.map(k => <div key={k.id} className="gd-card text-[14.5px] leading-snug"><dt className="font-serif text-[1.05rem] text-ink">{k.label}</dt><dd className="mt-1 text-ink">{k.what}</dd><dd className="mt-1 text-soft">{k.happens}</dd><dd className="mt-1 text-soft">{k.safe}</dd></div>)}</dl>
      </section>
      <Link to="/" className="link !min-h-[48px]">← SixtyFy</Link>
    </div>
  )
}
