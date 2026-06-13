# Context — GemWallet Feature Implementation

## Codebase Overview
GemWallet is a React Native app built with Expo, Zustand, and Material 3 Expressive. It is an offline-first financial ledger with AI-powered NLP transaction parsing (Gemini 1.5 Flash).

## Core Architecture
- **State Store:** Zustand stores at `store/useTransactionStore.ts`, `store/useSettingsStore.ts`, `store/useRecurringStore.ts`, `store/useGoalsStore.ts`.
- **UI System:** React Native Paper based on Material 3.
- **Routing:** Expo Router.
- **AI Integrations:** Gemini API wrapper at `services/gemma.ts` (with optional cloud/local model support).

## Key Files & Directories
- `/app/` - Application routes (index, settings, analytics, etc.)
- `/src/features/` - Feature screens and components
- `/store/` - Zustand stores
- `/types/` - Type definitions (including `types/finance.ts`)
- `/tests/` or `/store/__tests__/` - Test suites

## Constraints & Environment
- **Platform:** Linux, Termux/Android.
- **Build/Test Runner:** node:test and typescript.
- **Test execution:** `npm test`.
