# Project: GemWallet High-Priority Features and APK Build

## Architecture
- React Native + Expo Router.
- Zustand for stores (`store/`).
- Material 3 Expressive theme.
- Node test runner for testing.
- EAS Build / Android local gradle for APK generation.

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| 1 | Feature Gap Mapping | Codebase analysis to map exact gaps for the requested features | None | IN_PROGRESS | 53824264-6a3e-410b-b44c-5d9d946a1f52 |
| 2 | Transaction UI | Implement Swipe-to-Delete, Detail Sheet, and Edit Transaction flows | Feature Gap Mapping | PLANNED | |
| 3 | Budgets & Analytics | Implement category budgets, alert haptics, progress rings, and Analytics screen charts | Feature Gap Mapping | PLANNED | |
| 4 | Automation & Security | Implement Recurring Transactions and Biometric Lock | Feature Gap Mapping | PLANNED | |
| 5 | APK Generation | Generate local installable Android APK | Transaction UI, Budgets & Analytics, Automation & Security | PLANNED | |

## Interface Contracts
TBD based on Phase 1 exploration.

## Code Layout
- `store/` - Zustand stores
- `app/` - Route screens
- `src/` - Feature layouts and components
- `tests/` - Test files
