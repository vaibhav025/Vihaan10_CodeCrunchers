import { useTween } from './CountUp'

/** The Readiness Score as a ring that fills and counts up. `dark` is for use on the forest band. */
export default function ScoreRing({ score, size = 168, dark = false, label }: { score: number; size?: number; dark?: boolean; label?: string }) {
  const v = useTween(score, 900), r = 44, C = 2 * Math.PI * r
  const tone = score >= 80 ? '#4FA66A' : score >= 60 ? '#8FA582' : score >= 40 ? '#F2B544' : '#E8654F'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Readiness'}: ${score} / 100`}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? 'rgb(255 255 255 / 0.14)' : 'rgb(var(--mist))'} strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? '#FFFFFF' : tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(v, 100) / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p className={`num leading-none ${dark ? 'text-ink' : 'text-ink'}`} style={{ fontSize: size * 0.36 }}>{Math.round(v)}</p>
          <p className="label mt-0.5" style={{ fontSize: Math.max(9, size * 0.065) }}>/ 100</p></div>
      </div>
    </div>
  )
}
