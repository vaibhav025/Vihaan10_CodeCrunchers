import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from '../components/ui/icons'
import { Label } from '../components/ui/kit'
import { Character, Sidekick, type CharState } from '../game/character/Character'
import { getLook, ITEMS, LINES, owned, rt, saveLook, tx, type Item, type Slot } from '../game/character/roster'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { play } from '../lib/sound'

const STATES: CharState[] = ['idle', 'walk', 'run', 'hop', 'jump', 'hurt', 'celebrate', 'tired', 'sleeping']
const SLOTS: Slot[] = ['sidekick', 'hat', 'outfit', 'glasses', 'held', 'trail', 'dance']

/** Wardrobe and Squad: preview, try on and equip cosmetics and a sidekick. Looks only. */
export default function Wardrobe() {
  const { lang } = useI18n()
  const { progress } = useSession()
  const [look, setLook] = useState(getLook)
  const [state, setState] = useState<CharState>('idle')
  const [pop, setPop] = useState(0)
  const equip = (it: Item) => {
    const next = { ...look, [it.slot]: it.id }; setLook(next); saveLook(next); play('good')
    setState('celebrate'); setPop(pop + 1); setTimeout(() => setState('idle'), 1400) // try-on moment
  }
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="band h-fit p-6 text-center lg:sticky lg:top-24">
          <div className="relative z-10">
            <h1 className="text-[1.9rem] leading-tight">{rt('title', lang)}</h1>
            <div key={pop} className="scale-in mt-4 flex items-end justify-center"><Sidekick id={look.sidekick} size={84} moving={state === 'walk' || state === 'run'} /><Character state={state} look={look} size={168} /></div>
            <p className="mx-auto mt-3 min-h-[3em] max-w-[260px] text-[15px] italic text-[#FFFFFF]/85">“{tx(LINES[look.sidekick][pop % 3], lang)}”</p>
            <Label className="mt-3 block">{rt('tryStates', lang)}</Label>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {STATES.map(s => <button key={s} aria-pressed={state === s} onClick={() => setState(s)} className={`min-h-[36px] rounded-md border px-2.5 font-mono text-[11px] uppercase tracking-wider ${state === s ? 'border-[#FFFFFF] bg-[#FFFFFF] text-[#0A0A0A]' : 'border-white/20 hover:border-white/50'}`}>{s}</button>)}
            </div>
            <p className="label mt-4">{rt('note', lang)}</p>
            <Link to="/home" className="mt-3 inline-block text-[15px] underline underline-offset-4">{rt('back', lang)}</Link>
          </div>
        </aside>
        <div className="space-y-7">
          {SLOTS.map(slot => (
            <section key={slot} aria-labelledby={`s-${slot}`}>
              <h2 id={`s-${slot}`} className="text-[1.5rem] text-ink">{rt(slot, lang)}</h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {ITEMS.filter(i => i.slot === slot).map(it => {
                  const has = owned(it, progress), on = look[slot] === it.id
                  return (
                    <li key={it.id} className={`hud flex flex-col items-center p-3 text-center ${on ? '!border-forest' : ''}`}>
                      <span className={`grid h-[92px] place-items-center ${has ? '' : 'opacity-35 brightness-0'}`}>
                        {slot === 'sidekick' ? <Sidekick id={it.id} size={72} /> : <Character look={{ ...look, [slot]: it.id }} size={62} state={slot === 'dance' ? 'celebrate' : slot === 'trail' ? 'walk' : 'idle'} />}
                      </span>
                      <span className="mt-1 font-serif text-[16px] leading-tight text-ink">{tx(it.name, lang)}</span>
                      {has ? <button disabled={on} onClick={() => equip(it)} className={`mt-2 min-h-[40px] w-full rounded-md px-2 text-[14px] font-medium ${on ? 'bg-haze text-forest' : 'bg-forest text-on-forest hover:bg-forest-hover'}`}>{rt(on ? 'on' : 'equip', lang)}</button>
                        : <span className="label mt-2 flex min-h-[40px] items-center gap-1 !normal-case !tracking-normal"><Lock size={12} className="shrink-0" />{tx(it.hint!, lang)}</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
