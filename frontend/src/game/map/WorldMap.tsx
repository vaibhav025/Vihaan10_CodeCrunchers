import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { m } from 'framer-motion'
import { ArrowDownUp, CloudLightning, Footprints, Gift, GitFork, Grid3x3, Lock, MessageSquare, Package, Star } from '../../components/ui/icons'
import { gt } from '../strings'
import type { StageType, WorldDef } from '../types'
import type { Lang } from '../../lib/i18n'
import { prefersLessMotion } from '../../lib/motionPref'
import { Character, Sidekick } from '../character/Character'
import type { Look } from '../character/roster'
import { Route, ScanSearch, Snowflake } from '../../components/ui/icons'

/** Marker kind: the shape and icon a stage shows on the map. */
export const kindOf = (s: { type: StageType; params: Record<string, unknown> }) => (s.params.mode === 'tutorial' ? 'tutorial' : s.type)
export const KIND_ICON: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = { tutorial: Route, snowball: Snowflake, runner: Footprints, hopper: Grid3x3, fork: GitFork, sorter: ArrowDownUp, spotter: ScanSearch, boss: CloudLightning }
const KIND_TINT: Record<string, string> = { tutorial: 'rgb(var(--leaf))', runner: 'rgb(var(--forest))', snowball: '#7FA3A6', hopper: 'rgb(var(--rust))', fork: 'rgb(var(--amber))', sorter: 'rgb(var(--thriving))', spotter: 'rgb(var(--critical))', boss: 'rgb(var(--ink))' }

const W = 1960, H = 440
const P = Array.from({ length: 10 }, (_, i) => ({ x: 150 + i * 184, y: 262 + Math.sin(i * 1.15) * 78 }))
const ROAD = P.map((p, i) => (i ? `C ${P[i - 1].x + 92} ${P[i - 1].y}, ${p.x - 92} ${p.y}, ${p.x} ${p.y}` : `M ${p.x - 150} ${p.y + 20} L ${p.x} ${p.y}`)).join(' ')

/** The world map: a winding road with ten stage pedestals, layered parallax scenery and Future You walking between stages. */
export default function WorldMap({ world, stars, lang, selected, walkFrom, onSelect, look }: {
  world: WorldDef; stars: Record<string, number>; lang: Lang; selected: number; walkFrom?: number; look: Look; onSelect: (i: number, locked: boolean) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const current = Math.min(world.stages.findIndex(s => !stars[s.id]) < 0 ? 9 : world.stages.findIndex(s => !stars[s.id]), 9)
  const [at, setAt] = useState(walkFrom ?? selected)
  const [from, setFrom] = useState(walkFrom ?? selected)
  const [away, setAway] = useState(false)
  const [walking, setWalking] = useState(false)
  const calm = prefersLessMotion()
  const cleared = world.stages.every(x => stars[x.id])
  const center = (i: number, smooth = true) => scroller.current?.scrollTo({ left: P[i].x - scroller.current.clientWidth / 2, behavior: smooth && !calm ? 'smooth' : 'auto' })

  useLayoutEffect(() => { center(at, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // walk to the chosen stage, one node at a time, and keep the camera with the character
  useEffect(() => { if (selected !== at) { setFrom(at); setAt(selected); setWalking(true); center(selected) } }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = scroller.current!
    if (!calm) el.style.setProperty('--sx', String(el.scrollLeft))
    setAway(Math.abs(el.scrollLeft + el.clientWidth / 2 - P[at].x) > el.clientWidth * 0.6)
  }
  // drag with a mouse to look around (touch scrolls natively)
  const drag = useRef<{ x: number; left: number } | null>(null)
  const steps = Array.from({ length: Math.abs(at - from) + 1 }, (_, k) => P[from + Math.sign(at - from) * k])

  return (
    <div className="relative">
      <div ref={scroller} onScroll={onScroll} className="map relative overflow-x-auto overflow-y-hidden rounded-[24px] border border-line" style={{ height: H }}
        onPointerDown={e => { if (e.pointerType === 'mouse') drag.current = { x: e.clientX, left: scroller.current!.scrollLeft } }}
        onPointerMove={e => { if (drag.current) scroller.current!.scrollLeft = drag.current.left - (e.clientX - drag.current.x) }}
        onPointerUp={() => { drag.current = null }} onPointerLeave={() => { drag.current = null }}>
        <div className="relative" style={{ width: W, height: H }}>
          {/* parallax scenery: sun and far hills move slowest, trees faster, the road with the scroll */}
          <svg aria-hidden className="map-far absolute inset-0" width={W} height={H}>
            <circle cx="420" cy="84" r="44" fill="none" stroke="rgba(255,255,255,0.14)" />
            {/* map life: drifting clouds and a few birds (the two ambient animations) */}
            <g className="cloud" fill="#fff" opacity="0.04"><ellipse cx="0" cy="70" rx="46" ry="15" /><ellipse cx="34" cy="60" rx="30" ry="14" /><ellipse cx="640" cy="112" rx="38" ry="12" /><ellipse cx="1180" cy="58" rx="50" ry="15" /></g>
            <g className="birds" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round"><path d="M0 130q6-7 12 0q6-7 12 0M40 116q5-6 10 0q5-6 10 0M-30 110q5-6 10 0q5-6 10 0" /></g>
            <path d={`M0 ${H} ${Array.from({ length: 50 }, (_, i) => `L${i * 40} ${190 - Math.sin(i / 2.3) * 34 - Math.sin(i / 0.9) * 10}`).join(' ')} L${W} ${H}Z`} fill="#0b0b0c" />
          </svg>
          <svg aria-hidden className="map-mid absolute inset-0" width={W} height={H}>
            <path d={`M0 ${H} ${Array.from({ length: 50 }, (_, i) => `L${i * 40} ${236 - Math.sin(i / 1.7 + 1) * 30}`).join(' ')} L${W} ${H}Z`} fill="#111113" />
            {Array.from({ length: 22 }, (_, i) => { const x = 60 + i * 92 + (i % 3) * 20, y = 196 + (i % 4) * 9; return <g key={i}><rect x={x - 3} y={y} width="6" height="20" fill="#1c1c1f" /><path d={`M${x - 20} ${y + 4}L${x} ${y - 46}L${x + 20} ${y + 4}Z`} fill={i % 4 === 1 ? '#222226' : '#18181b'} /></g> })}
          </svg>
          <svg aria-hidden className="absolute inset-0" width={W} height={H}>
            <rect y={H - 70} width={W} height="70" fill="#0d0d0f" />
            <path d={ROAD} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="40" strokeLinecap="round" />
            <path d={ROAD} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
            <path d={ROAD} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
          </svg>
          {/* fog over the road not yet reached */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-r from-transparent via-paper/70 to-paper/90" style={{ left: P[current].x + 110 }} />

          {world.stages.map((s, i) => {
            const st = stars[s.id] ?? 0, locked = i > current, kind = kindOf(s), Icon = KIND_ICON[kind], big = kind === 'boss'
            return (
              <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: P[i].x, top: P[i].y }}>
                {(s.order === 5 || s.order === 10) && (
                  <span className={`absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-xl ${s.order === 10 ? '-top-16 h-12 w-12' : '-top-14 h-11 w-11'} ${st ? 'bg-mist text-soft' : 'bg-amber text-black'} ${!st && !locked ? 'chest-bob' : ''} ${locked ? 'opacity-50' : ''}`} title={gt(s.order === 10 ? 'mega' : 'chest', lang)}>
                    {s.order === 10 ? <Gift size={24} /> : <Package size={21} />}
                  </span>
                )}
                <button onClick={() => onSelect(i, locked)} aria-current={i === selected} aria-label={`${gt('stage', lang, { n: s.order })}: ${s.title[lang]}${st ? `, ${st} / 3` : locked ? ', locked' : ''}`}
                  className={`mk mk-${kind} ${st ? 'mk-done' : locked ? 'mk-locked' : ''}`} style={{ '--mk': st || locked ? undefined : KIND_TINT[kind] } as React.CSSProperties}>
                  <Icon size={big ? 32 : 25} strokeWidth={1.7} />
                </button>
                {!st && !locked && <span aria-hidden className="pedestal-glow pointer-events-none" />}
                {locked && <Lock size={13} className="absolute -right-1 -top-1 text-soft" />}
                <span className="label absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-card/90 px-1.5 py-0.5 !text-ink">{s.order}</span>
                {st > 0 && <span className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>{[1, 2, 3].map(k => <Star key={k} size={12} className={k <= st ? 'fill-amber text-amber' : 'text-line'} />)}</span>}
              </div>
            )
          })}

          {/* Future You */}
          <m.div aria-hidden className="pointer-events-none absolute left-0 top-0 z-10" initial={false}
            onAnimationComplete={() => setWalking(false)}
            animate={{ x: steps.map(p => p.x + 6), y: steps.map(p => p.y - 92) }} transition={{ duration: calm ? 0 : 0.42 * Math.max(steps.length - 1, 1), ease: 'easeInOut' }}>
            <span className="flex items-end"><Sidekick id={look.sidekick} size={40} moving={walking} /><Character state={walking ? 'walk' : cleared ? 'celebrate' : 'idle'} look={look} size={58} /></span>
          </m.div>
        </div>
      </div>
      {away && <button onClick={() => center(at)} className="link absolute bottom-3 right-3 rounded border border-line bg-card/95 px-3 !no-underline">{gt('recenter', lang)}</button>}
    </div>
  )
}
