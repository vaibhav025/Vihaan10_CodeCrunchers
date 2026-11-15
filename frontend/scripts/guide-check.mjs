// Fails if a tour, page action, control or target list names a data-guide id that no source file sets.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const SRC = new URL('../src', import.meta.url).pathname
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [] })
const src = files(SRC).filter(p => !p.includes('/guide/content/') && !p.endsWith('guide/targets.ts')).map(p => readFileSync(p, 'utf8')).join('\n')
const set = new Set([...src.matchAll(/data-guide="([\w-]+)"/g)].map(m => m[1]))
// ids built from a template, e.g. data-guide={`nav-${tab.to.slice(1)}`} and data-guide={`lab-${mod.id}`}
const prefixes = [...src.matchAll(/data-guide=\{`([\w-]+)\$\{/g)].map(m => m[1])
const has = id => set.has(id) || prefixes.some(p => id.startsWith(p))
const want = new Map()
const note = (id, where) => want.set(id, [...(want.get(id) ?? []), where])
const targets = readFileSync(join(SRC, 'guide/targets.ts'), 'utf8')
for (const m of targets.matchAll(/'([a-z][\w-]+)'/g)) if (!m[1].startsWith('/')) note(m[1], 'targets.ts')
for (const lang of readdirSync(join(SRC, 'guide/content')).filter(f => /^[a-z]{2}\.ts$/.test(f))) {
  const c = readFileSync(join(SRC, 'guide/content', lang), 'utf8')
  for (const m of c.matchAll(/(?:target|when): '([\w-]+)'/g)) note(m[1], lang)
  for (const m of c.matchAll(/\{ id: '([\w-]+)', label:/g)) note(m[1], `${lang} controls`)
}
const missing = [...want].filter(([id]) => !has(id))
if (missing.length) { console.error('guide:check FAILED. No element sets these data-guide ids:'); for (const [id, w] of missing) console.error(`  ${id}  (used in ${[...new Set(w)].join(', ')})`); process.exit(1) }
console.log(`guide:check passed: ${want.size} ids, all present in the source.`)
