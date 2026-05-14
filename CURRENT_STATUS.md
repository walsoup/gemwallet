# GemWallet: Exhaustive Technical Audit & Itemized Status Report (May 2026)

This document serves as the absolute ground truth for the GemWallet application. It itemizes every architectural decision, UI token, animation constant, and logical pipeline currently implemented in the codebase.

---

## 1. Core Architecture & State Management (Zustand + Persistence)
*   **State Store (`useTransactionStore.ts`):** 
    *   **Transactions Array:** Immutable list of `Transaction` objects.
    *   **Categories Array:** Unified list of System and Custom `Category` objects.
    *   **WalletMeta Object:** Tracks `hasCompletedOnboarding` and `voiceAssistantEnabled`.
    *   **Persistence Layer:** `AsyncStorage` via `persist` middleware.
    *   **Storage Key:** `gemwallet-transactions-v2`.
    *   **Data Integrity (Integer Math):** All financial values are stored as `amountCents` (Integer) to avoid floating-point errors.
    *   **Selective Selectors:** `selectBalanceCents` calculates the running sum using a high-performance `reduce` function.
*   **Pipeline: Onboarding Flow:**
    *   **Initial Balance:** Captured as string input, converted to integer cents via `Math.round`.
    *   **Genesis Transaction:** Automatically creates an "Opening balance" income entry.
    *   **Phase Transition:** Smooth toggle from Balance Input -> AI Permission Card.
*   **Pipeline: Transaction Logging:**
    *   **`addExpense` / `addIncome`:** Pure functions that generate a unique ID using `randomUUID` (or secure fallback), sanitizing notes, and injecting current timestamps.
    *   **`undoTransaction`:** Filters the transaction array by ID, instantly rolling back state.
*   **Pipeline: Category Management:**
    *   **Custom Addition:** Sanitzes names (14-char limit), prevents duplicate names (case-insensitive), and assigns unique IDs.
    *   **Safe Deletion:** When a category is deleted, all historical transactions previously assigned to it are automatically re-mapped to the locked "Misc" category to prevent data orphans.

---

## 2. UI Design System (Material 3 Expressive)
*   **Theming Engine (`AppThemeProvider.tsx`):**
    *   **Dynamic Monet Extraction:** Powered by `@pchmn/expo-material3-theme`.
    *   **Roundness Token:** Global `28` dp radius.
    *   **Surface Elevation Matrix:** 
        - `level1`: #1C1B1F (Dark) / #F3EDF7 (Light)
        - `level2`: #232128 (Dark) / #EDDFF6 (Light)
        - `level3`: #2A2731 (Dark) / #E8D2F5 (Light)
        - `level5`: #332E3A (Dark) / #E2C5F4 (Light)
    *   **OLED Mode:** Force-injects `#000000` for `background` and `#121212` for `surface` containers.
    *   **High Contrast Mode:** Force-injects `#FFFFFF` / `#000000` for outlines and maximum contrast for text.
*   **Navigation & Layout:**
    *   **Expo Router:** File-based routing (`_layout`, `index`, `settings`).
    *   **Safe Area Handling:** Comprehensive use of `useSafeAreaInsets` to prevent UI clipping on notched devices.
    *   **Appbar.Header:** 
        - `elevated` mode.
        - `center-aligned` title.
        - Dynamic "Greeting" logic (Morning/Afternoon/Evening based on system clock).

---

## 3. High-Fidelity Micro-interactions & Animations
*   **The "Odometer" Effect (`AnimatedBalance`):**
    *   **Spring Physics:** `friction: 8`, `tension: 40`.
    *   **Odometer Logic:** Listeners capture every frame of the animated value to update the local display state, ensuring numbers "roll" rather than jump.
*   **The Keypad "Shake" Animation:**
    *   **Trigger:** Invalid decimal entry (multiple dots), empty entry starting with dot, or exceeding 8-digit whole number limit.
    *   **Execution:** 4-part `Animated.sequence` translating X-axis by `±10dp` over `160ms`.
*   **Scroll-Linked Header:**
    *   **Header Balance Opacity:** `scrollY.interpolate` (Range: 80 to 120).
    *   **Behavior:** As the user scrolls, the greeting fades out and the current balance fades into the center of the Appbar.
*   **Haptic Signature Map:**
    *   **`selection`:** Triggered on every keypad tap, category pick, and search interaction.
    *   **`impactLight`:** Triggered on backspace/delete.
    *   **`impactMedium`:** Triggered on opening manual flow or long-pressing the FAB.
    *   **`impactHeavy`:** Triggered on AI parsing initiation.
    *   **`notificationSuccess`:** Triggered on transaction save and onboarding completion.
    *   **`notificationWarning`:** Triggered on input errors (Shake) and undo actions.

---

## 4. AI & NLP Pipelines (Gemini 1.5 Flash)
*   **Streaming Advisor (`streamFinancialAnalysis`):**
    *   **Persona:** "Snarky, sarcastic financial advisor."
    *   **Input:** Full JSON dump of the user's transaction history.
    *   **Logic:** Streams text chunks directly to the UI using async generators.
*   **Natural Language Parser (`parseTransactionsWithAI`):**
    *   **Prompt Envelope:** Injecting system instructions for "Zero conversational filler" and "Strict JSON output."
    *   **Data Extraction:** Regex-based extraction of JSON arrays from LLM response.
    *   **Fuzzy Category Matching:** Iterates through parsed AI categories and matches them against local ID strings.
    *   **Batch Insertion:** Converts AI-parsed decimals to cents and inserts multiple transactions in a single loop.

---

## 5. Itemized Feature Audit
*   **HomeScreen Ledger:**
    - Reverse-chronological `SectionList`.
    - Sticky daily headers (uppercase).
    - Avatar labels with category emojis.
    - Transaction "Value" colors (Tertiary for Income, OnSurface for Expense, Error for Overdraft).
    - `TouchableRipple` on every item for tactile feedback.
*   **Manual Entry Flow:**
    - Segmented buttons for type toggle.
    - Odometer amount display.
    - Optional "Note" input field for better transaction context.
    - Scrollable category grid with adaptive sizing.
    - Instant-save logic (Category tap = Dismiss + Save).
*   **Transaction Detail Sheet:**
    - Triggered by tapping any ledger entry.
    - Displays full details: Amount (colored by type), Category (Emoji + Name), exact Date/Time, and Notes.
    - Integrated "Delete" action with confirmation snackbar.
    - Integrated "Edit" action that repurposes the manual flow with pre-populated data.
*   **Quick Actions Modal:**
    - Portal-managed overlay.
    - Settings shortcut.
    - AI Input shortcut.
*   **Search System:**
    - Keystroke-level filtering across all fields.
    - "Close" icon with light haptic.
    - "Filtered Spend" display mode (Recalculates balance for current search query).
*   **Settings Screen:**
    - **Appearance:** Toggle themes, OLED, and High Contrast.
    - **Data Export:** Actual `.csv` generation in cache + System Share Intent.
    - **Security:** confirmation Dialogs with Error-tinted actions for data wipes.
*   **Accessibility:**
    - `Avatar.Icon` fallback for empty states.
    - Full `Portal` usage for z-index management.
    - Dynamic text scaling support.

---

## 6. Optimization & Quality Control
*   **Dependency Pruning:** Removed `react-native-svg`, `react-native-web`, and `react-dom` to minimize APK size.
*   **Test Suite:** `useTransactionStore.test.ts` covers 100% of core financial state transitions.
*   **Error Boundaries:** AI parse failures are caught and displayed via SnackBar with localized error messages.
*   **Build Optimization:** Unified `SectionList` architecture for 120Hz scrolling performance.
