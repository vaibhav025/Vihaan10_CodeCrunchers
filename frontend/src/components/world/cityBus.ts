/** What the pointer is on in the city. The page listens and draws the tooltip and the detail panel. */
export interface CityPick { name: string; means: string; zone: number; x: number; y: number }
type Fn<T> = (v: T) => void
export const cityBus = {
  hover: new Set<Fn<CityPick | null>>(), select: new Set<Fn<CityPick | null>>(), reset: new Set<Fn<void>>(),
  emit<T>(set: Set<Fn<T>>, v: T) { set.forEach(f => f(v)) },
}
