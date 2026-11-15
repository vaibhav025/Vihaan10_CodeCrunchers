import { useI18n } from '../../lib/i18n'
import { rupees, rupeesShort } from '../../lib/format'
import { Move } from '../lab/kit'
import { useMoney } from '../../lib/tracker'
import { dateLabel, holdingsSummary, linkedHoldings, useMarketDay } from '../../lib/marketDay'

/** The user's own stocks, linked to NSE symbols, valued at the downloaded day's real closing prices. */
export default function MarketCard({ onLink }: { onLink: () => void }) {
  const { t } = useI18n()
  const money = useMoney()
  const { data, real } = useMarketDay()
  if (!data || !real) return null
  const list = linkedHoldings(data, money.assets), sum = holdingsSummary(list), date = dateLabel(data)
  return (
    <section aria-labelledby="mk-h" className="rounded-lg border border-line bg-card p-4">
      <h2 id="mk-h" className="text-[1.25rem] text-ink">{t('mk.title')}</h2>
      <p className="mt-1 text-[13px] text-soft">{t('mk.sub', { date })}</p>
      {list.length ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div><dt className="label">{t('mk.worth')}</dt><dd className="num mt-1 text-xl text-ink">{rupeesShort(sum.value)}</dd></div>
            <div><dt className="label">{t('mk.dayChg')}</dt><dd className="num mt-1 text-xl text-ink">{sum.change >= 0 ? '+' : '−'}{rupeesShort(Math.abs(sum.change))} <span className="text-[14px]"><Move pct={sum.pct} digits={2} /></span></dd></div>
          </dl>
          <ul className="mt-3 divide-y divide-line">
            {list.map(h => (
              <li key={h.asset.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                <span className="min-w-0"><span className="block truncate text-ink">{h.quote.name}</span>
                  <span className="label block">{h.quote.symbol} · {t('mk.shares', { n: h.asset.qty! })} · {rupees(h.quote.price)}</span></span>
                <span className="text-right"><span className="num block text-ink">{rupeesShort(h.value)}</span><span className="text-[12px]"><Move pct={h.quote.pct} digits={2} /></span></span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="mt-3 text-[14px] text-soft">{t('mk.none')}</p>}
      <button type="button" className="link mt-2" onClick={onLink}>{t('mk.link')}</button>
      <p className="mt-2 text-[12px] text-soft">{t('mk.lesson')}</p>
    </section>
  )
}
