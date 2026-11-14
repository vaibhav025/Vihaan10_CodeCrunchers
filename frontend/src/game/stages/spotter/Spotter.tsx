import { useEffect, useState } from 'react'
import { m } from 'framer-motion'
import { gt } from '../../strings'
import type { EngineProps, L } from '../../types'
import { play } from '../../../lib/sound'
import { starsFromScore } from '../../economy'
import { Sidekick } from '../../character/Character'
import { buzz } from '../kit'

interface Part { t: L; bad?: boolean; why?: L }
interface Scene { kind: 'sms' | 'upi' | 'statement'; from: L; parts: Part[]; seconds: number }

/** Scam spotter: tap every suspicious part of a message before the timer runs out. Jugaad Crow cheers or facepalms. */
export default function Spotter({ config, lang, assist, reducedMotion: calm, onComplete }: EngineProps) {
  const scenes = config.params.scenes as Scene[]
  const [si, setSi] = useState(0)
  const [hit, setHit] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [tally, setTally] = useState({ found: 0, bad: 0, wrong: 0 })
  const [crow, setCrow] = useState<'cheer' | 'facepalm' | null>(null)
  const sc = scenes[si], secs = sc.seconds * (assist ? 1.5 : 1)
  const bads = sc.parts.filter(p => p.bad).length
  const advance = (h = hit, w = wrong) => {
    const t = { found: tally.found + h.length, bad: tally.bad + bads, wrong: tally.wrong + w.length }
    if (si + 1 >= scenes.length) { const score = Math.max(0, Math.round(((t.found - t.wrong * 0.5) / t.bad) * 100)); onComplete({ stars: starsFromScore(score), coins: t.found * 3, score, detail: gt('r_spot', lang, { f: t.found, t: t.bad }) }); return }
    setTally(t); setSi(si + 1); setHit([]); setWrong([])
  }
  useEffect(() => { const id = setTimeout(() => advance(), secs * 1000); return () => clearTimeout(id) }, [si]) // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (k: number) => {
    if (hit.includes(k) || wrong.includes(k)) return
    if (sc.parts[k].bad) {
      const h = [...hit, k]; setHit(h); setCrow('cheer'); play('coin'); buzz(12)
      if (h.length === bads) setTimeout(() => advance(h, wrong), 1100)
    } else { setWrong([...wrong, k]); setCrow('facepalm'); play('bad'); buzz(30) }
    setTimeout(() => setCrow(null), 900)
  }
  const last = hit.length ? sc.parts[hit[hit.length - 1]].why : undefined
  const shell = sc.kind === 'statement' ? 'rounded-md bg-card font-mono text-[14px]' : 'rounded-2xl rounded-tl-sm bg-card'
  return (
    <div className="mx-auto flex h-full max-w-[640px] flex-col justify-center px-5">
      <div className="flex items-center justify-between">
        <p className="label">{gt('sp_scene', lang, { n: si + 1, t: scenes.length })} · {gt('sp_left', lang, { n: bads - hit.length })}</p>
        <m.div animate={calm ? {} : crow === 'cheer' ? { y: [0, -14, 0], rotate: [0, -8, 0] } : crow === 'facepalm' ? { rotate: [0, 18, 18, 0] } : {}} transition={{ duration: 0.6 }}><Sidekick id="crow" size={52} /></m.div>
      </div>
      <span className="mt-2 block h-1.5 overflow-hidden rounded bg-mist"><m.span key={si} className="block h-full origin-left bg-amber" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: secs, ease: 'linear' }} /></span>
      <div className={`hud mt-4 p-5 ${shell}`}>
        <p className="label mb-2">{gt(`sp_${sc.kind}`, lang)} · {sc.from[lang]}</p>
        <p className="text-[17px] leading-[2] text-ink">
          {sc.parts.map((p, k) => (
            <button key={k} onClick={() => tap(k)} className={`mx-0.5 rounded px-1 text-left transition-colors ${hit.includes(k) ? 'bg-rust/20 text-rust line-through decoration-2' : wrong.includes(k) ? 'bg-mist' : 'hover:bg-haze'}`}>{p.t[lang]}</button>
          ))}
        </p>
      </div>
      <p className="mt-3 min-h-[3em] text-[15px] text-ink" aria-live="polite">{crow === 'facepalm' ? gt('sp_fine', lang) : last?.[lang] ?? gt('sp_hint', lang)}</p>
    </div>
  )
}
