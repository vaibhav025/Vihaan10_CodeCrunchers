import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { X } from '../components/ui/icons'
import { useGuide } from './GuideProvider'
import type { Content, Control } from './types'
import DadaJi from './DadaJi'

const zoom = () => Number(document.documentElement.style.getPropertyValue('zoom')) || 1

/**
 * Explain mode. Every element with a note gets a dotted outline. A tap anywhere is stopped in the
 * capture phase, so the real button never runs; Dada Ji explains what it is, what it does and whether it is safe.
 */
export default function Explain({ c }: { c: Content }) {
  const g = useGuide(), u = c.ui
  const [pick, setPick] = useState<{ k: Control | null; box: { top: number; left: number; width: number; height: number } } | null>(null)
  useEffect(() => {
    document.body.classList.add('gd-explain')
    const stop = (e: Event) => {
      const t = e.target as HTMLElement
      if (t.closest?.('[data-gd-ui]')) return
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation()
      if (e.type !== 'click') return
      const el = t.closest<HTMLElement>('[data-guide]')
      const r = (el ?? t).getBoundingClientRect(), z = zoom()
      setPick({ k: el ? c.controls.find(x => x.id === el.dataset.guide) ?? null : null, box: { top: r.top / z - 5, left: r.left / z - 5, width: r.width / z + 10, height: r.height / z + 10 } })
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') g.setExplain(false) }
    const clear = () => setPick(null)
    // click, form submits, and the press that opens a native drop-down are all swallowed
    const kinds = ['click', 'submit', 'mousedown', 'dblclick', 'auxclick', 'contextmenu'] as const
    kinds.forEach(k => document.addEventListener(k, stop, true))
    document.addEventListener('keydown', esc); addEventListener('scroll', clear, true)
    return () => { document.body.classList.remove('gd-explain'); kinds.forEach(k => document.removeEventListener(k, stop, true)); document.removeEventListener('keydown', esc); removeEventListener('scroll', clear, true) }
  }, [c, g])
  return (
    <div data-gd-ui>
      {pick && <span aria-hidden className="pointer-events-none fixed z-[94] rounded-[14px] border-[3px] border-[#E9A23B]" style={pick.box} />}
      <m.div key={pick?.k?.id ?? (pick ? 'none' : 'idle')} role="dialog" aria-live="polite" aria-label={u.a_explain} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="gd-panel fixed inset-x-3 bottom-3 z-[95] rounded-[24px] p-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]">
        <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-3">
          <div className="self-end"><DadaJi pose={!pick ? 'point' : pick.k ? 'talk' : 'think'} size={64} /></div>
          {pick?.k ? (
            <dl className="min-w-0 space-y-2 text-[15px] leading-snug">
              <dt className="font-serif text-[1.15rem] text-ink">{pick.k.label}</dt>
              {(['what', 'happens', 'safe'] as const).map(f => <div key={f}><dt className="label">{u[f]}</dt><dd className="text-ink">{pick.k![f]}</dd></div>)}
            </dl>
          ) : <p className="self-center text-[15.5px] leading-snug text-ink">{pick ? u.explainNone : u.explainOn}</p>}
        </div>
        <button type="button" autoFocus onClick={() => g.setExplain(false)} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-full bg-[#E9A23B] px-4 text-[15px] font-medium text-[#1B2622]"><X size={16} aria-hidden />{u.exit} · {u.a_explain}</button>
      </m.div>
    </div>
  )
}
