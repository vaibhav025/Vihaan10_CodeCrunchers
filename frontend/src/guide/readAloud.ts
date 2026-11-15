import { useCallback, useEffect, useRef, useState } from 'react'

/** Read text aloud with the device's own voice. Reports the word being spoken where the browser supports it. */
export function useAloud(lang: string) {
  const [on, setOn] = useState(false)
  const [mark, setMark] = useState<[number, number] | null>(null)
  const [slow, setSlow] = useState(false)
  /** 'none' = no speech on this device, 'other' = no voice for this language */
  const [issue, setIssue] = useState<'none' | 'other' | null>(null)
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window
  const slowRef = useRef(slow); slowRef.current = slow
  const stop = useCallback(() => { if (can) speechSynthesis.cancel(); setOn(false); setMark(null) }, [can])
  useEffect(() => stop, [stop])
  const say = useCallback((text: string) => {
    if (!can) { setIssue('none'); return }
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text), want = lang === 'hi' ? 'hi' : 'en'
    const v = speechSynthesis.getVoices().find(x => x.lang.toLowerCase().startsWith(want))
    if (v) u.voice = v; else if (want !== 'en' && speechSynthesis.getVoices().length) setIssue('other')
    u.lang = want === 'hi' ? 'hi-IN' : 'en-IN'; u.rate = slowRef.current ? 0.7 : 0.95
    u.onboundary = e => { if (e.name === 'word') { const end = text.indexOf(' ', e.charIndex); setMark([e.charIndex, end < 0 ? text.length : end]) } }
    u.onend = u.onerror = () => { setOn(false); setMark(null) }
    setOn(true); speechSynthesis.speak(u)
  }, [can, lang])
  return { on, mark, slow, setSlow, issue, say, stop, toggle: (text: string) => (on ? stop() : say(text)) }
}
