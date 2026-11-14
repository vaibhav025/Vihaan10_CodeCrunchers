/** Runs fn when the main thread is idle (at most `timeout` ms later). Safari has no requestIdleCallback. */
export function whenIdle(fn: () => void, timeout = 1500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(fn, Math.min(timeout, 300))
  return () => window.clearTimeout(id)
}

let painted: Promise<void> | null = null
/**
 * Resolves a couple of frames after the first contentful paint, so deferred downloads
 * (web fonts, the 3D scene, prefetches) never compete with the page's first content.
 */
export function afterFirstPaint(): Promise<void> {
  painted ??= new Promise<void>(resolve => {
    const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))
    const seen = () => performance.getEntriesByName('first-contentful-paint').length > 0
    if (seen()) return settle()
    try {
      const po = new PerformanceObserver(() => { if (seen()) { po.disconnect(); settle() } })
      po.observe({ type: 'paint', buffered: true })
    } catch { /* no paint timing (older Safari) */ }
    // fallback for browsers without paint timing
    window.setTimeout(settle, 1500)
  })
  return painted
}

/** whenIdle, but never before first paint. Returns a cancel function. */
export function idleAfterPaint(fn: () => void, timeout = 1500): () => void {
  let cancel: (() => void) | null = null, dead = false
  afterFirstPaint().then(() => { if (!dead) cancel = whenIdle(fn, timeout) })
  return () => { dead = true; cancel?.() }
}
