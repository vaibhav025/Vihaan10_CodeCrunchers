/** Dada Ji's authored content. He is not an AI: everything he says is written here, per language. */
export type Pose = 'idle' | 'wave' | 'talk' | 'think' | 'point' | 'thumbsUp' | 'wink' | 'surprised' | 'cheer' | 'secret'
/** One tour step. No target = a card in the middle of the screen. `only: 'new'` steps show for people new to apps. */
/** `when`: show this step only if that element is on the page. `end`: the tour stops after this step. */
export interface Step { target?: string; route?: string; title: string; body: string; pose?: Pose; only?: 'new'; when?: string; end?: boolean; /** Next presses the target for the player, then moves on */ press?: boolean }
export interface Tour { title: string; minutes: string; steps: Step[] }
export interface Feature { id: string; title: string; what: string; why: string; steps: string[]; route: string; target?: string; tour?: string }
/** What a control is, what pressing it does, and whether it is safe. `id` is the element's data-guide id. */
export interface Control { id: string; label: string; what: string; happens: string; safe: string }
export interface Word { id: string; term: string; def: string; example: string }
export interface Faq { q: string; a: string; route?: string; target?: string }
export interface PageHelp { title: string; cards: { t: string; b: string }[]; actions: { label: string; target: string }[] }
export interface Content {
  ui: Record<string, string>
  tours: Record<string, Tour>
  features: Feature[]
  controls: Control[]
  glossary: Word[]
  faq: Faq[]
  /** keyed by route, e.g. '/home' */
  pages: Record<string, PageHelp>
  /** first-visit tip per route, plus 'idle' */
  nudges: Record<string, string>
  /** words that mark a money question, which goes to Dadi */
  money: string[]
}
