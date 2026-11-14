# SixtyFy

**Your retirement is a place. Go and find it.**

SixtyFy is a free web app that teaches Indian adults about the National Pension System (NPS) and personal finance through short daily quests and practice, tracks everything they own in one place, and answers their money questions, without handing their financial details to anyone.

Built by Team CodeCrunchers. The project started as PensionQuest, and a few internal names (database file, browser storage keys) still use that name.

## Contents

1. [The problem](#the-problem)
2. [Features](#features)
3. [A tour of the app](#a-tour-of-the-app)
4. [The simulators](#the-simulators)
5. [How the AI coach works, and how Prune is used](#how-the-ai-coach-works-and-how-prune-is-used)
6. [How privacy is kept](#how-privacy-is-kept)
7. [Tech stack](#tech-stack)
8. [Why it is feasible](#why-it-is-feasible)
9. [Project layout](#project-layout)
10. [Run it locally](#run-it-locally)
11. [Configuration](#configuration)
12. [API overview](#api-overview)
13. [Tests](#tests)
14. [Known limits](#known-limits)
15. [Team](#team)
16. [Financial disclaimer](#financial-disclaimer)

## The problem

Most working Indians under 40 do not plan for retirement. Pension products feel distant and technical, financial lessons are dull, and the apps that track money usually ask users to hand over sensitive data. SixtyFy makes the topic playable, keeps the numbers private, and shows the user their own future in a form they can see.

## Features

### Learn
- A **Dashboard** with today's goal, three daily quests, a streak, a weekly league, the Readiness Score and the safety tools.
- XP, levels, daily streaks, a daily chest, a weekly league and an opt-in leaderboard.
- A daily quest of one NPS question, five minutes a day.

### Track
- One tracker for FDs, PPF, EPF, NPS, mutual funds, stocks, gold, property, cash and ESOPs, plus income, expenses, loans and insurance.
- Net worth, and a **Readiness Score** across six pillars: funding, saving, emergency cover, insurance cover, debt and spread.
- What-if projections and weekly check-ins.

### Ask
- A coach chat with topic tabs (money, tax, retirement, risk).
- Answers show the calculation, cite their sources, and suggest follow-up questions.
- The user chooses whether an outside AI may help with wording, and whether the coach may use their tracker summary.

### Plan
- **Try a plan** on the landing page: age and monthly saving give a pension per month at 60 and a projected corpus, updating live.
- **The Life Road:** a 3D city street that grows from a chai stall to a landmark skyline as the plan strengthens. Hover a building to see what it stands for, click for details, drag to look around.

### Simulate
- **Market Lab**, four simulators that run on a fictional market with virtual money. Details in [The simulators](#the-simulators).
- **Pension calculator** behind the plan card and the Tracker's what-if, with side-by-side comparison of contribution levels.

### Stay safe
- A scam-awareness section and an employer PF check.

### Everywhere
- English and Hindi. (Marathi text exists but is switched off for now.)
- Dark and plum themes, with keyboard focus rings, reduced-motion support and a mobile layout down to 360px.
- A guided sign-up that sets age, target retirement age, outlook on retirement and current investments.
- Profile editing, data export and account deletion.

## A tour of the app

| Screen | What happens there |
|---|---|
| **Landing** | Hero over a live 3D world, the plan card and four figures, the Life Road, and a three-step explanation. |
| **Sign-up** | Name, email, mobile and password, then questions about retirement outlook, NPS awareness, age, retirement age and investments with expected returns. |
| **Dashboard** | Daily goal and quests, streak, league, Readiness Score and the safety tools. |
| **Tracker** | Add holdings by type, see net worth and the Readiness Score, try what-ifs. |
| **Coach** | Ask about your own numbers or about NPS and tax. |
| **Market Lab** | Four simulators: Retirement Run, Why did it move?, Funds and ETFs, Government schemes. |
| **Profile** | Level and XP, NPS contribution log, leaderboard, settings, profile editing, data export and delete. |

## The simulators

The **Market Lab** teaches by letting the user run experiments. Every company in it is invented, every rupee is virtual, and the same seed always replays the same market, so results can be explained and repeated.

| Simulator | What the user does | What it teaches |
|---|---|---|
| **Retirement Run** | Plays a whole working life in about ten minutes, one year per turn. Each year they split savings between options, then live through market crashes and life events. | How choices compound over a career, and what they retire with. |
| **Why did it move?** (stocks) | Watches a market of fictional companies and picks one to see what drove today's price. They can also trigger news events themselves. | Every price move is part slow trend, part random noise and part news. |
| **Funds and ETFs** | Four short experiments: what a yearly fee costs over 30 years, a SIP through a crash, how a fund is priced (NAV) versus an ETF, and 40 ten-year markets comparing single companies with an index basket. | Fees, rupee-cost averaging, pricing, and why diversification wins. |
| **Government schemes** | Reads the rules of NPS, Atal Pension Yojana, PPF and EPF, tries a calculator for each, then takes a ten-question quiz. | How each scheme works. The quiz counts as a lesson toward today's quests and earns XP. |

How it is built:

- **One engine.** The market (`frontend/src/sim/market.ts`) is plain data stepped one day at a time from a seeded random generator. The stocks module shows it day by day; the Retirement Run fast-forwards the same engine a year at a time.
- **Data in one place.** Every rate and limit lives in `sim/assumptions.ts`. Scheme rules live in `sim/schemes.ts`, each with its source and when it was last checked, and quiz answers are computed from that file, so a changed figure updates the quiz too.
- **Translated.** News headlines, explanations and quiz questions are translation keys, not stored text.
- **Tested.** `sim/sim.test.ts` and `sim/phase2.test.ts` cover the engine (run with `npm test`).
- **Progress saved.** Lab progress is stored per user through `/api/lab/progress`.

**Pension calculator.** The backend's `/api/simulator/calculate` projects the corpus and monthly pension for a contribution plan, and `/api/simulator/compare` returns several contribution levels side by side. The landing page's plan card uses the same projection logic in the browser.

## How the AI coach works, and how Prune is used

The coach has two layers, so it works fully without any outside AI.

1. **Built-in engine (always on).** Rules and retrieval over a vetted NPS knowledge base answer questions and run the calculators. Every figure in an answer is computed on our own server.
2. **Optional AI wording.** When a user has turned on **AI consent** in their profile, the app sends eligible chat requests through **Prune**, an AI gateway.

What happens before a request leaves the server:

- The server computes the user's personal financial figures locally and replaces them with placeholders such as `{{NET_WORTH}}` and `{{EMERGENCY_MONTHS}}`.
- Typed amounts and IDs in the user's message are masked.
- The model writes its reply around the placeholders, and the server fills in the real values afterwards, so the outside model never sees real numbers.

How Prune is configured:

| Setting | Value | Why |
|---|---|---|
| Prompt injection | `block` | Prune refuses prompt-injection attempts before they reach the model. |
| Cache | exact match | Repeated questions are answered from cache, saving cost and time. |
| Feature label | `coach-chat` | Groups spend in the Prune dashboard. |
| Workload label | `chat` | Same, by request type. |
| Model | set in the Prune dashboard (`gemini-2.5-flash` here) | If Prune forwards a request, it uses the provider and model configured there. |
| Strict mode | on by default | Every AI request goes through Prune. If Prune blocks or is unavailable, the built-in engine answers instead. A blocked request is never sent around Prune. |

No user identifier is sent to Prune. Provider keys live in the Prune dashboard, not in this repository. Run `python -m scripts.check_prune` from `backend/` to send a normal test request and a prompt-injection test through Prune and see that screening works.

If the user has not given consent, or no key is configured, nothing leaves the server.

## How privacy is kept

- **Encrypted at rest.** Profile fields, the tracker snapshot and contribution amounts are encrypted with AES-256-GCM before they are written to the database. A database leak exposes only ciphertext.
- **Session in an HttpOnly cookie.** Login tokens are never readable by page scripts or kept in local storage.
- **The AI never sees real figures.** See the section above.
- **Private by default.** AI consent is off until the user turns it on.
- **User control.** Users can export all their data or delete their account. The leaderboard shows an opt-in public handle, never a real name.
- **Rate limiting** on sign-up and login.

To show this in a demo, run `python -m scripts.show_data_vault --user-id <uuid>` from `backend/`. It prints a user's raw encrypted row beside the decrypted view. Use a demo account only.

This is application-level encryption for a hackathon project, not a compliance certification. Keep demo data synthetic.

## Tech stack

| Layer | Tools | Why this choice |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Fast to build and iterate, typed, and produces a small static bundle. |
| **Styling** | Tailwind CSS with CSS variables, DM Sans | One token file drives both themes, so a redesign is a change of values, not of every component. |
| **Motion** | Framer Motion, plus CSS transforms | Smooth, GPU-friendly animation limited to transform and opacity. |
| **3D** | Three.js with React Three Fiber | The Life Road and home world run in the browser with no plugin, are lazy-loaded, and pause when off-screen or hidden. |
| **Routing and icons** | React Router, Lucide | Standard and light. |
| **Backend** | FastAPI, async SQLAlchemy, Pydantic, Alembic | Quick to write, validated inputs, automatic API docs, and versioned database migrations. |
| **Security** | PyJWT in HttpOnly cookies, `cryptography` (AES-256-GCM), SlowAPI rate limiting | Covers sessions, data at rest and abuse limits with well-known libraries. |
| **Data** | SQLite locally, PostgreSQL in Docker or production, optional Redis | Zero setup for developers, a real database when deployed, and a cache that is optional. |
| **AI** | Built-in rules and retrieval engine, plus optional AI through Prune (Gemini 2.5 Flash), with Groq, OpenAI or local Ollama as alternatives | Works with no key and no cost, and adds natural wording only with consent. |
| **Quality** | pytest, Vitest, ESLint, GitHub Actions | Backend tests run on every push. |
| **Deploy** | Docker Compose (API, PostgreSQL, Redis); the frontend builds to static files | Any static host plus one container. |

## Why it is feasible

- **Free to run.** SQLite and the built-in coach need no paid service. The optional AI is cheap: Prune caches repeated questions, and a Flash-class model costs little per chat.
- **Proven, mainstream tools.** React, FastAPI, SQLAlchemy and Three.js are widely used, well documented and easy to hire for.
- **Light to host.** The frontend is static files. The backend is one small container. Heavy 3D code loads only when a page needs it.
- **Private by design, so low risk.** Sensitive data is encrypted, the outside AI never sees real figures, and consent is off by default.
- **Safe fallback.** If the AI provider or Prune is down, the built-in engine still answers.
- **Honest scope.** SixtyFy teaches and illustrates. It does not hold money, move money or give advice, so it needs no banking integration or licence to operate.
- **Real market need.** India has a large, young workforce and a government-backed pension scheme with low awareness. A free, private, playful way in fills a clear gap.
- **Path to scale.** The stack is stateless apart from the database, so it scales by adding containers. New Lab experiments and schemes are added as data, with no engine changes.
- **Already built and tested.** The app runs end to end today, with backend tests covering sign-up, encryption, user isolation, the calculators, Market Lab and the coach.

## Project layout

| Folder | Contents |
|---|---|
| `backend/` | FastAPI app, database models, encryption, the coach, migrations, seed scripts and tests. See `backend/README.md`. |
| `backend/app/routers/` | One file per API area. |
| `backend/app/services/` | The coach, the Prune and AI gateway, XP, streaks, badges and the leaderboard. |
| `backend/scripts/` | Seed quests and badges, check Prune, show the encrypted data vault. |
| `frontend/` | The React web app. See `frontend/README.md`. |
| `frontend/src/pages/` | One file per screen. |
| `frontend/src/game/` | Rewards and economy, character art, and the original game stages (no longer linked from the app). |
| `frontend/src/sim/` | The Market Lab engine: market, funds, career run, schemes and quiz. |
| `frontend/src/components/world/` | The 3D scenes. |
| `frontend/src/components/landing/` | The plan card, stats card and steps section. |
| `frontend/src/lib/locales/` | English and Hindi text (Marathi kept but switched off). |
| `frontend-mobile/` | Translations for a mobile client. |
| `ml/` | The original NPS knowledge base and prompts. |
| `docker-compose.yml` | The API with PostgreSQL and Redis. |

## Run it locally

You need Python 3.10 or newer and Node.js. Everything runs free: SQLite is the default and no API key is required.

**1. Backend** (first terminal)

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Generate two secrets and put them in `.env` as `JWT_SECRET` and `DATA_ENCRYPTION_KEY`:

```sh
python -c 'import secrets; print(secrets.token_hex(32))'
python -c 'import secrets,base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())'
```

Then start the API:

```sh
uvicorn app.main:app --reload --port 8000
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs.

**2. Frontend** (second terminal)

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` to the backend.

**3. Load quests and badges** (once, from `backend/` with the virtual environment active)

```sh
python -m scripts.seed_quests
python -m scripts.seed_badges
```

| Command | Where | What it does |
|---|---|---|
| `npm run build` | `frontend/` | Production build into `dist/` |
| `npm run preview` | `frontend/` | Serve the production build |
| `npm run lint` | `frontend/` | Type-check and lint |
| `npm test` | `frontend/` | Frontend unit tests |
| `docker compose up` | repo root | API with PostgreSQL and Redis (needs `JWT_SECRET` and `DATA_ENCRYPTION_KEY` set) |

## Configuration

Settings live in `backend/.env`. Copy `backend/.env.example` to start. Never commit `.env`; it is git-ignored.

| Setting | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes | Signs login sessions. At least 32 characters. |
| `DATA_ENCRYPTION_KEY` | Yes | Encrypts stored financial data. |
| `DATABASE_URL` | No | Defaults to a local SQLite file. |
| `REDIS_URL` | No | Leaderboard cache. The app runs without it. |
| `PRUNE_API_KEY` | No | Routes AI chat through Prune. |
| `PRUNE_MODEL` | No | Model requested through Prune. Default `gemini-2.5-flash`. |
| `PRUNE_CACHE` | No | Cache mode. Default `exact`. |
| `PRUNE_STRICT` | No | When `true` (default), every AI request goes through Prune and falls back to the built-in engine if Prune refuses or is down. |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OLLAMA_URL`, `OPENAI_API_KEY` | No | Direct AI providers, used only when Prune is not configured or strict mode is off. |

## API overview

All routes are under `/api`. The full interactive list is at `/docs` while the backend runs.

| Prefix | Area |
|---|---|
| `/api/auth` | Sign-up, login, logout |
| `/api/user` | Profile, settings, export, delete |
| `/api/quests` | Daily quests and lessons |
| `/api/gamification` | XP, levels, badges, leaderboard |
| `/api/tracker` | Financial tracker |
| `/api/simulator` | Pension projection and comparison |
| `/api/ai` | Coach |
| `/api/contributions` | Contribution log |
| `/api/notifications` | Reminders |
| `/api/lab` | Market Lab progress |

## Tests

```sh
cd backend && python -m pytest -q
cd frontend && npm test
```

The backend tests cover sign-up and login, encryption of stored data, isolation between users, the calculators, Market Lab progress, and the coach, including a check that the user's figures never reach the AI model. GitHub Actions runs them on every push. The frontend tests cover the Market Lab engine.

## Known limits

- **Translations.** Newer screens have Hindi text that was machine-drafted and needs a human review. A few new landing labels are English only.
- **Financial facts.** NPS, EPF, PPF and tax details in lessons should be checked against official sources before real-world use.
- **3D art.** The city buildings and the Future You character are built in code from simple shapes, not sculpted models.
- **Projections.** Pension and corpus figures use fixed assumptions and are illustrative.

## Team

Team CodeCrunchers

- Jiya Agrawal ([@jiyaaggarwal267-maker](https://github.com/jiyaaggarwal267-maker))
- Rohan Garg ([@RohanGarg1818](https://github.com/RohanGarg1818))
- [@vaibhav025](https://github.com/vaibhav025)

## Financial disclaimer

SixtyFy is an educational and retirement-planning platform and is not a SEBI-registered Investment Adviser. The information, insights, projections and suggestions provided by our AI assistant are for informational and educational purposes only and should not be considered financial, investment, tax or legal advice.

AI-generated insights are based on historical data, user-provided information, assumptions and predictive models. Actual market conditions and financial outcomes may differ, and no projection or estimate is guaranteed.

Users are encouraged to conduct their own independent research and consult a qualified, registered financial professional before making any financial or investment decisions. SixtyFy shall not be responsible for decisions made solely on the basis of AI-generated information.

For official information about the pension system, see the [NPS Trust](https://www.npstrust.org.in).
