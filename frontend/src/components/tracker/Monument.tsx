import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { spring } from '../../ui/motion'
import type { Part } from '../../lib/readiness'
import { tc } from './strings'

const W = 34, DX = 14, DY = -8, HMAX = 150, BASE = 196, GAP = 62, X0 = 22

/** The six pillars as an isometric monument. Each pillar rises to its share; a dashed outline shows the rest. Tap, hover or focus for a card. */
export default function Monument({ parts, onAct, onAsk }: { parts: Part[]; onAct: (k: Part['key']) => void; onAsk: (k: Part['key']) => void }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  useEffect(() => { const c = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(null) }; addEventListener('pointerdown', c); return () => removeEventListener('pointerdown', c) }, [])
  const p = open !== null ? parts[open] : null
  return (
    <div ref={box} className="relative" onMouseLeave={() => setOpen(null)}>
      <svg viewBox="0 0 400 230" className="w-full overflow-visible" role="group" aria-label={t('tr.how')}>
        <path d={`M8 ${BASE + 4} L${X0 + GAP * 6 + 4} ${BASE + 4} L${X0 + GAP * 6 + 4 + DX} ${BASE + 4 + DY + 20} L${8 + DX} ${BASE + 4 + DY + 20} Z`} fill="rgb(255 255 255 / 0.06)" />
        {parts.map((pt, i) => {
          const x = X0 + i * GAP, f = Math.max(pt.got / pt.max, 0.02), gain = Math.round(pt.max - pt.got)
          return (
            <m.g key={pt.key} tabIndex={0} role="button" aria-label={`${t(`tr.p.${pt.key}`)}: ${Math.round(pt.got)} / ${pt.max}`} aria-expanded={open === i}
              onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => setOpen(open === i ? null : i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAct(pt.key) } }}
              whileHover={{ y: -4 }} className="cursor-pointer outline-none [&:focus-visible_.mon-outline]:stroke-[#FFFFFF] [&:focus-visible_.mon-outline]:[stroke-width:2.5]">
              {/* potential: dashed outline up to the max */}
              <path className="mon-outline" d={`M${x} ${BASE} V${BASE - HMAX} L${x + DX} ${BASE - HMAX + DY} L${x + W + DX} ${BASE - HMAX + DY} V${BASE + DY} M${x} ${BASE - HMAX} H${x + W} V${BASE} M${x + W} ${BASE - HMAX} L${x + W + DX} ${BASE - HMAX + DY}`} fill="none" stroke="rgb(255 255 255 / 0.28)" strokeDasharray="4 4" />
              <m.g style={{ originX: 0.5, originY: 1 }} initial={{ scaleY: 0.02 }} animate={{ scaleY: f }} transition={{ ...spring, delay: 0.15 + i * 0.08 }}>
                <rect x={x} y={BASE - HMAX} width={W} height={HMAX} fill="#E9A866" />
                <path d={`M${x + W} ${BASE} L${x + W + DX} ${BASE + DY} V${BASE - HMAX + DY} L${x + W} ${BASE - HMAX} Z`} fill="#B97A35" />
              </m.g>
              <m.path d={`M${x} ${BASE} L${x + W} ${BASE} L${x + W + DX} ${BASE + DY} L${x + DX} ${BASE + DY} Z`} fill="#FFFFFF" initial={{ y: -HMAX * 0.02 }} animate={{ y: -HMAX * f }} transition={{ ...spring, delay: 0.15 + i * 0.08 }} />
              <text x={x + W / 2 + 6} y={BASE + 22} textAnchor="middle" className="num" fontSize="13" fill="#FFFFFF">{Math.round(pt.got)}<tspan fontSize="10" fill="rgb(247 245 232 / 0.6)">/{pt.max}</tspan></text>
              {gain > 0 && open !== i && <text x={x + W / 2 + 6} y={BASE - HMAX - 6} textAnchor="middle" fontSize="10" fill="rgb(247 245 232 / 0.55)">+{gain}</text>}
            </m.g>
          )
        })}
      </svg>
      <ol className="grid grid-cols-6 gap-1 text-center" aria-hidden>{parts.map(pt => <li key={pt.key} className="label !text-[10px] leading-tight [overflow-wrap:anywhere]">{t(`tr.p.${pt.key}`)}</li>)}</ol>
      <AnimatePresence>
        {p && open !== null && (
          <m.div key={p.key} role="dialog" aria-label={t(`tr.p.${p.key}`)} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={spring}
            className="surface-float absolute bottom-[calc(100%-40px)] z-20 w-[min(280px,92vw)] p-4 text-left text-ink" style={{ left: `clamp(0px, calc(${((open + 0.5) / 6) * 100}% - 140px), calc(100% - 280px))` }}>
            <div className="flex items-baseline justify-between gap-3"><p className="font-serif text-[1.2rem] leading-tight">{t(`tr.p.${p.key}`)}</p><p className="num text-lg">{Math.round(p.got)}<span className="label"> / {p.max}</span></p></div>
            <p className="mt-1 text-[14px] text-soft">{t(`tr.d.${p.key}`, p.vars)}</p>
            {p.max - p.got >= 0.5 && <p className="mt-2 text-[15px]"><span className="label mr-1 rounded bg-forest px-1.5 py-0.5 !text-on-forest">+{Math.round(p.max - p.got)}</span>{t(`tr.fix.${p.key}`, { n: Math.round(p.max - p.got) })}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn game-btn !min-h-[40px] flex-1 !px-3 text-[14px]" onClick={() => { setOpen(null); onAct(p.key) }}>{t('tr.do')}</button>
              <button className="row !min-h-[40px] flex-1 justify-center !px-3 text-[14px]" onClick={() => onAsk(p.key)}>{tc('askThis', lang)}</button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
