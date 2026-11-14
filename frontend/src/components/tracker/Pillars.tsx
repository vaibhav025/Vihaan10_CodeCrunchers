import { m } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { spring } from '../../ui/motion'
import type { Part } from '../../lib/readiness'

/** The vault monument: six pillars, each as tall as its share of the score. For use on the forest band. */
export default function Pillars({ parts, reveal = false, className = '' }: { parts: Part[]; reveal?: boolean; className?: string }) {
  const { t } = useI18n()
  return (
    <ol className={`flex h-[200px] items-end gap-2 sm:gap-3 ${className}`} aria-label={t('tr.how')}>
      {parts.map((p, i) => (
        <li key={p.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
          <span className="num text-[15px] leading-none">{Math.round(p.got)}<span className="label">/{p.max}</span></span>
          <span className="relative mt-1.5 flex w-full flex-1 items-end rounded-t-md bg-white/[0.06]">
            <m.span className="pillar block h-full w-full origin-bottom rounded-t-md" initial={{ scaleY: 0.03 }} animate={{ scaleY: Math.max(p.got / p.max, 0.03) }} transition={{ ...spring, delay: reveal ? 0.4 + i * 0.18 : 0 }} />
          </span>
          {/* narrow phones: drop the tracking and size a step so six names fit without clipping */}
          <span className="label mt-1.5 w-full truncate text-center max-sm:!text-[10px] max-sm:!tracking-[0.02em]">{t(`tr.p.${p.key}`)}</span>
        </li>
      ))}
    </ol>
  )
}
