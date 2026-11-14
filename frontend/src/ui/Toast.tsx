import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { spring } from './motion'

const Ctx = createContext<(text: string) => void>(() => {})
export const useToast = () => useContext(Ctx)

/** A quiet confirmation at the bottom of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string }[]>([])
  const show = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setItems(s => [...s, { id, text }])
    setTimeout(() => setItems(s => s.filter(x => x.id !== id)), 2600)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 md:bottom-8" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map(t => (
            <m.p key={t.id} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={spring}
              className="surface-float rounded-md px-4 py-2.5 text-[15px] text-ink">{t.text}</m.p>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
