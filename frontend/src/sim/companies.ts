/**
 * The fictional market. Every company here is invented for teaching: none is a real firm,
 * ticker or price. Names are proper nouns and are not translated.
 */
export type Sector = 'construction' | 'cement' | 'steel' | 'bank' | 'pay' | 'it' | 'fmcg' | 'pharma'
export const SECTORS: Sector[] = ['construction', 'cement', 'steel', 'bank', 'pay', 'it', 'fmcg', 'pharma']

export interface Company {
  id: string
  name: string
  sector: Sector
  /** Starting price in rupees. */
  price: number
  /** Expected growth a year (log return), before noise and news. */
  drift: number
  /** Yearly volatility: how wide the random daily swings are. */
  vol: number
}

export const COMPANIES: Company[] = [
  { id: 'nsb', name: 'Nirmaan Setu Buildcon', sector: 'construction', price: 420, drift: 0.09, vol: 0.32 },
  { id: 'shc', name: 'Shilaprastha Cement', sector: 'cement', price: 1850, drift: 0.08, vol: 0.22 },
  { id: 'lgs', name: 'Lohagarh Steel', sector: 'steel', price: 640, drift: 0.07, vol: 0.36 },
  { id: 'sjb', name: 'Saksham Janata Bank', sector: 'bank', price: 980, drift: 0.1, vol: 0.24 },
  { id: 'tpp', name: 'TapPe Payments', sector: 'pay', price: 310, drift: 0.09, vol: 0.48 },
  { id: 'sgi', name: 'Sanganak Infotech', sector: 'it', price: 1420, drift: 0.11, vol: 0.26 },
  { id: 'ggf', name: 'Ghar-Ghar Foods', sector: 'fmcg', price: 2260, drift: 0.08, vol: 0.14 },
  { id: 'aap', name: 'Aarogyam Pharma', sector: 'pharma', price: 760, drift: 0.09, vol: 0.28 },
]

export type Risk = 'low' | 'medium' | 'high'
/** The risk label shown on the board, from how wildly the price swings. */
export const riskOf = (c: Company): Risk => (c.vol < 0.2 ? 'low' : c.vol < 0.3 ? 'medium' : 'high')

export const TRADING_DAYS = 252
