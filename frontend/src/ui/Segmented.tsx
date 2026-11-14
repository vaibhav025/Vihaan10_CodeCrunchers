import { m } from 'framer-motion'
import { spring } from './motion'

/** Segmented control whose highlight slides to the chosen option (transform only). */
export default function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; name: string }[]; value: T; onChange: (v: T) => void; label: string
}) {
  const i = Math.max(options.findIndex(o => o.id === value), 0)
  return (
    <div role="radiogroup" aria-label={label} className="relative mt-2 grid rounded-md border border-line bg-paper p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <m.span aria-hidden className="absolute bottom-1 left-1 top-1 rounded bg-card shadow-paper" style={{ width: `calc((100% - 8px) / ${options.length})` }}
        initial={false} animate={{ x: `${i * 100}%` }} transition={spring} />
      {options.map(o => (
        <button key={o.id} role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)}
          className={`relative z-10 min-h-[44px] rounded px-2 text-[15px] ${o.id === value ? 'text-ink' : 'text-soft hover:text-ink'}`}>{o.name}</button>
      ))}
    </div>
  )
}
