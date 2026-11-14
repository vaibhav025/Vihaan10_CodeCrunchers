# PensionQuest design system

A strategy game about your own retirement. Calm, precise, a little cinematic. The 3D world is
the progress bar; the interface around it is a quiet paper HUD.

Tokens live in `src/design-tokens/index.ts` (used by the 3D scene) and are mirrored as CSS
variables in `src/index.css` (used by Tailwind and dark mode).

## Colour

| Token | Light | Use |
|---|---|---|
| `paper` | `#F7F5E8` | Page background, with a soft radial light from the top right |
| `card` | `#FCFBF3` | HUD panels |
| `ink` | `#243B2C` | Headings, primary text |
| `soft` | `#55635A` | Body grey and mono labels |
| `forest` / `forest-hover` | `#3F5B3A` / `#2F4A2C` | Primary button, progress, focus ring |
| `leaf` | `#55764F` | The italic accent word (text-safe sage) |
| `sage` | `#8FA582` | Shapes only |
| `amber` / `amber-soft` | `#D9823F` / `#F0B67A` | Accent shapes, lit lanterns, earned insignia |
| `rust` | `#A2561C` | Amber as text (losses, errors) |
| `mist`, `haze`, `line` | `#E6E2D0`, `#EAF1EC`, `#D6D1BC` | Tracks, selected rows, hairlines |

State colours, always paired with a four-bar glyph and a word, never colour alone:
Thriving `#4F8A5B`, Stable `#8FA582`, Struggling `#D9A441`, Critical `#C4673A`, Zero `#8B8F88`.

Dark mode (`data-theme="dark"`) uses `#101A14` as paper and switches the 3D scene to night.

`sage` and `amber` are too pale for text on paper, so text uses `leaf` and `rust` instead.

## Type

| Role | Face | Notes |
|---|---|---|
| Headlines, large numerals | Newsreader | Tight leading (1.02–1.12), one italic word in `leaf` |
| UI and body | Geist | 15–17px, relaxed leading |
| HUD labels | IBM Plex Mono | 11px, uppercase, 0.12em tracking (`.label`) |
| Hindi and Marathi | Noto Serif / Sans Devanagari | Tracking relaxed and line-height raised via `:lang()` |

Scale: 11 (label) · 13 · 15 · 17 (body) · 20 · 24 · 30 · 44 · up to 74px (hero, fluid with `clamp`).
Numerals use `.num`: serif, tabular, lining. Currency is always Indian format (`₹ 1,20,000`,
`₹ 1.53 Cr`) from `src/lib/format.ts`.

## Shape and spacing

- Radii 6 / 8 / 10px. No pills.
- 1px hairline borders, flat cards, one soft shadow (`shadow-paper`).
- `.hud` panels carry two small corner brackets.
- Spacing on a 4px base: 8, 12, 16, 20, 24, 32, 48. Page gutter 20px mobile, 32px desktop,
  max width 1320px.
- Touch targets are at least 44px; primary buttons 48px.

## Motion

The world moves; the interface answers.

- **World**: every object grows from one of four live values (vitality, road, lanterns,
  level). Changes settle in about 1.2s with a slight overshoot. On load the tile rises and
  the world assembles itself.
- **Ambient**: Future You walks the road, chimney smoke, birds, falling leaves, cloud
  shadows, a car when thriving, slow idle drift. Drag turns the world.
- **Reward**: new road or a new monument tier throws a spark burst and a brief camera
  push-in. XP gains tick into the HUD bar. A new level or insignia gets a full-screen reveal.
- **Interface**: screens slide in (350ms), HUD cards stagger in, buttons press down, rows
  shift on hover, a wrong answer nudges 2px.
- **Reduced motion**: the scene renders on demand with no ambient motion, values snap, and
  CSS animation is disabled. Drag still works.
- **Sound** is off by default; the HUD has the toggle.

## Voice

Short, declarative, mission voice. "Future You is stable. Add ₹ 1,500/month to reach
Thriving." No exclamation marks, no emoji. Jargon gets a one-line explanation. The line
"Illustrative projections, not financial advice." and a link to the official NPS site are
on every screen.

## The five states

Screenshots are in `docs/screens/`: `state-zero.png`, `state-critical.png`,
`state-struggling.png`, `state-stable.png`, `state-thriving.png`.

| State | Saving vs 10% target | World |
|---|---|---|
| Zero | under 20% | Empty plot, fog |
| Critical | 20–49% | Small home, bare trees, overcast, road unfinished |
| Struggling | 50–79% | Home, a few trees, cooler light |
| Stable | 80–99% | Full-size home, pond, smoke from the chimney, steady light |
| Thriving | 100%+ | Extra wing, garden, car, birds, full trees, warm light |
