# Handoff Report — Feature Gaps Analysis

This handoff report summarizes the read-only investigation of feature gaps in GemWallet.

## 1. Observation

Direct observations made in the codebase:
* **Swipe-to-Delete**: In `src/features/home/screens/HomeScreen.tsx`, the transaction list items (lines 321–382) are built using standard `Pressable` components with no swipe-to-delete wrap. However, `GestureHandlerRootView` is configured at the root in `app/_layout.tsx` (line 107).
* **Edit Transactions**: In `src/features/home/components/TransactionDetailModal.tsx` (lines 84–121), the editing view only renders inputs for `editAmount` (line 87) and `editNote` (line 100), and lacks category select, type toggling, and date selection inputs.
* **Budgets**: `types/finance.ts` defines `Category` type (lines 65–72) without any budget property, and `store/useTransactionStore.ts` does not contain budget management state or functions.
* **Analytics Charts**: `src/features/analytics/screens/AnalyticsScreen.tsx` (lines 183–208) implements custom pure CSS-like bar charts rather than integrating `react-native-gifted-charts`, which is declared in `package.json` (line 44).
* **Recurring Transactions**: `app/_layout.tsx` wires the periodic invocation of `applyDueEvents` (lines 59–84), but `store/useRecurringStore.ts` (lines 65–76) contains a catchup bug where missed cycles are updated only one interval per interval check instead of catching up immediately.
* **Biometric Lock**: `providers/BiometricGate.tsx` prompts biometrics on mount (lines 17–56) but does not listen to `AppState` change to re-lock the screen on app resume, nor does it provide a fallback passcode keypad (using `src/features/security/components/PasscodeKeypad.tsx`) if biometrics fail or are cancelled.
* **APK Generation**: `eas.json` (lines 7–12) defines an `apk` profile setting `buildType` to `apk`. Furthermore, `android/gradlew` exists for direct compilation.
* **Pre-existing test suite failure**: Running the test suite via `npm test` throws the following module resolution error under Node's native test runner (via `tsx/esm`):
  ```
  ✖ adds an expense and correctly calculates balance (759.749769ms)
    Error: Cannot find module '../utils/generateId.js'
    Require stack:
    - /data/data/com.termux/files/home/gemwallet/store/useTransactionStore.ts
  ```

## 2. Logic Chain

1. **Transaction Swipe-to-Delete**: Since `GestureHandlerRootView` is already present at the root, wrapping each ledger item in `Swipeable` from `react-native-gesture-handler` is the path of least resistance to implement swipe gestures without changing the layout hierarchy.
2. **Transaction Editing**: Because `updateTransaction` in `useTransactionStore.ts` already supports updating `categoryId` and `type` (lines 129–143), the editing form gaps can be fully addressed by exposing new form controls (category selector, segmented button type toggle, and datetimepicker) and passing their values to `updateTransaction`.
3. **Category Budgets**: To implement budgets, we must first persist monthly limits (e.g. extending `Category` type with `budgetLimitCents`), compute current calendar month spend by filtering transactions against `startOfMonth`, calculate progress percentage, and render it using standard layout elements or progress rings (`react-native-svg` is available in `package.json` line 53).
4. **Analytics Screen**: Since `react-native-gifted-charts` is already a project dependency, we can substitute the custom React Native flexbox layout in `AnalyticsScreen.tsx` with `<BarChart data={...} />` to enable fully native and customizable analytics.
5. **Recurring Catchup**: The store's `applyDueEvents` implementation advances `nextRun` by exactly one interval per tick. If `nextRun` is multiple intervals behind (e.g. app closed for weeks), this leads to a flood of single updates across subsequent ticks. A `while` loop within `applyDueEvents` is required to catch up all missed occurrences immediately.
6. **Biometric Gate**: A biometric gate that only prompts on mounting doesn't secure the app if backgrounded and resumed. Listening to `AppState` transitions to `active` will enforce a re-lock. Additionally, integrating the existing passcode store settings/keypad provides a secure fallback if biometrics are cancelled.
7. **APK Generation**: The presence of both an `apk` profile in `eas.json` and a local Gradle project wrapper (`android/gradlew`) means we can compile the binary either using local Gradle task `./gradlew assembleRelease` or via EAS CLI local compiling `eas build --platform android --profile apk --local`.

## 3. Caveats

* Did not compile the Android app to verify native gradle configurations or run EAS build, assuming standard Expo Prebuild compilation environments.
* Assumed standard `react-native-gifted-charts` API parameters are supported by package version `^1.4.17`.
* The unit test suite is currently failing due to a pre-existing TypeScript import resolution issue in Node's test runner ESM wrapper environment (searching for `.js` extensions of internal utility scripts like `generateId`).

## 4. Conclusion

The codebase is fully equipped with required dependencies (`react-native-gesture-handler`, `react-native-gifted-charts`, `expo-local-authentication`, `@react-native-community/datetimepicker`) and state hooks. However, critical gaps exist:
1. Swipe-to-delete and comprehensive transaction editing controls are missing in the home feature.
2. The Category type and store lack budget limit properties, preventing limit tracking.
3. The custom bar chart in the Analytics feature needs migration to Gifted Charts.
4. The recurring transaction scheduler lacks catchup loop logic, causing delayed/repeated logging after app inactivity.
5. The BiometricGate requires AppState active triggers and passcode keypad fallback.
6. local APK files can be compiled using EAS CLI (`eas build --platform android --profile apk --local`) or Gradle (`./gradlew assembleRelease`).

## 5. Verification Method

* Run `npm test` to check the unit test status (fails with pre-existing ESM path module-resolution error on `generateId.js`).
* Inspect `analysis.md` and `handoff.md` paths to verify structure, line references, and proposed code integration patterns.
