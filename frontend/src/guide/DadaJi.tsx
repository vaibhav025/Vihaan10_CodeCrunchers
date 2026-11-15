import type { CSSProperties } from 'react'
import type { Pose } from './types'
import './guide.css'

const SKIN = '#E8B98F', SUIT = '#22302B', LAPEL = '#2E4038', CREAM = '#F3EBDA', GOLD = '#D8B45A', SILVER = '#EEF0F3', AMBER = '#E9A23B', INK = '#2A1D14'
/** Arm angles in degrees (0 = hanging down). Left arm raises with +, right arm raises with −; a large + on the right brings the hand to the face. */
const ARMS: Record<Pose, [number, number]> = {
  idle: [6, -6], wave: [6, -150], talk: [6, -24], think: [6, 112], point: [6, -95], thumbsUp: [6, -100], wink: [6, -14], surprised: [34, -34], cheer: [150, -150], secret: [6, 125],
}

/**
 * Dada Ji: a cool grandfather in a tailored suit and gold-rim tinted specs. Layered SVG, original art.
 * He breathes, blinks and his lenses glint; `pose` moves the arms and face, `talking` moves the mouth,
 * `look` (−1..1 each way) turns his eyes and head, `aim` overrides the pointing arm's angle.
 */
export default function DadaJi({ pose = 'idle', talking = false, look, aim, size = 140, still = false }: {
  pose?: Pose; talking?: boolean; look?: { x: number; y: number }; aim?: number; size?: number; still?: boolean
}) {
  const [l, r] = ARMS[pose]
  const right = pose === 'point' && aim !== undefined ? aim : r
  const lx = (look?.x ?? (pose === 'think' ? 0.5 : 0)) * 2.6, ly = (look?.y ?? (pose === 'think' ? -0.8 : 0)) * 2
  const mouth = pose === 'surprised' ? 'o' : talking || pose === 'talk' ? 'talk' : 'smile'
  const brow = pose === 'surprised' ? -4 : pose === 'think' ? -2 : 0
  const finger = pose === 'point' || pose === 'secret'
  return (
    <svg viewBox="0 0 200 244" width={size} height={size * 1.22} className={`dj dj-${pose} ${still ? 'dj-still' : ''}`} aria-hidden focusable="false">
      <g className="dj-body">
        <rect x="80" y="204" width="16" height="27" rx="6" fill="#1B2622" /><rect x="104" y="204" width="16" height="27" rx="6" fill="#1B2622" />
        <ellipse cx="86" cy="234" rx="13" ry="6" fill="#3A2A1E" /><ellipse cx="114" cy="234" rx="13" ry="6" fill="#3A2A1E" />
        <path d="M62 138Q62 120 82 118L118 118Q138 120 138 138L142 205Q100 216 58 205Z" fill={SUIT} />
        <path d="M88 118L100 152L112 118Z" fill={CREAM} />
        <path d="M88 118L100 152L82 142Z" fill={LAPEL} /><path d="M112 118L100 152L118 142Z" fill={LAPEL} />
        <circle cx="100" cy="168" r="2.3" fill={GOLD} /><circle cx="100" cy="184" r="2.3" fill={GOLD} />
        <path d="M115 147l11-5 3 8-13 3z" fill={AMBER} />
        <path d="M100 170Q112 184 126 172" fill="none" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g className="dj-arm" style={{ transformOrigin: '66px 130px', transform: `rotate(${l}deg)` }}>
        <rect x="57" y="124" width="18" height="52" rx="9" fill={SUIT} /><rect x="58" y="168" width="16" height="7" rx="2" fill={CREAM} /><circle cx="66" cy="183" r="9" fill={SKIN} />
      </g>
      <g className="dj-head" style={{ transformOrigin: '100px 112px', transform: `rotate(${(pose === 'think' ? -5 : 0) + lx * 0.8}deg)` }}>
        <rect x="92" y="106" width="16" height="16" fill={SKIN} />
        <circle cx="57" cy="82" r="8" fill={SKIN} /><circle cx="143" cy="82" r="8" fill={SKIN} />
        <path d="M56 70Q54 22 100 22Q146 22 144 70L146 84Q138 60 100 60Q62 60 54 84Z" fill="#D5D9DE" />
        <ellipse cx="100" cy="78" rx="44" ry="41" fill={SKIN} />
        <path d="M58 62Q72 20 122 27Q146 32 143 62Q130 40 104 41Q78 41 58 62Z" fill={SILVER} />
        <path d="M70 45Q96 30 132 40" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
        <g style={{ transform: `translateY(${brow}px)` }} className="dj-move"><path d="M72 62Q83 56 94 62" fill="none" stroke="#C9CED4" strokeWidth="3.4" strokeLinecap="round" /><path d="M106 62Q117 56 128 62" fill="none" stroke="#C9CED4" strokeWidth="3.4" strokeLinecap="round" /></g>
        <g style={{ transform: `translate(${lx}px, ${ly}px)` }} className="dj-move">
          {pose === 'wink' || pose === 'secret' ? <path d="M78 81Q83 85 88 81" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /> : <ellipse className="dj-eye" cx="83" cy="80" rx="3.5" ry="4" fill={INK} />}
          <ellipse className="dj-eye" cx="117" cy="80" rx="3.5" ry="4" fill={INK} />
        </g>
        <path d="M100 84q-4 8 0 11" fill="none" stroke="#C99A70" strokeWidth="2" strokeLinecap="round" />
        {mouth === 'smile' && <path d="M91 108Q100 115 109 108" fill="none" stroke="#7A3B2A" strokeWidth="2.4" strokeLinecap="round" />}
        {mouth === 'talk' && <ellipse className="dj-talk" cx="100" cy="110" rx="6" ry="4.5" fill="#7A3B2A" />}
        {mouth === 'o' && <circle cx="100" cy="111" r="4.6" fill="#7A3B2A" />}
        <path d="M100 99Q90 92 77 101Q88 109 100 103Q112 109 123 101Q110 92 100 99Z" fill="#F7F8FA" />
        {/* gold-rim tinted specs with a glint that sweeps across now and then */}
        <clipPath id="dj-lens"><circle cx="83" cy="80" r="13.5" /><circle cx="117" cy="80" r="13.5" /></clipPath>
        <g fill="rgb(132 88 22 / .3)" stroke={GOLD} strokeWidth="2.6"><circle cx="83" cy="80" r="14" /><circle cx="117" cy="80" r="14" /></g>
        <path d="M97 78Q100 75 103 78M69 78L57 76M131 78L143 76" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
        <g clipPath="url(#dj-lens)"><rect className="dj-glint" x="52" y="60" width="9" height="44" fill="#fff" opacity=".55" /></g>
      </g>
      <g className={`dj-arm ${pose === 'wave' ? 'dj-wave' : ''}`} style={{ transformOrigin: '134px 130px', '--r': `${right}deg`, transform: `rotate(${right}deg)` } as CSSProperties}>
        <rect x="125" y="124" width="18" height="52" rx="9" fill={SUIT} /><rect x="126" y="168" width="16" height="7" rx="2" fill={CREAM} /><circle cx="134" cy="183" r="9" fill={SKIN} />
        {finger && <rect x="131.3" y="186" width="5.4" height="13" rx="2.7" fill={SKIN} />}
        {pose === 'thumbsUp' && <rect x="139" y="178" width="12" height="6" rx="3" fill={SKIN} />}
      </g>
    </svg>
  )
}

/** Head and shoulders for the launcher badge: tiny, static, and safe to ship in the entry chunk. */
export function DadaFace({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="40 14 120 120" width={size} height={size} aria-hidden focusable="false">
      <path d="M52 134Q54 112 82 110L118 110Q146 112 148 134Z" fill={SUIT} /><path d="M88 110L100 134L112 110Z" fill={CREAM} />
      <rect x="92" y="100" width="16" height="14" fill={SKIN} />
      <path d="M56 70Q54 22 100 22Q146 22 144 70L146 84Q138 60 100 60Q62 60 54 84Z" fill="#D5D9DE" />
      <ellipse cx="100" cy="78" rx="44" ry="41" fill={SKIN} />
      <path d="M58 62Q72 20 122 27Q146 32 143 62Q130 40 104 41Q78 41 58 62Z" fill={SILVER} />
      <ellipse cx="83" cy="80" rx="3.5" ry="4" fill={INK} /><ellipse cx="117" cy="80" rx="3.5" ry="4" fill={INK} />
      <path d="M91 108Q100 115 109 108" fill="none" stroke="#7A3B2A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M100 99Q90 92 77 101Q88 109 100 103Q112 109 123 101Q110 92 100 99Z" fill="#F7F8FA" />
      <g fill="rgb(132 88 22 / .3)" stroke={GOLD} strokeWidth="2.6"><circle cx="83" cy="80" r="14" /><circle cx="117" cy="80" r="14" /></g>
      <path d="M97 78Q100 75 103 78" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
