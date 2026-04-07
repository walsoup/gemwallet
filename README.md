# GemWallet – Expressive Finance PWA

A mobile-first personal finance Progressive Web App built with Next.js App Router, React, Tailwind CSS, Framer Motion, Zustand, and localforage.

## Features

- Material-inspired expressive motion system with spring interactions.
- Dashboard with adaptive waveform budget indicator.
- Fullscreen quick-add expense modal launched by floating action button.
- Subscription Graveyard tab with dynamic severity color coding.
- Seeded local transactions for realistic visual testing.
- Offline-first persistence via Zustand + localforage.
- PWA support with `manifest.json` + service worker caching.
- AI advisor endpoint at `/api/gemma-advisor` using `@google/generative-ai` and Gemma 4 JSON output.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local`:

```bash
GOOGLE_AI_API_KEY=your_google_ai_studio_api_key
```

## Build & Lint

```bash
npm run lint
npm run build
```

## Deployment

GitHub Actions workflow: `.github/workflows/deploy.yml`.

Required repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
