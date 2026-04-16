# GemWallet Native (Expo)

Offline-first personal cash wallet built with Expo + React Native.

## What’s implemented

- PRD-style onboarding (set opening cash + optional voice toggle)
- Single-screen dashboard with:
  - Greeting app bar + settings access
  - Hero available-cash card with zero/overdraft states
  - Search + category chip filtering
  - Sectioned transaction ledger grouped by day
- Rebuilt FAB interactions:
  - Tap: 2-phase manual expense flow (amount -> category instant-save)
  - Long press: quick actions (add cash, settings, voice placeholder)
- Add-cash flow with source chips and custom keypad
- Undo snackbar after logging entries
- Local-only persistence via Zustand + AsyncStorage
- Settings for theme, OLED true black, high contrast, secure-access toggle, category management, and CSV preview export

## Stack

- Expo Router
- React Native Paper (Material 3)
- Zustand + AsyncStorage (offline local persistence)

## Setup

```bash
npm install
npm run start
```

## Build/Lint

```bash
npm run lint
npm run build
```

## Architecture (Migration Baseline)

- Expo Router route files in `app` are now composition-only wrappers.
- Feature logic is being moved into `src/features`.
- Core migration contracts are staged in `src/core` for theme, DB, sync, crypto, and feature flags.
- Current store/theming implementations remain as compatibility layers while SQLite/Drizzle, FlashList, and elite UI primitives are rolled out behind flags.
- Detailed mapping and rollout slices are documented in `docs/architecture/elite-expo-migration.md`.
