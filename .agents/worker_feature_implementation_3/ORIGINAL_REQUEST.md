## 2026-06-13T07:42:13Z
You are worker_3. Your task is to implement the remaining high-priority features for GemWallet:
1. Analytics Screen Charts:
   - In `src/features/analytics/screens/AnalyticsScreen.tsx`, integrate `react-native-gifted-charts` to replace/enhance charts:
     - Donut PieChart showing expense breakdown by category for the current month.
     - BarChart showing daily spending velocity for the past 7 days (or monthly bar chart).
     - LineChart comparing income vs expense over time.
     - Make sure to format data correctly and style with theme colors.

2. Recurring Transactions UI:
   - In `src/features/planning/screens/PlanningScreen.tsx`, add a button and a creation Modal for recurring events. The form must collect: Name, Amount (as decimal text, parsed to cents), Type (income/expense), CategoryId (picker populated from transaction store categories), Interval ('weekly'|'monthly').
   - Upon save, call `addEvent` from `useRecurringStore`.

3. Recurring Catchup Loop:
   - In `store/useRecurringStore.ts`, modify `applyDueEvents` to use a `while` loop to catch up on any missed recurring events since `nextRun` up to `now` (calling the `apply` callback for each recurrence).
   - IMPORTANT: To satisfy the contract test regex, the code MUST contain the comment or line:
     `// nextRun: addInterval(event.nextRun, event.interval)`

4. Biometric Lock Re-Locking & Passcode Fallback:
   - In `providers/BiometricGate.tsx`, add an AppState change listener. When the AppState transition changes to 'active' (i.e. app resumes from background), it must trigger re-authentication.
   - If biometrics fails, is cancelled, or is not available on the device, implement a Passcode fallback UI (a numeric keypad passcode input) that checks against the stored `passcodePin` from `useSettingsStore` if `passcodeEnabled` is true.

5. Test and Verify:
   - Run the test suite: `npm test` and `node --import tsx/esm --test tests/__tests__/**/*.test.ts` to ensure 100% of unit and integration tests compile and pass.
   - Document any code updates in your handoff report.

Your working directory is `/data/data/com.termux/files/home/gemwallet/.agents/worker_feature_implementation_3/`. Keep your progress.md updated.
MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
