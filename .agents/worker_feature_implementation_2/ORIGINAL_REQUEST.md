## 2026-06-13T07:40:05Z
You are the Worker agent for the GemWallet project. Your working directory is `/data/data/com.termux/files/home/gemwallet/.agents/worker_feature_implementation_2/`.
Your mission is to implement all remaining features for GemWallet based on the explorer's gap analysis:

1. Transaction Management:
   - Implement "Swipe-to-Delete" on ledger items in `src/features/home/screens/HomeScreen.tsx` using `react-native-gesture-handler`. Bind the gesture to trigger `undoTransaction(tx.id)` and a warning/error haptic feedback.
   - Refine `TransactionDetailModal.tsx` to support full transaction editing: edit categoryId (via horizontal category selection chips) and type (via a segmented toggle switch between income/expense). Ensure `updateTransaction` is called with these updated fields.

2. Budgets & Spending Limits:
   - Extend the `Category` type in `types/finance.ts` to support an optional monthly budget limit: `maxBudgetLimitCents?: number;`.
   - Update `store/useTransactionStore.ts` with actions to manage category budgets: `setCategoryBudget: (categoryId: string, limitCents: number | undefined) => void;`. Also update default categories if necessary or let them initialize with no budget.
   - Implement category budget settings in `src/features/settings/screens/CategoriesScreen.tsx`: tapping a category opens a modal with a text input to set or clear its monthly budget limit.
   - Implement a progress ring component `src/components/UI/ProgressRing.tsx` using `react-native-svg`.
   - Render the `<ProgressRing>` surrounding the emoji/icon container (`txIconContainer` or category chips) in `HomeScreen.tsx` and detail screens if a budget is set.
   - When spending in a category hits 80%+ of its monthly budget:
     - Shift item colors to `errorContainer` and text to `onErrorContainer` (using theme colors).
     - Trigger a haptic warning when logging or updating a transaction that pushes the category past 80%+ (and a heavy haptic if past 100%).

3. Analytics Screen Charts:
   - Update `src/features/analytics/screens/AnalyticsScreen.tsx` to replace mock bar visuals with dynamic charts using `react-native-gifted-charts`.
   - Render a Monthly bar chart (spending by month), donut chart (breakdown by category), and Income vs. Expense line chart using real transaction data from `useTransactionStore`.

4. Recurring Transactions UI & Catchup:
   - Add a modal form (e.g. `RecurringEventModal`) in `src/features/planning/screens/PlanningScreen.tsx` triggered by a "NEW" button.
   - The form should allow adding new recurring events (name, amount, type, categoryId, interval, startDate) and calling `addEvent` in `useRecurringStore.ts`.
   - In `store/useRecurringStore.ts`, fix the `applyDueEvents` catchup loop using a `while` loop (while `nextRun <= now`) to process all missed occurrences immediately.

5. Biometric Lock Re-locking & Passcode Fallback:
   - In `providers/BiometricGate.tsx` (or other security screens), implement:
     - Re-locking: Listen to `AppState` status changes and lock the screen (set authentication state to false) when the app transitions to the `active` state (foreground resume).
     - Passcode fallback: If biometric authentication fails, is cancelled, or is unavailable, display a fallback interface rendering the passcode keypad (the `<PasscodeKeypad>` component) so users can input their settings-configured `passcodePin` to unlock the app.

6. Verification:
   - Run typechecks and unit/contract tests to ensure the codebase compile cleanly and the test suite passes 100% with no unhandled asynchronous rejections.
   - The test command to run: `npm test` or `node --experimental-test-module-mocks --import tsx/esm --test tests/*.test.ts` and `node --import tsx/esm --test tests/__tests__/**/*.test.ts`.

MANDATORY INTEGRITY WARNING — include this verbatim:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Write your changes and results into `handoff.md` and `changes.md` in your working directory. Send a message to the orchestrator (id: `539fedef-1d21-4a9e-a475-10c9df9ebebb`) when complete.
