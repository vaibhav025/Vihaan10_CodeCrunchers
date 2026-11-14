import { Link } from 'react-router-dom'
import { ChevronRight, Coins, Shield, SlidersHorizontal } from '../ui/icons'
import { useI18n } from '../../lib/i18n'
import { useMeta } from '../../lib/useMeta'
import ScoreRing from '../../ui/ScoreRing'
import { useSession } from '../../lib/session'
import { useMoney } from '../../lib/tracker'
import { readiness, weakest } from '../../lib/readiness'

/** Quick tools from the path: Scam Shield (with this week's status), Employer check, Habits. */
export default function ToolsStrip() {
  const { t } = useI18n()
  const meta = useMeta()
  const { user } = useSession()
  const money = useMoney()
  const years = Math.max((user?.retirement_age ?? 60) - (user?.age ?? 25), 0)
  const r = readiness(money, years), started = money.assets.length > 0 || money.income > 0
  const tools = [
    { to: '/shield', icon: Shield, title: t('sh.title'), sub: meta.shieldWeek === meta.week ? t('sh.doneShort') : t('sh.new') },
    { to: '/employer', icon: SlidersHorizontal, title: t('em.short'), sub: '80CCD(2)' },
    { to: '/habits', icon: Coins, title: t('hb.short'), sub: t('hb.month') },
  ]
  return (
    <>
    {/* the one number, and today's best move */}
    <Link to="/tracker" className="hud pressable mt-4 flex items-center gap-4 p-4">
      <ScoreRing score={started ? r.score : 0} size={84} label={t('tr.score')} />
      <span className="min-w-0 flex-1"><span className="label block">{t('tr.score')}</span>
        <span className="mt-1 block font-serif text-[1.25rem] leading-snug text-ink">{started ? t(`tr.fix.${weakest(r).key}`, { n: Math.round(weakest(r).max - weakest(r).got) }) : t('tr.empty')}</span></span>
      <ChevronRight size={18} className="shrink-0 text-soft" aria-hidden />
    </Link>
    <ul className="mt-3 grid gap-2 sm:grid-cols-3">
      {tools.map(x => (
        <li key={x.to}>
          <Link to={x.to} className="hud pressable flex min-h-[64px] items-center gap-3 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-haze text-forest"><x.icon size={18} strokeWidth={1.6} aria-hidden /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-serif text-lg leading-tight text-ink">{x.title}</span><span className="label block truncate">{x.sub}</span></span>
            <ChevronRight size={16} className="shrink-0 text-soft" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
    </>
  )
}
