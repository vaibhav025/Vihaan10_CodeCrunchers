# Prompt: Build "Market Lab" for SixtyFy

You are working in the SixtyFy repository (folder `Vihaan10-CodeCrunchers`). SixtyFy is a free retirement-planning app for young Indians, built for a hackathon. Before writing any code, read the codebase and follow its existing patterns. Do not rewrite or break existing features.

## 1. Context: what already exists

- **Frontend** (`frontend/`): React 19, TypeScript, Vite, Tailwind, Framer Motion, React Router.
  - Pages live in `src/pages/` and are registered with the `page()` helper in `src/routes.tsx`, then routed in `src/App.tsx`. Signed-in pages are wrapped in `<Guard>`. The top tabs are the `TABS` array in `App.tsx`.
  - All user-facing text goes through `useI18n()` and `t('key')`, with strings in `src/lib/locales/en.ts`, `hi.ts` and `mr.ts`. English is the fallback.
  - Icons come only from `src/components/ui/icons.ts` (add new lucide icons there).
  - Gamification already exists: XP, levels, streaks, badges, and a "future self" state (`zero | critical | struggling | stable | thriving`). Reuse these; do not invent a parallel system.
  - The Tracker (`src/lib/tracker.ts`, `src/pages/Tracker.tsx`) holds the user's real holdings, income and expenses. The Coach (`src/pages/Coach.tsx`) is a chat backed by `POST /api/ai/coach/chat`.
- **Backend** (`backend/`): FastAPI, SQLAlchemy, Alembic migrations, pytest. Sensitive user fields are encrypted with AES-GCM via `EncryptedString` and related types. Rate limiting uses `app/limiter.py`. Tests are in `backend/tests/`.
- **Privacy is the product's main promise.** The user's real financial numbers never leave our server, and the AI model only ever sees placeholders. Nothing in this feature may weaken that.

## 2. Goal

Add **Market Lab**, a learning simulation that teaches:

1. **Why prices move:** trend, random noise and news.
2. **Risk:** volatility, concentration, panic selling, and why diversification helps.
3. **Products:** stocks, mutual funds, ETFs, and government schemes (NPS, Atal Pension Yojana, PPF, EPF).
4. **Retirement:** how these lessons add up over a career. Every module must end by linking back to the user's own retirement plan, because retirement planning is the app's purpose.

It is **education, not advice**. It uses only **fictional companies and funds**, virtual money, and no real tickers, real prices or trading.

## 3. Build in two phases

Build Phase 1 completely, test it, and report back before starting Phase 2.

### Phase 1

#### A. Simulation engine (`frontend/src/sim/`)

Pure TypeScript with no React and no network calls, so it is unit-testable and deterministic.

- **Seeded random number generator.** The same seed always produces the same market, so demos can be repeated.
- **About 8 fictional Indian-style companies across sectors:** construction, cement, steel, banking, payment apps, IT, FMCG and pharma. Each has a starting price, a volatility (some steady, some wild), and a sector.
- **Price model:** each tick, price change = trend + random noise + news effect. Keep these three components separate for every tick so the UI can show "why it moved".
- **News events as data** (a JSON or TS file, translatable): a headline, a plain-language explanation, and a per-sector impact (up, down or none, with strength). The effect is strongest at first and fades over a set number of ticks. Include at least 12 events, such as an interest-rate rise or cut, a government infrastructure push, an import tax, an export slump, a bank loan-default rise, a new rule for payment apps, a good monsoon, an oil price spike, a pharma approval, a strong budget for manufacturing, a global recession scare, and a strong IT export quarter.
- **Fund builder:** build a fund or ETF as a weighted basket of the simulated companies, with an expense ratio deducted daily. This prepares for Phase 2.
- **Fast-forward:** run many simulated years quickly, for Retirement Run.

#### B. Stocks module: "Why did it move?" (route `/lab/stocks`)

- **Market board:** a live price table with today's percentage change and a "risk" label per company, a price chart for the selected company, and virtual buy and sell with virtual cash (₹1,00,000). Show "Learning simulation · virtual money" visibly.
- **"Why did it move?" panel:** a stacked bar plus numbers showing how much of today's move came from trend, noise and news. When no news is active, say that the moves are just noise.
- **"You make the news" round:** the user picks a headline. Before it is released, they predict each sector's direction (up, down or no change). After release, they watch prices react, see their score (for example "4 of 6 right"), and read a short explanation of why each sector moved, from the event data.
- **Risk lessons**, triggered at the right moments:
  - *Concentration:* if more than 60% of virtual money is in one company, show what a single bad headline does to it.
  - *Panic test:* after a scripted crash, ask "Sell or hold?" and show the outcome a few simulated months later.
  - *Volatility:* compare a steady company with a wild one over the same period.
- **"Explain this move" button:** sends only the public news event (headline, sectors, direction) to the existing chat endpoint as a question. Never send portfolio values or tracker data.
- **XP for good behaviour, not trading:** correct predictions, diversifying, and holding through a dip. Never reward frequent trading.

#### C. Retirement Run (route `/lab/retire`): the key module

A full career compressed into about 10 minutes.

- **Start:** the user's real age, from their profile, and a default salary that grows yearly. Optional "Play with my numbers" uses their real tracker figures. These are already in the browser after login; do not send them anywhere new.
- **Each turn is one year.** The user splits their yearly savings across: NPS (with an equity share slider), Atal Pension Yojana, PPF, EPF, a mutual fund, an index ETF, and individual stocks. Defaults should be sensible, so a user can just click "Next year".
- **The engine's market drives the market-linked options.** Guaranteed schemes (APY, PPF) are unaffected by crashes. This is the "safety layer" lesson.
- **Random life events:** a job loss (skip saving for a year), a medical bill, a wedding, a promotion, an inflation spike, a market crash, a boom.
- **Sequence risk:** in the last 10 years, crashes should visibly hurt more when equity is high. Prompt the user once about reducing risk with age, and mention the NPS life-cycle (Auto Choice) idea.
- **At 60, the result screen shows:**
  - Corpus, estimated monthly pension and lump sum, compared with the monthly amount needed, all in today's money as well (inflation-adjusted).
  - Comparison with "ghost players" who used other strategies on the same market: FD only, stocks only, balanced, balanced but started 5 years late, and panic-seller.
  - The future-self state that matches the result, using the existing states.
  - Three plain-language lessons drawn from what happened in this run.
  - **"Apply to my plan" button:** opens the real Tracker or simulator with a suggested monthly SIP or NPS amount pre-filled, and offers to ask the Coach "Explain my Retirement Run result" (using placeholders, as the chat already does).

#### D. Lab hub (route `/lab`)

- A page with a card for each module and the user's best scores.
- Add a "Lab" tab to `TABS` in `App.tsx` and to the mobile tab bar.
- Add `/lab`, `/lab/stocks` and `/lab/retire` to `routes.tsx` and `App.tsx`, wrapped in `<Guard>`.

#### E. Backend: progress only

- **A new `lab_progress` table** (Alembic migration) storing the user id, module, best score, runs completed, last result summary (outcome category and lesson ids only, no money values), and timestamps.
- **`GET /api/lab/progress` and `POST /api/lab/progress`**, authenticated and rate-limited, awarding XP through the existing XP service. XP is capped per day so it can't be farmed.
- **Tests:** saving and loading progress, users can't see each other's progress, and the XP cap.

### Phase 2 (after Phase 1 is approved)

- **Funds & ETFs module (`/lab/funds`):**
  - An active fund (about 1.5% expense ratio) against an index ETF (about 0.1%) over 30 simulated years, showing the fee drag in rupees.
  - SIP against a lump sum through a crash.
  - NAV once a day against ETF intraday prices.
  - The "baskets beat bets" lesson comparing a fund with single stocks.
- **Government Schemes module (`/lab/schemes`):** interactive cards and mini-calculators for NPS (asset mix, Auto Choice, exit rules, tax benefits), APY (guaranteed pension by joining age and contribution), PPF and EPF. Then a quiz linked to the existing quest and XP system.
  - Every rule, rate and limit must come from a single data file with a "source" and "last checked" field. Use the facts already in `backend/app/ml/nps_knowledge_base.json` and `finance_knowledge_base.json` where they overlap.
  - Mark any figure you are not sure of with `TODO verify`. Do not invent official numbers.

## 4. Rules

- **Never use** real company names, real tickers, real prices, or language that recommends buying or selling anything. Show a short disclaimer on every Lab page: "Learning simulation with fictional companies and virtual money. Not investment advice."
- **No new third-party services,** analytics, or network calls from the simulation.
- **All new text goes through i18n,** with full English and Hindi. Marathi may fall back to English, but add the keys.
- **Match the existing design system:** reuse components from `src/components/ui/` and `src/ui/`, existing colour tokens, and the motion helpers in `src/ui/motion` and `src/lib/motionPref`. Respect reduced motion.
- **Mobile-first and accessible:** at least 44px touch targets, keyboard support, labelled charts, and colour never the only signal (use arrows and text for up and down).
- **Keep the engine pure and deterministic.** Put the UI in `src/pages/` and `src/components/lab/`.
- **Don't change unrelated files.** If you must touch shared code, explain why.

## 5. Acceptance checks

- `npm run build` and `npm run lint` pass in `frontend/`.
- `python -m pytest -q` passes in `backend/`, including the new tests.
- The engine has unit tests: the same seed gives the same prices, news moves the right sectors, the effect fades, and fund fees are applied. Add a lightweight test runner (for example Vitest) if none exists, and say that you did.
- Manual walkthrough:
  - Open the Lab, play one news round, and see the score and explanation.
  - Trigger the concentration and panic lessons.
  - Finish a Retirement Run, see the ghost comparison, and click "Apply to my plan".
  - Log out and back in, and progress is still there.
- No existing feature is broken: login and logout, Tracker, Coach, quests, profile and privacy page.

## 6. When you finish each phase, report

- The files added and changed.
- How to run and test it.
- Anything you couldn't verify, especially scheme figures marked `TODO verify`.
- Suggested next steps.
