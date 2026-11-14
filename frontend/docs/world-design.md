# The Life Road: world design

One winding road across a floating island: Future You's life from today to 60, in seven zones,
one per level. **Level decides what is built. Future You state decides how the world feels.**

## Data flow

`useLifeProfile()` (session + contribution and badge counts) → `worldFromProfile()` → `LifeWorld`
→ `LifeScene`. The scene renders a `WorldState` and holds no game logic.

| WorldState field | Rule |
|---|---|
| `level`, `xpInLevel` | From the XP thresholds 0 / 500 / 1,500 / 3,500 / 7,500 / 15,000 / 30,000 |
| `zones[k]` | `built` below the current level, `partial` for the next one, `ghost` beyond |
| `partial` | The next zone's foundation slab fills with `xpInLevel` |
| `pavedSegments` | 5 segments between zones (30 total). Roads to built zones are paved; each quest paves one more |
| `progress` | Character position = (level − 1) × 5 + xpInLevel × 5 segments, never past the paving |
| `lanternsLit` | 1 per streak day, max 30 |
| `trinkets` | 1 per badge (rendered from build step 2) |

## Zones

| # | Level | Zone | Status | Build order (seconds from unlock) | Total |
|---|---|---|---|---|---|
| 1 | NPS Rookie (0) | The Clearing | **Built** | signpost 0 · tent 0.45 · flap 0.95 · 7 fire stones 1.3 (+60 ms each) · logs 1.95 · fire and light 2.3 · sweep 2.6 | 3.1 s |
| 2 | Learner (500) | First Roof | **Built** | walls 0 · roof 0.7 · chimney 1.05 · door and windows 1.3 · well 1.6 · 11 fence posts 2.0 (+60 ms each) · 2 lanterns 2.75 · window light 3.1 · sweep 3.2 | 3.7 s |
| 3 | Aware (1,500) | Green Season | **Built** | stream 0 · bridge 0.5 · 6 trees 1.0 (+80 ms) · garden 2.0 · 5 flowers 2.4 · sweep 3.0 | 3.4 s |
| 4 | Saver (3,500) | Settled | **Built** | walls 0 · roof 0.7 · lit windows 1.2 · cart 1.6 · market stall 2.0 · crates 2.5 · sweep 3.0 | 3.5 s |
| 5 | Champion (7,500) | Community | **Built** | school 0 · roof 0.6 · clinic 0.9 · clinic mark 1.3 · 4 solar panels 1.8 · family 2.4 · sweep 3.2 | 3.6 s |
| 6 | Master (15,000) | Horizons | **Built** | 5 fields 0 · station 1.0 · train 1.4 · lake 1.9 · boat 2.3 · sweep 3.0 | 3.4 s |
| 7 | Legend (30,000) | The Summit | **Built** | hill 0 · lighthouse 0.6 · top 1.2 · beacon 1.8 · rising lights 2.4 · sweep 3.0 | 3.4 s |

Every piece rises from the ground with a spring overshoot (`springOut`) over 0.55 s, kicks up a dust
ring as it lands, and the zone ends with an amber light sweep. Each zone exports `buildSequence`, so
the timeline can be played, skipped (all clocks jump to the end) or replayed (debug panel).

A zone plays once per level per device (`pq.seenLevel.<userId>`). If a level-up dialog is open, the
sequence waits until it is dismissed.

## Camera rules

- Orthographic, fixed isometric offset (14, 13, 14). Follows the character with critically damped easing; never linear.
- Unlock: pans to the zone, pulls back to 0.78×, holds while it builds, then returns. The character turns to look at it and celebrates.
- Any tap on the world, or the Skip button, ends the cinematic at once. DOM controls never wait on it.
- One-finger horizontal drag looks along the road (vertical drag still scrolls the page). A Recenter button appears once you look away; double-tap also recentres.
- Pinch (touch, or trackpad ctrl+wheel) is limited to 0.85–1.3×.
- Quest page: 1.45× closer, light dimmed to 85%. Wrong answer: 0.5 s sideways nudge and a dim pulse.

## Atmosphere (state)

| State | Light warmth | Fog | Vegetation | Character |
|---|---|---|---|---|
| Thriving | full warm | far | green | upright, forest coat |
| Stable | 0.8 | | | slight lean |
| Struggling | 0.5 | | | |
| Critical | 0.25 | | | stooped, faded coat |
| Zero | cold | close | grey-green | most stooped, grey coat |

Fog also lifts as the level rises, so a new player starts in the Clearing surrounded by fog.
Weather (drizzle, overcast sky) comes in step 2.

## Performance

- `LifeScene` is its own lazy chunk (7.8 KB gzip, plus the shared `three` chunk). It loads after first paint, behind the still drawing.
- `frameloop="demand"`. A driver renders every frame while anything animates (builds, paving, walking, camera), 24 fps for idle life, and nothing when the tab is hidden or the world is off-screen.
- Instanced: road tiles (90), survey dashes, lanterns (30 × 2), edge trees (46 × 2). One shadow-casting light that travels with the camera. DPR capped at 1.5. Antialias off on touch devices.
- Reduced motion, Save-Data and small low-core devices get the still drawing.

## Since step 1

- Zones 3-7 built with the shared `zones/zoneKit.tsx` (each zone file exports its component and `buildSequence`).
- Trinkets: a medal on a post beside the road for each badge (instanced).
- Weather: drizzle when Future You is struggling or worse; overcast fog as warmth drops; golden hour at Legend.
- Lite mode: starts on devices with 4 or fewer cores or 4 GB or less memory, and switches on if a first-second probe sees under 30 fps. It turns off shadows and rain and halves the idle frame rate.
- Landing: a scroll-driven fly-through of all seven zones; the hero's saving slider decides how many are built; "Skip to start".
- Simulator: the cost of delay also shows as two roads, starting now and starting five years late.
- Debug panel: adds a night (time of day) toggle.

## Not yet done

Onboarding still uses the original diorama; a pre-rendered still per level; the share card drawn from
the live 3D frame (it uses the still drawing); a 3D trophy shelf (medals are styled 2D); the Quest
minimap; real art (see credits.md).
