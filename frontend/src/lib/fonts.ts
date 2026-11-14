/**
 * Web fonts are injected after the first frame, so they never delay first paint; until then
 * text uses the metric-matched fallbacks in font-fallbacks.css. Resolves once the fonts the
 * page needs have arrived, or after `timeout` ms on a slow connection.
 */
import { afterFirstPaint } from './idle'

let ready: Promise<void> | null = null

export function loadFonts(timeout = 3000): Promise<void> {
  ready ??= new Promise<void>(resolve => {
    const done = () => resolve()
    window.setTimeout(done, timeout)
    afterFirstPaint().then(() => {
      import('../fonts.css')
        // the new faces start downloading on the next style pass
        .then(() => new Promise<void>(r => requestAnimationFrame(() => r())))
        .then(() => document.fonts.ready)
        .then(done, done)
    })
  })
  return ready
}
