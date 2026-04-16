# Elite Expo Migration Baseline

## Scope Freeze (v1 production cut)

- **Target architecture:** Elite Expo app with Expo Router, RN New Architecture-compatible module boundaries, feature-flagged migration slices.
- **Deprecated as primary architecture:** Android-native-only assumptions in PRD (Room, RecyclerView, ConstraintLayout, intents as foundational architecture).
- **Non-negotiables:**
  - Skia/Reanimated-first UI trajectory
  - SQLite/Drizzle domain truth trajectory
  - FlashList ledger trajectory
  - Local-first encrypted sync trajectory
- **Out of scope for first cut:** fully enabled on-device LLM inference by default; native model runtime remains staged and gated.

## Migration Principles

1. Preserve visible user behavior during structural refactors.
2. Move behind feature flags and avoid big-bang rewrites.
3. Keep rollback paths for each migration slice.
4. Maintain local-first operation at every stage.

## Current-State to Target Mapping

- `app/index.tsx` -> route shell only, delegated to feature screen.
- `app/settings.tsx` -> route shell only, delegated to feature screen.
- `store/useTransactionStore.ts` -> compatibility store pending repository-driven DB truth.
- `store/useSettingsStore.ts` -> UI settings and migration flag orchestration.
- `providers/AppThemeProvider.tsx` -> compatibility theme provider pending elite tokenized theme engine.

## Domain Boundaries

- `src/features/home`: onboarding + dashboard composition + FAB flows (legacy behavior preserved)
- `src/features/settings`: settings and category management behavior
- `src/features/nlp`: AI panel and analysis service boundary
- `src/core/db`: schema, repository contracts, bootstrap mode selection
- `src/core/sync`: sync bootstrap mode selection
- `src/core/crypto`: encryption boundary contracts
- `src/core/theme`: semantic design token contract

## Rollout Slices

1. Structural extraction (completed in this step).
2. Feature flags + compatibility mode.
3. DB repository implementation + migration.
4. UI primitive migration (Skia/Reanimated).
5. Ledger migration to FlashList.
6. Sync + encryption + passkey enrollment.
7. On-device AI bridge hardening.
