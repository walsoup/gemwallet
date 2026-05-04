# GemWallet

GemWallet is an offline-first personal cash wallet. It’s built for tracking day-to-day spending with a quick “cash in / cash out” flow, without needing an account or an internet connection.

## What it does

- Track your current cash balance
- Log expenses in a couple taps
- Add cash deposits and categorize where it came from
- Browse and search your transaction history

Everything is stored locally on your device.

## Key features

- **Fast expense logging**: enter an amount, pick a category, done
- **Daily ledger**: transactions are grouped by day so you can scan quickly
- **Search + category filters**: find past entries without scrolling forever
- **Undo after logging**: quick “oops” recovery via snackbar
- **Customizable look & feel**: theme options including OLED true black + high contrast
- **Privacy-first**: offline local persistence (no accounts, no cloud)

## How to use

1. **Onboarding**: set your starting cash balance.
2. **Log an expense**: use the main action button, enter the amount, then choose a category.
3. **Add cash**: record deposits (optionally tagging the source).
4. **Review history**: use search and category chips to filter your ledger.
5. **Adjust settings**: theme, categories, and export/preview options live in Settings.

## Getting started (development)

```bash
npm install
npm run start
```

## Lint / build

```bash
npm run lint
npm run build
```

## Tech notes (for contributors)

- Built with Expo + React Native using Expo Router.
- UI uses React Native Paper (Material 3).
- State + persistence is handled with Zustand + AsyncStorage.

### Architecture / migration notes

- Expo Router route files in `app` are composition-only wrappers.
- Feature logic lives under `src/features`.
- Core migration contracts are staged in `src/core` (theme, DB, sync, crypto, flags).
- Detailed rollout notes: `docs/architecture/elite-expo-migration.md`.
