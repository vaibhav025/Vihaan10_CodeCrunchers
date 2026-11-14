# PensionQuest: game design

The home screen is a winding path of level nodes over the Life Road. Tap the glowing node, play a
2-minute lesson, watch Future You walk one step forward.

## Node types

| Type | Phase 1 | What it is |
|---|---|---|
| Lesson | **Playable** | 3 multiple-choice questions from the backend quest bank |
| Chest | **Playable** (placeholder) | Tap to open: +20 coins |
| Boss (zone checkpoint) | **Playable** | 5 questions; larger pedestal with a crest |
| Story | **Playable** | A raise at 28: three choices, each run through `/api/simulator/calculate`; the world drawing changes with the choice |
| Practice | Replays | Replaying a completed node runs 4 bank questions to improve stars |

Node states: completed (gold ring, 1–3 stars), current (pulsing glow, bouncing Start, character
beside it), locked (grey, padlock; tapping says what to finish first).

Zone 1 (The Clearing): Lesson 1 · Lesson 2 · Chest · Lesson 3 · Checkpoint. Zone 2 shows locked
beyond its banner.

## Lesson flow

Full screen, no header or tabs. Segmented progress bar that fills with a spring, a Focus meter
(100, −20 per mistake; it only ever affects bonuses, never blocks play), the question card, and a
Check button: grey until an answer is picked, green when ready. After Check, a feedback sheet slides
up: green with "Correct." or amber with the right answer and a one-line explanation, then Continue.
Keys A–D pick, Enter checks or continues.

Wrong answers come back at the end of the lesson as a "Second try". The backend has already
recorded the first answer, so the second try is checked on the device.

Summary: stars land one by one, XP counts up, accuracy, time, coins and streak. Continue returns to
the path, where the character walks to the next node.

## Economy (phase 1)

| | Value | Source |
|---|---|---|
| XP per question | 50 correct / 10 wrong (backend) | `/api/quests/submit` |
| Coins per lesson | 10 | device (placeholder) |
| Coins per chest | 20 | device (placeholder) |
| Stars | 0 mistakes = 3, 1–2 = 2, else 1 | device |

Coins and stars are stored per device until the backend has endpoints for them. Streak comes from
the backend on every answer.

## Known limits

- The backend has 10 seeded quests, so Zone 1 runs out after about 3 lessons. A node with no quests left says new ones are on the way.
- Leagues, shop, daily quest chest, Rest day tokens, story nodes and other question types come in phases 2–5.

## Question types (phase 2)

Multiple choice comes from the backend. The rest live in `src/lib/questions.ts`, a **placeholder bank** in
English, Hindi and Marathi, until the API has a question `type` field: true/false (swipe or buttons),
match pairs (tap term then meaning), order the steps (tap in order; tap to undo), slider answer,
spot the mistake, and A-vs-B plans whose corpus comes from the calculator API. Each lesson mixes
3 backend questions with 2 bank questions; the checkpoint mixes 5 and 3. Bank answers are checked on
the device and earn coins, not server XP. Drag-and-drop was not added: every type is fully tap-driven.

Combo: 3 correct in a row shows "Focused ×3" and pays +5 coins; 5 in a row pays +10. (The brief asked
for +5 XP; server XP is awarded only by the backend, so the bonus is coins.)

Juice: springy progress and card entrances, shake on wrong, bright sweep on correct, counted
numbers, vibration patterns on phones, and optional sound.

## Meta-game (phases 3-5)

| Feature | How it works | Where it lives |
|---|---|---|
| Daily quests | Complete a lesson · score 90%+ · try the simulator. All three open the day chest (+30 coins, +1 rest day) | device |
| Daily goal | Picked in onboarding: Casual (1 lesson), Regular (2), Serious (3) | device |
| Streak | From the backend. At-risk chip if today is not done; 7/30/100 days trigger a full-screen moment | backend + device |
| Rest day | Earned from the day chest or 50 coins. After a gap of 2+ days, "Future You misses you" (tired look, dim lanterns) offers to restore the streak | device; true server-side protection needs a backend change |
| League | Bronze to Diamond. 300+ XP in a week promotes, under 50 demotes. Standings show real players by total XP until weekly leagues exist on the server | device + `/gamification/leaderboard` |
| Shop | Rest day 50 · coin boost 40 (doubles lesson coins for 15 min) · glasses 80 · scarf 40 · cane 60 · garden bed 120. Cosmetics appear on Future You in the 3D world | device |
| Friend quest | 20 lessons together this week; invite link; friends' progress needs a backend | device |
| Zone unlock | Passing the checkpoint opens Zone 2: the nodes build in one by one | device |

Not done: an offline cache of the next lessons (the backend serves one quest at a time), and real
multiplayer for leagues and friend quests.
