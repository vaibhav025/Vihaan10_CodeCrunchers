/**
 * Employer NPS checker rules (Section 80CCD(2)), FY 2024-25 onward.
 * - Employer contribution is deductible up to 14% of basic + DA for central government employees,
 *   and for others under the new tax regime; 10% for others under the old regime.
 * - Employer contributions to NPS, EPF and superannuation together above ₹7.5 lakh a year are taxable.
 * Illustrative; users should confirm with HR or a tax adviser.
 */
export type Sector = 'central' | 'state' | 'private'
export type Regime = 'new' | 'old'
export const AGGREGATE_CAP = 750000

export function limitPct(sector: Sector, regime: Regime) {
  if (sector === 'central' || sector === 'state') return 14
  return regime === 'new' ? 14 : 10
}
/** Government employers contribute 14% (most states match the centre; a few still pay 10%). Private employers choose. */
export const mandatory = (sector: Sector) => sector === 'central' ? 14 : sector === 'state' ? 14 : 0

export function check(basicDa: number, employer: number, sector: Sector, regime: Regime, slab: number) {
  const pct = basicDa ? (employer / basicDa) * 100 : 0
  const cap = limitPct(sector, regime)
  const owed = mandatory(sector)
  const shortfall = owed ? Math.max(0, (owed / 100) * basicDa - employer) : 0
  const headroom = Math.max(0, (cap / 100) * basicDa - employer)
  const overCap = Math.max(0, employer - (cap / 100) * basicDa)
  return {
    pct, cap, owed, shortfall, headroom, overCap,
    // tax a year that unused headroom could save if the employer contributed it
    taxSavable: headroom * 12 * slab,
    status: shortfall > 1 ? 'short' as const : overCap > 1 ? 'over' as const : headroom > 1 ? 'room' as const : 'ok' as const,
  }
}
