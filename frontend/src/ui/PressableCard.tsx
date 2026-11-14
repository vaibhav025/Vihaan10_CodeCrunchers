import type { ReactNode } from 'react'

/** A raised card that lifts on hover and presses in on tap (transform only; the shadow cross-fades). */
export default function PressableCard({ children, className = '', as: As = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'button' } & Record<string, unknown>) {
  return <As className={`hud pressable ${className}`} {...rest}>{children}</As>
}

/** Placeholder block with a soft shimmer, for first loads. */
export const Skeleton = ({ className = '' }: { className?: string }) => <span aria-hidden className={`skeleton block rounded ${className}`} />
