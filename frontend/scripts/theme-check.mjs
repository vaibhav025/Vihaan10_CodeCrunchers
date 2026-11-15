// 1) Contrast of the token pairs the app relies on, in both themes. Fails below the target.
// 2) Lists hard-coded colours outside the tokens file and the art allowlist (reported, not failed).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const SRC = new URL('../src', import.meta.url).pathname
const css = readFileSync(join(SRC, 'index.css'), 'utf8')
const block = sel => { const i = css.indexOf(sel + ' {'); return Object.fromEntries([...css.slice(i, css.indexOf('}', i)).matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map(m => [m[1], [+m[2], +m[3], +m[4]]])) }
const dark = { ...block(':root'), up: [0, 230, 118], down: [255, 71, 87] }
const light = { ...dark, ...block(":root[data-theme='light']") }
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
// [foreground, background, minimum, what it is]
const PAIRS = [
  ['ink', 'paper', 7, 'body text on page'], ['ink', 'card', 7, 'body text on card'], ['ink', 'haze', 7, 'text in fields'],
  ['soft', 'paper', 4.5, 'muted text on page'], ['soft', 'card', 4.5, 'muted text on card'], ['soft', 'haze', 4.5, 'placeholder in fields'],
  ['dim', 'paper', 4.5, 'subtle text on page'], ['on-forest', 'forest', 4.5, 'primary button label'],
  ['amber', 'paper', 4.5, 'accent text'], ['amber', 'card', 4.5, 'accent text on card'], ['rust', 'card', 4.5, 'warning text'],
  ['up', 'card', 4.5, 'gain text'], ['down', 'card', 4.5, 'loss / error text'], ['thriving', 'card', 3, 'status: thriving'], ['critical', 'card', 3, 'status: critical'],
  ['forest', 'paper', 3, 'focus ring / primary on page'],
]
let bad = 0
for (const [name, t] of [['dark', dark], ['light', light]]) {
  console.log(`\n${name} theme`)
  for (const [fg, bg, min, what] of PAIRS) {
    const r = ratio(t[fg], t[bg]), ok = r >= min
    if (!ok) bad++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(1).padStart(5)}:1 (min ${min})  ${fg} on ${bg}: ${what}`)
  }
}
// hard-coded colours: art (characters, game scenes, 3D world) is allowed; everything else should use tokens
const ALLOW = /\/game\/|components\/world\/|guide\/DadaJi|design-tokens|index\.css$|lib\/locales|guide\/content|RoadBackdrop|landing\/|ui\/ScoreRing/
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [] })
const hard = files(SRC).filter(p => !ALLOW.test(p)).map(p => [p.replace(SRC + '/', ''), (readFileSync(p, 'utf8').match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) ?? []).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1])
console.log(`\nhard-coded colours outside the allowlist: ${hard.reduce((s, [, n]) => s + n, 0)} in ${hard.length} files`)
for (const [p, n] of hard.slice(0, 12)) console.log(`  ${String(n).padStart(3)}  ${p}`)
if (bad) { console.error(`\ntheme:check FAILED: ${bad} token pair(s) below target.`); process.exit(1) }
console.log('\ntheme:check passed: every token pair meets its contrast target in both themes.')
