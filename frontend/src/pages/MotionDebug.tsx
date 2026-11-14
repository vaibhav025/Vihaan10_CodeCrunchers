import { useState } from 'react'
import Reveal, { RevealItem } from '../ui/Reveal'
import CountUp from '../ui/CountUp'
import Tilt from '../ui/Tilt'
import PressableCard, { Skeleton } from '../ui/PressableCard'
import Segmented from '../ui/Segmented'
import { useToast } from '../ui/Toast'
import { DrawCheck, Label, XpBar } from '../components/ui/kit'

/** Dev only: every shared motion component in its states. */
export default function MotionDebug() {
  const [n, setN] = useState(1200)
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [on, setOn] = useState(false)
  const toast = useToast()
  return (
    <div className="mx-auto max-w-[900px] space-y-10 px-5 py-6">
      <h1 className="text-4xl text-ink">Motion components</h1>
      <section><Label>CountUp</Label><p className="num mt-2 text-5xl text-ink"><CountUp value={n} /></p>
        <button className="btn mt-3" onClick={() => setN(Math.round(Math.random() * 100000))}>Change number</button></section>
      <section><Label>Button (rest, hover, press, loading)</Label><div className="mt-2 flex gap-3"><button className="btn">Primary</button><button className="btn" disabled>Disabled</button>
        <button className="btn relative"><span className="invisible">Loading</span><span className="spin absolute h-5 w-5 rounded-full border-2 border-on-forest/40 border-t-on-forest" /></button></div></section>
      <section><Label>PressableCard</Label><PressableCard className="mt-2 p-6">Hover lifts 2 px; press scales to 0.985.</PressableCard></section>
      <section><Label>Tilt with glare</Label><Tilt max={8} glare className="mt-2 w-64 overflow-hidden rounded-lg"><div className="hud h-40 p-6">Move the cursor over me.</div></Tilt></section>
      <section><Label>Segmented</Label><div className="max-w-sm"><Segmented label="Demo" value={seg} onChange={setSeg} options={[{ id: 'a', name: 'One' }, { id: 'b', name: 'Two' }, { id: 'c', name: 'Three' }]} /></div></section>
      <section><Label>DrawCheck</Label><button className="row mt-2 max-w-xs" onClick={() => setOn(!on)}><span className="flex-1">Toggle</span><DrawCheck on={on} /></button></section>
      <section><Label>Skeleton</Label><div className="mt-2 space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-1/2" /></div></section>
      <section><Label>Progress</Label><XpBar pct={n % 100} className="mt-2" /></section>
      <section><Label>Toast</Label><button className="btn mt-2" onClick={() => toast('Saved.')}>Show toast</button></section>
      <Reveal stagger className="grid grid-cols-3 gap-3">{[1, 2, 3].map(i => <RevealItem key={i} className="hud p-6">Reveal {i}</RevealItem>)}</Reveal>
    </div>
  )
}
