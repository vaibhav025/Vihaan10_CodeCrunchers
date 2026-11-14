# PensionQuest web

React + TypeScript + Vite, Tailwind, Framer Motion, and a Three.js (React Three Fiber) diorama.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :8000
npm run lint     # type-check + eslint
npm run build
```

- `src/design-tokens/` palette, state colours, motion constants
- `src/components/world/` the 3D scene (`Scene.tsx`), its wrapper and the still fallback
- `src/components/ui/` HUD kit, boot screen, level-up reveal
- `src/pages/` Landing, Onboarding, Home, Quest, Simulator, Coach, Profile
- `src/lib/` API client, session, translations (English, Hindi, Marathi), pension maths
- `docs/DESIGN_SYSTEM.md` design notes, `docs/screens/` screenshots

Sign-in uses the backend's development mode: each browser registers as a new device.
Streak length and quest history are kept per browser, because the backend has no endpoints
for them.
