// Single source of truth for the palette. index.css mirrors these as CSS variables
// (so Tailwind and dark mode can use them); the 3D world reads them from here.

export const palette = {
  paper: '#F7F5E8',
  card: '#FCFBF3',
  ink: '#243B2C',
  soft: '#55635A', // body grey, AA on paper
  forest: '#3F5B3A',
  forestHover: '#2F4A2C',
  leaf: '#55764F', // text-safe sage, used for the italic accent
  sage: '#8FA582', // shapes only, too pale for text
  mist: '#E6E2D0',
  haze: '#EAF1EC',
  amber: '#D9823F', // shapes only
  amberSoft: '#F0B67A',
  rust: '#A2561C', // text-safe amber
  night: '#101A14',
} as const

export type FutureState = 'thriving' | 'stable' | 'struggling' | 'critical' | 'zero'

export const stateColor: Record<FutureState, string> = {
  thriving: '#4F8A5B',
  stable: '#8FA582',
  struggling: '#D9A441',
  critical: '#C4673A',
  zero: '#8B8F88',
}

/** How alive the world is for each state, 0 (empty plot) to 1 (thriving). */
export const stateVitality: Record<FutureState, number> = {
  zero: 0,
  critical: 0.25,
  struggling: 0.5,
  stable: 0.75,
  thriving: 1,
}

export const STATES: FutureState[] = ['zero', 'critical', 'struggling', 'stable', 'thriving']

/** Colours used only inside the 3D diorama. */
export const world = {
  grass: '#C6D6A0',
  grassDry: '#C2C3B6',
  earth: '#B98E66',
  earthDeep: '#8E7054',
  road: '#E9DFC6',
  wall: '#F3EAD6',
  roof: '#C4673A',
  roofDull: '#9C8F86',
  pine: '#6F8F62',
  round: '#8FA582',
  autumn: '#D9823F',
  foliageDull: '#A3A69B',
  trunk: '#7A5C44',
  stone: '#DDD6C0',
  lantern: '#F0B67A',
  coat: '#4C6A58',
  skin: '#D9B99B',
  hair: '#D8D8D2',
  car: '#3F5B3A',
  keyWarm: '#FFE3BC',
  keyCold: '#C7CED3',
} as const

export const motion = {
  /** One easing curve and one spring across the app. */
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 260, damping: 24 },
  duration: { fast: 0.18, base: 0.25, slow: 0.5 },
  stagger: 0.06,
  /** World state transitions settle in about this long. */
  worldSeconds: 1.2,
  ui: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
}
