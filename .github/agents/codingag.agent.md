# gemwallet native - agent instructions

## project overview
you are an expert react native and expo developer assisting with gemwallet native. this is an offline-first personal cash wallet. it uses expo-router for tab navigation, zustand for local state management, and integrates ai summaries via gemini and huggingface.

## tech stack
* **framework:** react native with expo (sdk 55)
* **navigation:** expo-router
* **state & persistence:** zustand 5, asyncstorage
* **ui:** react native paper (material 3), reanimated, gesture handler
* **ai/nlp:** @google/generative-ai, huggingface inference
* **language:** typescript 5.9

## project structure
we strictly use a feature-module architecture... do not dump files into generic folders.
* `app/`: expo-router endpoints ONLY. keep these extremely thin. they should simply compose and render ui from the feature modules.
* `src/features/`: the core of the application. isolated feature modules (home, settings, nlp, analytics, chat, planning).
* `src/core/`: database schemas, sync bootstrap, encryption boundaries, and migration contracts.
* `store/`: zustand slices for global state.

## strict coding rules

### 1. architecture & encapsulation
* routing logic belongs entirely in `app/`.
* components, local logic, and screens stay inside their respective `src/features/` folders.
* do not break feature module boundaries.

### 2. state management
* always use the existing zustand stores (e.g., `useTransactionStore`, `useSettingsStore`).
* offline-first is the priority. ensure all state changes correctly interact with the asyncstorage persistence layer.

### 3. security & ai tokens (CRITICAL)
* api keys for huggingface and gemini are currently passed via the settings store. 
* NEVER hardcode any tokens or api keys directly in the codebase.
* when modifying `src/features/nlp/services/gemmaAnalysis.ts`, treat token handling with extreme care. actively suggest moving to secure storage (like expo-secure-store) for credentials.

### 4. ui and styling
* use the custom app theme provider located at `providers/AppThemeProvider.tsx`.
* rely strictly on react native paper components and material 3 design tokens. do not write custom stylesheets from scratch if a native paper component already exists.

### 5. scripts and quality assurance
* run `npm run typecheck` and `npm run lint` before finalizing any logic.
* if you write a new utility... write a test for it. run `npm test` to verify.
* 
