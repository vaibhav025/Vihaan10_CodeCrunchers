import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { gt } from '../../strings'
import type { EngineProps } from '../../types'
import { Label } from '../../../components/ui/kit'
import { getMoney, norm, totals } from '../../../lib/tracker'
import { spring } from '../../../ui/motion'
import { play } from '../../../lib/sound'
import { buzz } from '../kit'

const SHIELDS = ['ef', 'ins', 'div'] as const
type Sh = typeof SHIELDS[number]
const STORMS: { k: string; needs: Sh }[] = [{ k: 'job', needs: 'ef' }, { k: 'med', needs: 'ins' }, { k: 'mkt', needs: 'div' }]

/** Stress Test: place shields before three storms. The vault holds or cracks; the result is months of runway. */
export default function Boss({ config, lang, assist, reducedMotion: calm, onComplete }: EngineProps) {
  const p = config.params as { tokens: number; needs: Record<Sh, number> }
  const [put, setPut] = useState<Record<Sh, number>>({ ef: 2, ins: 1, div: 1 })
  const [n, setN] = useState(-1) // -1 preparing, 0..2 storms, 3 done
  const left = p.tokens - put.ef - put.ins - put.div
  const held = (s: Sh) => put[s] >= p.needs[s]
  const runway = Math.max(0, put.ef - (held('ins') ? 0 : 2) - (held('div') ? 0 : 1))
  const money = norm(getMoney()), real = money.expenses ? totals(money, 0).liquid / money.expenses : null
  useEffect(() => {
    if (n < 0) return
    if (n >= STORMS.length) { const ok = STORMS.filter(s => held(s.needs)).length; const t = setTimeout(() => onComplete({ stars: (ok === 3 ? 3 : ok === 2 ? 2 : 1), coins: ok * 8, score: runway, detail: gt('r_boss2', lang, { m: runway, h: ok }) }), 1200); return () => clearTimeout(t) }
    const ok = held(STORMS[n].needs); play(ok ? 'good' : 'bad'); buzz(ok ? 20 : [40, 40, 60])
    const t = setTimeout(() => setN(n + 1), calm ? 900 : 1700); return () => clearTimeout(t)
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const storm = n >= 0 && n < STORMS.length ? STORMS[n] : null, cracked = STORMS.slice(0, Math.max(n + 1, 0)).filter(s => !held(s.needs)).length
  return (
    <div className="h-full overflow-y-auto px-5 py-6">
      <div className="mx-auto max-w-[720px]">
        <p className="text-center font-serif text-[clamp(1.3rem,3.2vw,1.8rem)] leading-snug text-ink">{storm ? gt(`bs_${storm.k}`, lang) : n >= STORMS.length ? gt('r_boss2', lang, { m: runway, h: STORMS.length - cracked }) : gt('bs_prep2', lang, { n: p.tokens })}</p>
        <div className="relative mx-auto mt-5 h-[170px] w-[200px]">
          {storm && <m.div key={n} className="absolute -top-2 left-1/2 -ml-[60px] w-[120px] rounded-full bg-[#55635A] py-2 text-center font-mono text-[12px] uppercase text-white" initial={{ y: -60, opacity: 0 }} animate={{ y: 30, opacity: [0, 1, 1, 0] }} transition={{ duration: calm ? 0.4 : 1.3 }}>{gt(`bs_${storm.k}_s`, lang)}</m.div>}
          <m.svg viewBox="0 0 200 170" className="h-full w-full" animate={storm && !calm ? (held(storm.needs) ? { scale: [1, 1.04, 1] } : { x: [0, -8, 8, -5, 0] }) : {}} transition={{ duration: 0.5, delay: calm ? 0 : 0.9 }} aria-hidden>
            <rect x="30" y="40" width="140" height="120" rx="14" fill="#55635A" /><rect x="42" y="52" width="116" height="96" rx="10" fill="#6E7D72" />
            <circle cx="100" cy="100" r="28" fill="#3E4A42" /><path d="M100 76v48M76 100h48" stroke="#C9CCC4" strokeWidth="5" strokeLinecap="round" />
            {cracked > 0 && <path d="M60 52l14 30-10 18 16 22M150 70l-18 16 8 22" stroke="#F3EAD6" strokeWidth="3" fill="none" />}
            {cracked > 1 && <path d="M120 148l-6-24 14-14-4-20" stroke="#F3EAD6" strokeWidth="3" fill="none" />}
          </m.svg>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SHIELDS.map(s => (
            <div key={s} className={`hud p-4 text-center ${n >= 0 && STORMS.slice(0, n + 1).some(x => x.needs === s) ? (held(s) ? '!border-forest' : '!border-rust') : ''}`}>
              <Label>{gt(`bs_${s}`, lang)}</Label>
              <div className="my-2 flex min-h-[28px] flex-wrap justify-center gap-1">{Array.from({ length: put[s] }, (_, k) => <m.span layout key={k} transition={spring} className="h-6 w-6 rounded-md bg-amber" />)}</div>
              {assist && <p className="label">{gt('bs_needs', lang, { n: p.needs[s] })}</p>}
              {n < 0 && <div className="mt-2 flex justify-center gap-2">
                <button className="row !min-h-[44px] !px-4" disabled={put[s] <= 0} aria-label={`− ${gt(`bs_${s}`, lang)}`} onClick={() => { setPut({ ...put, [s]: put[s] - 1 }); play('tick') }}>−</button>
                <button className="row !min-h-[44px] !px-4" disabled={left <= 0} aria-label={`+ ${gt(`bs_${s}`, lang)}`} onClick={() => { setPut({ ...put, [s]: put[s] + 1 }); play('tick') }}>+</button>
              </div>}
            </div>
          ))}
        </div>
        {n < 0 && <><p className="label mt-4 text-center">{gt('bs_left', lang, { n: left })}</p><button className="btn game-btn mx-auto mt-4 flex min-w-[220px]" onClick={() => setN(0)}>{gt('bs_go', lang)}</button></>}
        {real !== null && <p className="label mt-5 text-center">{gt('bs_real', lang, { n: real.toFixed(1) })}</p>}
      </div>
    </div>
  )
}
