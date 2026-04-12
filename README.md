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
