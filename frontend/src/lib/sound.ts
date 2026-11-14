// Small synthesised cues. Off until the player turns sound on.
let ctx: AudioContext | null = null
const KEY = 'pq.sound'

export const soundOn = () => localStorage.getItem(KEY) === '1'
export function setSound(on: boolean) {
  localStorage.setItem(KEY, on ? '1' : '0')
  if (on) play('tick')
}

function note(freq: number, at: number, dur: number, gain = 0.05, type: OscillatorType = 'sine') {
  const o = ctx!.createOscillator(), g = ctx!.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(ctx!.destination)
  o.start(at); o.stop(at + dur + 0.02)
}

export function play(kind: 'tick' | 'good' | 'bad' | 'level' | 'coin') {
  if (!soundOn()) return
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime
    if (kind === 'tick') note(880, t, 0.06, 0.03, 'triangle')
    if (kind === 'good') { note(523, t, 0.18); note(784, t + 0.09, 0.3) }
    if (kind === 'coin') { note(1568, t, 0.08, 0.025); note(2093, t + 0.05, 0.12, 0.02) } // soft clink
    if (kind === 'bad') note(196, t, 0.22, 0.04, 'triangle')
    if (kind === 'level') [392, 523, 659, 784].forEach((f, i) => note(f, t + i * 0.11, 0.45))
  } catch { /* audio unavailable */ }
}
