# Motion guidelines

Restraint beats spectacle. Motion explains what changed; it never decorates.

## Tokens (`src/design-tokens/index.ts` → `motion`, re-exported by `src/ui/motion.ts`)

| Token | Value | Use |
|---|---|---|
| `ease` | cubic-bezier(0.22, 1, 0.36, 1) | every tween |
| `spring` | stiffness 260, damping 24 | anything that moves into place |
| `duration.fast` | 180 ms | hover, press, toggles |
| `duration.base` | 250 ms | UI feedback |
| `duration.slow` | 500 ms | entrances |

## Rules

1. **One hero per page.** Simulator: the tile. Coach: the conversation. Profile: the Future Self card. Path: the current node.
2. **At most two ambient animations on screen.** Everywhere: the 40 s drifting light. Plus at most one of: Simulator tile bob (4 px, 6 s), Coach orb breathing (5 s), Path current-node pulse. All ambient loops pause when the tab is hidden.
3. **Transform and opacity only.** Colour, shadow and size changes either swap instantly or cross-fade a pre-drawn layer (button shadows, card lift, sheet sweep). Line drawing (growth chart, rings, check marks) is a JavaScript tween of an SVG attribute, never a CSS animation.
4. **Numbers always count.** Use `CountUp` (600 ms, tabular numerals, no layout shift).
5. **Entrances under 700 ms.** Pages fade up 12 px in 400 ms; the outgoing page fades up 8 px in 180 ms. Staggered children: 60 ms apart.
6. **Reduced motion** (system setting or Profile → Reduce motion): movement becomes a plain fade or nothing, all loops stop, numbers jump, tilt and parallax are off, the 3D world shows its still drawing.
7. **Touch devices**: no tilt or parallax.

## Shared components (`src/ui/`)

`Reveal` / `RevealItem` (fade up once on scroll into view) · `CountUp` / `useTween` · `Tilt` (cursor tilt, optional glare) ·
`PressableCard` and `Skeleton` · `Segmented` (sliding highlight) · `Toast` (`useToast()`) · `DrawCheck` (in `components/ui/kit.tsx`).
`/motion-debug` (dev only) shows each one.

## Removed for restraint

- No ambient motion on the Profile page beyond the drifting light; medal shine runs once per view.
- The landing hero spotlight is the only cursor-following light in the app.
