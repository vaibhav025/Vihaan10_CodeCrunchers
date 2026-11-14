import type { Look } from './roster'
import { DEFAULT_LOOK } from './roster'

export type CharState = 'idle' | 'walk' | 'run' | 'hop' | 'jump' | 'hurt' | 'celebrate' | 'tired' | 'sleeping'
const OUTFIT: Record<string, [string, string, string]> = { kurta: ['#4C7A58', '#3A6146', '#F0B67A'], nehru: ['#C4673A', '#9C4E2A', '#F3EAD6'], track: ['#36506B', '#273B52', '#F0B67A'] }

/** Future You: a chibi older hero in layered SVG. `state` picks the pose and animation; `look` fills the cosmetic slots. */
export function Character({ state = 'idle', look = DEFAULT_LOOK, size = 96 }: { state?: CharState; look?: Look; size?: number }) {
  const [c1, c2, c3] = OUTFIT[look.outfit] ?? OUTFIT.kurta
  const shut = state === 'sleeping' || state === 'tired'
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 120 150" className={`ch ch-${state} ${state === 'celebrate' ? `ch-dance-${look.dance}` : ''}`} aria-hidden>
      <ellipse cx="60" cy="143" rx="30" ry="5" fill="#243B2C" opacity="0.14" />
      {look.trail === 'coins' && (state === 'walk' || state === 'run') && [0, 1, 2].map(i => <circle key={i} className="ch-trail" style={{ animationDelay: `${i * 0.15}s` }} cx={18 - i * 8} cy={132} r="4" fill="#E0B45C" />)}
      <g className="ch-all">
        <g className="ch-leg ch-leg-l"><rect x="46" y="112" width="11" height="26" rx="5" fill="#5A5148" /><ellipse cx="50" cy="139" rx="9" ry="4.5" fill="#3B342E" /></g>
        <g className="ch-leg ch-leg-r"><rect x="63" y="112" width="11" height="26" rx="5" fill="#4D453D" /><ellipse cx="70" cy="139" rx="9" ry="4.5" fill="#3B342E" /></g>
        <g className="ch-body">
          <path d="M38 84c0-10 10-14 22-14s22 4 22 14v26c0 6-4 9-10 9H48c-6 0-10-3-10-9Z" fill={c1} />
          <path d="M66 70c9 1 16 5 16 14v26c0 6-4 9-10 9h-6Z" fill={c2} opacity="0.55" />
          <path d="M54 71h12l-6 14Z" fill={c3} />
          {look.outfit === 'nehru' && <path d="M60 85v34" stroke="#F3EAD6" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" />}
          {look.outfit === 'track' && <path d="M40 92h40M40 97h40" stroke="#F3EAD6" strokeWidth="2" opacity="0.7" />}
          <g className="ch-arm ch-arm-l"><rect x="29" y="82" width="11" height="28" rx="5.5" fill={c2} /><circle cx="34.500" cy="112" r="6" fill="#E8C4A0" /></g>
          <g className="ch-arm ch-arm-r"><rect x="80" y="82" width="11" height="28" rx="5.500" fill={c1} /><circle cx="85.500" cy="112" r="6" fill="#E8C4A0" />
            {look.held === 'chai' && <g><path d="M80 100h13l-2 13h-9Z" fill="#F3EAD6" /><path d="M81 103h11" stroke="#B9783A" strokeWidth="3" /><path d="M84 96c-2-3 2-4 0-7M89 96c-2-3 2-4 0-7" className="ch-steam" stroke="#C9CCC4" strokeWidth="1.5" fill="none" strokeLinecap="round" /></g>}
            {look.held === 'ledger' && <g><rect x="78" y="100" width="17" height="13" rx="2" fill="#36506B" /><path d="M82 104h9M82 108h6" stroke="#F3EAD6" strokeWidth="1.5" /></g>}
          </g>
        </g>
        <g className="ch-head">
          <circle cx="60" cy="48" r="34" fill="#E8C4A0" /><path d="M60 14a34 34 0 0 1 0 68c14-8 20-22 20-34S74 20 60 14Z" fill="#D9AE86" opacity="0.5" />
          <path d="M27 44c0-20 14-32 33-32s33 12 33 32c-6-12-16-18-33-18S33 32 27 44Z" fill="#EDEEE9" /><path d="M56 12c6-9 16-8 17 0-5-3-11-2-17 0Z" fill="#DADCD4" />
          <ellipse cx="38" cy="58" rx="6" ry="4" fill="#E79C84" opacity="0.5" /><ellipse cx="82" cy="58" rx="6" ry="4" fill="#E79C84" opacity="0.5" />
          <g className="ch-eyes">
            {state === 'hurt' ? <path d="M42 44l8 8m0-8-8 8M70 44l8 8m0-8-8 8" stroke="#243B2C" strokeWidth="3" strokeLinecap="round" />
              : shut ? <path d="M41 49c3 3 7 3 10 0M69 49c3 3 7 3 10 0" stroke="#243B2C" strokeWidth="3" fill="none" strokeLinecap="round" />
              : <><ellipse cx="46" cy="48" rx="4.500" ry="5.500" fill="#243B2C" /><ellipse cx="74" cy="48" rx="4.500" ry="5.500" fill="#243B2C" /><circle cx="47.500" cy="46" r="1.600" fill="#fff" /><circle cx="75.500" cy="46" r="1.600" fill="#fff" /></>}
          </g>
          {look.glasses === 'shades' ? <g><rect x="34" y="40" width="22" height="15" rx="6" fill="#243B2C" /><rect x="64" y="40" width="22" height="15" rx="6" fill="#243B2C" /><path d="M56 46h8" stroke="#243B2C" strokeWidth="3" /></g>
            : <g fill="none" stroke="#7A5C44" strokeWidth="2.200"><circle cx="46" cy="48" r="10" /><circle cx="74" cy="48" r="10" /><path d="M56 48h8" /></g>}
          {state === 'celebrate' ? <path d="M50 64c5 8 15 8 20 0Z" fill="#7A3B2E" /> : state === 'hurt' ? <ellipse cx="60" cy="67" rx="5" ry="4" fill="#7A3B2E" /> : <path d={state === 'tired' ? 'M52 68c5-3 11-3 16 0' : 'M52 65c5 5 11 5 16 0'} stroke="#7A3B2E" strokeWidth="2.600" fill="none" strokeLinecap="round" />}
          {look.hat === 'cap' && <g><path d="M27 34c2-16 16-25 33-25s31 9 33 25Z" fill="#C4673A" /><path d="M72 30c12-2 24 0 30 6-10 2-22 1-30-2Z" fill="#9C4E2A" /></g>}
          {look.hat === 'pagdi' && <g><path d="M25 36c0-20 16-30 35-30s35 10 35 30c-12-8-58-8-70 0Z" fill="#D9A441" /><path d="M30 26c14-10 44-12 60-2M27 33c16-8 48-9 66-2" stroke="#B9783A" strokeWidth="2.500" fill="none" /><circle cx="60" cy="14" r="5" fill="#C4673A" /></g>}
          {look.hat === 'beanie' && <g><path d="M27 36c0-18 14-28 33-28s33 10 33 28Z" fill="#36506B" /><rect x="25" y="30" width="70" height="10" rx="5" fill="#273B52" /><circle cx="60" cy="7" r="6" fill="#F3EAD6" /></g>}
          {state === 'sleeping' && <text x="92" y="22" className="ch-zzz" fontSize="16" fontFamily="Georgia" fill="#55635A">z</text>}
          {state === 'hurt' && <g className="ch-stars" fill="#E0B45C"><circle cx="30" cy="12" r="3" /><circle cx="60" cy="4" r="3" /><circle cx="90" cy="12" r="3" /></g>}
        </g>
      </g>
    </svg>
  )
}

/** The equipped sidekick: Gullak the piggy bank, Kachua the tortoise, Dadi-ji, or the Jugaad Crow. */
export function Sidekick({ id, size = 48, moving = false }: { id: string; size?: number; moving?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={`sk ${moving ? 'sk-move' : ''}`} aria-hidden>
      <ellipse cx="30" cy="55" rx="18" ry="3.500" fill="#243B2C" opacity="0.14" />
      <g className="sk-all">
        {id === 'gullak' && <g><ellipse cx="30" cy="36" rx="20" ry="17" fill="#C4673A" /><path d="M30 19a20 17 0 0 1 0 34c8-5 10-11 10-17s-2-12-10-17Z" fill="#9C4E2A" opacity="0.5" /><rect x="24" y="19" width="12" height="3" rx="1.500" fill="#5E2E1A" /><ellipse cx="44" cy="36" rx="6" ry="5" fill="#D98A62" /><circle cx="42.500" cy="36" r="1.200" fill="#5E2E1A" /><circle cx="45.500" cy="36" r="1.200" fill="#5E2E1A" /><circle cx="36" cy="30" r="2.200" fill="#243B2C" /><path d="M16 26l-4-7 8 3Z" fill="#9C4E2A" /><rect x="18" y="50" width="6" height="5" rx="2" fill="#9C4E2A" /><rect x="34" y="50" width="6" height="5" rx="2" fill="#9C4E2A" /></g>}
        {id === 'kachua' && <g><ellipse cx="44" cy="40" rx="8" ry="7" fill="#A9BB85" /><circle cx="46.500" cy="38" r="1.600" fill="#243B2C" /><path d="M8 46a20 16 0 0 1 40 0Z" fill="#4F8A5B" /><path d="M18 46c0-8 4-12 10-13M38 46c0-8-4-12-10-13M12 40h32" stroke="#3A6146" strokeWidth="2" fill="none" /><rect x="12" y="46" width="8" height="7" rx="3" fill="#A9BB85" /><rect x="34" y="46" width="8" height="7" rx="3" fill="#A9BB85" /></g>}
        {id === 'dadi' && <g><path d="M12 54c0-14 8-20 18-20s18 6 18 20Z" fill="#B4734A" /><path d="M14 54c2-12 8-17 16-18-6 6-8 12-8 18Z" fill="#D9A441" /><circle cx="30" cy="24" r="14" fill="#E8C4A0" /><path d="M16 22c0-10 6-15 14-15s14 5 14 15c-4-6-24-6-28 0Z" fill="#EDEEE9" /><circle cx="30" cy="6" r="5" fill="#DADCD4" /><circle cx="25" cy="24" r="1.800" fill="#243B2C" /><circle cx="35" cy="24" r="1.800" fill="#243B2C" /><circle cx="30" cy="17" r="1.500" fill="#C4673A" /><path d="M25 30c3 3 7 3 10 0" stroke="#7A3B2E" strokeWidth="2" fill="none" strokeLinecap="round" /></g>}
        {id === 'crow' && <g><ellipse cx="28" cy="36" rx="16" ry="14" fill="#2B3035" /><path d="M12 38c-6 2-8 8-6 12 6-2 10-6 12-10Z" fill="#1C2024" /><circle cx="40" cy="24" r="10" fill="#2B3035" /><path d="M48 24l10 3-10 4Z" fill="#D9A441" /><circle cx="42" cy="22" r="4.500" fill="none" stroke="#E0B45C" strokeWidth="1.600" /><circle cx="42" cy="22" r="1.800" fill="#fff" /><path d="M24 50v5M32 50v5" stroke="#D9A441" strokeWidth="2" strokeLinecap="round" /></g>}
      </g>
    </svg>
  )
}
