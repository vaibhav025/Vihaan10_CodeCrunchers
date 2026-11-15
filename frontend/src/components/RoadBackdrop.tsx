import type { CSSProperties } from 'react'

/** Flags for the Coach's road backdrop. */
export const ROAD = { journeyProgress: true }
// the road's centre line in isometric space, bottom-left to the summit at top-right; the walker and lanterns sit along it
const PATH: [number, number][] = [[40, 330], [110, 300], [180, 318], [250, 280], [320, 292], [390, 246], [450, 252], [510, 204], [560, 176], [610, 128], [650, 96]]
const at = (f: number): [number, number] => { const x = Math.min(Math.max(f, 0), 1) * (PATH.length - 1), i = Math.min(Math.floor(x), PATH.length - 2), u = x - i; return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * u, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * u] }
const d = PATH.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
const LAMPS = Array.from({ length: 9 }, (_, i) => at((i + 0.6) / 10))
const TREES: [number, number, 0 | 1][] = [[90, 338, 0], [150, 268, 1], [230, 322, 0], [300, 246, 1], [370, 300, 0], [440, 214, 1], [500, 258, 0], [585, 196, 1], [70, 286, 1], [640, 150, 0]]

/**
 * A faint isometric road behind the chat: tiles, trees, a cottage, lantern posts and a summit monument (Future You at sixty).
 * Each answered question moves the walker one step and lights one more lantern. Pure inline SVG; parallax comes from
 * two CSS variables the page sets (--rb-s for scroll progress, --rb-x for the pointer), so nothing here runs per frame.
 */
export default function RoadBackdrop({ steps, dim }: { steps: number; dim: boolean }) {
  const n = ROAD.journeyProgress ? Math.min(steps, 10) : 0
  const [wx, wy] = at(n / 10)
  const layer = (depth: number): CSSProperties => ({ transform: `translate3d(calc(var(--rb-x, 0) * ${depth * 6}px), calc(var(--rb-s, 0) * ${-depth * 14}px), 0)` })
  return (
    <div aria-hidden className={`rb ${dim ? 'rb-dim' : ''}`}>
      <svg viewBox="0 0 700 380" preserveAspectRatio="xMaxYMax slice" className="h-full w-full">
        <defs>
          <radialGradient id="rb-glow"><stop offset="0" stopColor="#E9A23B" stopOpacity=".9" /><stop offset="1" stopColor="#E9A23B" stopOpacity="0" /></radialGradient>
          <radialGradient id="rb-sun"><stop offset="0" stopColor="rgb(var(--ink))" stopOpacity=".7" /><stop offset="1" stopColor="rgb(var(--ink))" stopOpacity="0" /></radialGradient>
        </defs>
        {/* far: hills and the summit monument */}
        <g className="rb-layer" style={layer(0.35)} fill="none" stroke="rgb(var(--ink))" strokeWidth="1">
          <path d="M420 150L520 70L600 120L650 60L700 110" strokeOpacity=".5" />
          <circle cx="652" cy="70" r="46" fill="url(#rb-sun)" stroke="none" />
          <path d="M640 96L652 44L664 96Z" fill="rgb(var(--ink))" fillOpacity=".5" /><path d="M632 100L672 100L668 106L636 106Z" fill="rgb(var(--ink))" fillOpacity=".35" />
        </g>
        {/* mid: ground tiles and the road */}
        <g className="rb-layer" style={layer(0.7)}>
          <g stroke="rgb(var(--ink))" strokeOpacity=".22" strokeWidth=".8">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-40 + i * 90} 380L${320 + i * 90} 200M${760 - i * 90} 380L${400 - i * 90} 200`} />)}</g>
          <path d={d} fill="none" stroke="rgb(var(--ink))" strokeOpacity=".28" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="rgb(var(--card))" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="rgb(var(--ink))" strokeOpacity=".7" strokeWidth="1.4" strokeDasharray="9 9" strokeLinejoin="round" />
          {/* a small cottage beside the first bend */}
          <g transform="translate(196 246)" stroke="rgb(var(--ink))" strokeWidth="1" fill="rgb(var(--card))"><path d="M0 22L22 11L44 22L44 42L22 53L0 42Z" /><path d="M0 22L22 0L44 11L22 33Z" fill="rgb(var(--ink))" fillOpacity=".35" /><path d="M22 33L22 53" /></g>
        </g>
        {/* near: trees, lanterns and the walker */}
        <g className="rb-layer" style={layer(1)}>
          {TREES.map(([x, y, k], i) => k
            ? <g key={i} stroke="rgb(var(--ink))" strokeWidth="1" fill="rgb(var(--ink))" fillOpacity=".3"><path d={`M${x} ${y}v-12`} /><circle cx={x} cy={y - 20} r="10" /></g>
            : <g key={i} stroke="rgb(var(--ink))" strokeWidth="1" fill="rgb(var(--ink))" fillOpacity=".3"><path d={`M${x} ${y}v-8`} /><path d={`M${x - 9} ${y - 8}L${x} ${y - 32}L${x + 9} ${y - 8}Z`} /></g>)}
          {LAMPS.map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x + 14} ${y - 6}v-22`} stroke="rgb(var(--ink))" strokeWidth="1.2" />
              <circle cx={x + 14} cy={y - 30} r="2.4" fill={i < n ? '#E9A23B' : 'rgb(var(--ink))'} fillOpacity={i < n ? 1 : 0.5} />
              {i < n && <circle className="rb-flick" style={{ animationDelay: `${i * 0.7}s` }} cx={x + 14} cy={y - 30} r="20" fill="url(#rb-glow)" />}
            </g>
          ))}
          <g className="rb-walker" style={{ transform: `translate(${wx}px, ${wy}px)` }}>
            <ellipse cx="0" cy="1" rx="8" ry="3" fill="rgb(var(--ink))" fillOpacity=".3" />
            <path d="M-4 0L-3 -14Q0 -18 3 -14L4 0Z" fill="rgb(var(--ink))" /><circle cx="0" cy="-20" r="4.2" fill="rgb(var(--ink))" />
          </g>
        </g>
      </svg>
    </div>
  )
}
