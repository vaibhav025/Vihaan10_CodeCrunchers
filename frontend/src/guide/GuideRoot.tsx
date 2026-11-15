import { AnimatePresence } from 'framer-motion'
import { useGuide } from './GuideProvider'
import { useContent } from './content'
import Panel from './Panel'
import TourEngine from './TourEngine'
import Explain from './Explain'
import Nudge from './Nudge'

/** Everything of Dada Ji beyond the launcher. Loaded lazily, on first use or when the page is idle. */
export default function GuideRoot() {
  const g = useGuide()
  const c = useContent()
  if (!c) return null
  return (
    <>
      <AnimatePresence>{g.open && <Panel key="panel" c={c} />}</AnimatePresence>
      {g.tour && <TourEngine key={g.tour.id} c={c} />}
      {g.explain && <Explain c={c} />}
      <Nudge c={c} />
    </>
  )
}
