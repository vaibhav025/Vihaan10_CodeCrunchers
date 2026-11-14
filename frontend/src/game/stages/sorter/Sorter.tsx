import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { gt } from '../../strings'
import type { EngineProps, L } from '../../types'
import { play } from '../../../lib/sound'
import { starsFromHits } from '../../economy'
import { buzz } from '../kit'

interface Round { bins: [L, L]; items: { n: L; b: 0 | 1 }[] }

/** Conveyor sorter: items ride the belt; swipe them left or right, tap a bin, or use the arrow keys. The belt speeds up gently. */
export default function Sorter({ config, lang, assist, reducedMotion: calm, onComplete }: EngineProps) {
  const rounds = config.params.rounds as Round[]
  const all = rounds.flatMap((r, ri) => r.items.map(it => ({ ...it, ri })))
  const [i, setI] = useState(0)
  const [miss, setMiss] = useState(0)
  const [dir, setDir] = useState<0 | 1 | -1>(0) // where the last item went: bin 0, bin 1, or off the belt
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null)
  const missRef = useRef(0), sx = useRef(0)
  const it = all[i], round = it ? rounds[it.ri] : rounds[rounds.length - 1]
  const travel = Math.max(2.4, 5 - i * 0.16) * (assist ? 1.5 : 1)
  const next = () => {
    if (i + 1 >= all.length) { const n = missRef.current; onComplete({ stars: starsFromHits(n), coins: (all.length - n) * 2, score: Math.round(((all.length - n) / all.length) * 100), detail: gt('r_sorter', lang, { c: all.length - n, t: all.length }) }); return }
    setI(i + 1)
  }
  const put = (b: 0 | 1) => {
    if (!it) return
    const ok = it.b === b
    if (!ok) { missRef.current++; setMiss(missRef.current); play('bad'); buzz(30) } else { play('coin'); buzz(10) }
    setFlash(ok ? 'ok' : 'no'); setDir(b); setTimeout(() => setFlash(null), 350); next()
  }
  const timeout = () => { missRef.current++; setMiss(missRef.current); setDir(-1); play('bad'); next() }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') put(0); if (e.key === 'ArrowRight') put(1) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) })
  return (
    <div className="mx-auto flex h-full max-w-[720px] flex-col justify-center px-5">
      <p className="label text-center">{gt('so_round', lang, { n: (it?.ri ?? rounds.length - 1) + 1, t: rounds.length })} · {gt('hits', lang)} {miss}</p>
      <div className="relative mt-5 h-[150px] overflow-hidden rounded-xl border border-line bg-[repeating-linear-gradient(90deg,rgb(var(--mist))_0_18px,rgb(var(--haze))_18px_36px)]"
        onPointerDown={e => { sx.current = e.clientX }} onPointerUp={e => { const dx = e.clientX - sx.current; if (Math.abs(dx) > 40) put(dx < 0 ? 0 : 1) }}>
        <AnimatePresence custom={dir}>
          {it && <m.div key={i} custom={dir} className="absolute left-1/2 top-1/2 -ml-[110px] -mt-[45px] grid h-[90px] w-[220px] cursor-grab place-items-center rounded-lg border border-line bg-card px-4 text-center shadow-[0_6px_0_rgb(var(--line))]"
            initial={{ x: 420 }} animate={{ x: -420 }} transition={{ duration: travel, ease: 'linear' }} onAnimationComplete={timeout}
            variants={{ out: (d: number) => (calm ? { opacity: 0 } : d === -1 ? { opacity: 0 } : { x: d === 0 ? -260 : 260, y: 140, scale: 0.6, opacity: 0, transition: { duration: 0.3 } }) }} exit="out">
            <span className="font-serif text-[1.35rem] leading-tight text-ink">{it.n[lang]}</span>
          </m.div>}
        </AnimatePresence>
        {flash && <span aria-hidden className={`absolute inset-0 ${flash === 'ok' ? 'bg-forest/10' : 'bg-rust/15'}`} />}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button className="btn game-btn !min-h-[80px] text-[17px]" onClick={() => put(0)}>← {round.bins[0][lang]}</button>
        <button className="btn game-btn game-btn-amber !min-h-[80px] text-[17px]" onClick={() => put(1)}>{round.bins[1][lang]} →</button>
      </div>
      <p className="label mt-4 text-center">{gt('so_hint2', lang)}</p>
    </div>
  )
}
