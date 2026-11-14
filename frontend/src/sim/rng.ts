/**
 * Seeded random numbers. The generator state is a plain number that is passed in and
 * returned, so a market is fully described by its data and the same seed always replays
 * the same market.
 */

/** One step of mulberry32: returns a value in [0, 1) and the next state. */
export function rand(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** A standard normal value (Box-Muller) and the next state. */
export function normal(state: number): [number, number] {
  const [u1, s1] = rand(state)
  const [u2, s2] = rand(s1)
  return [Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2), s2]
}

/** A stateful wrapper for code that draws many values in a row. */
export function stream(seed: number) {
  let s = seed | 0
  return {
    next() { const [v, n] = rand(s); s = n; return v },
    normal() { const [v, n] = normal(s); s = n; return v },
    int(n: number) { const [v, nx] = rand(s); s = nx; return Math.floor(v * n) },
    chance(p: number) { const [v, n] = rand(s); s = n; return v < p },
    get state() { return s },
  }
}

/** Mixes a seed with a label so separate uses of one seed do not share a sequence. */
export function fork(seed: number, salt: number) {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(salt + 1, 0xc2b2ae35)) | 0
}
