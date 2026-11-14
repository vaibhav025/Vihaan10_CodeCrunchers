import type { Variants } from 'framer-motion'
import { motion as M } from '../design-tokens'

export const { ease, spring, duration } = M

/** Fade and rise; under reduced motion MotionConfig turns movement into a plain fade. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease } },
}
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring },
}
export const stagger = (delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: M.stagger, delayChildren: delay } },
})
export const page = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast, ease } },
}
export const isTouch = () => matchMedia('(pointer: coarse)').matches
