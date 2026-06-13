# Codebase Analysis & Gap Mapping Report

This analysis outlines the critical UI issues, unimplemented/unlinked services, and test suite failures within the GemWallet React Native codebase.

---

## 1. UI Elements and Layout Issues

### Issue A: CustomTopNav Absolute Positioning & Double Padding
* **Location:** 
  * `src/components/Navigation/CustomTopNav.tsx` (styling at `positionContainer`)
  * `src/components/Layout/ScreenLayout.tsx` (layout at line 20-30)
* **Description:** 
  `CustomTopNav` does not have absolute positioning. Its container is defined as:
  ```typescript
  positionContainer: {
    zIndex: 40,
    backgroundColor: 'transparent',
  }
  ```
  Since it lacks `position: 'absolute', top: 0, left: 0, right: 0`, the top navigation bar is rendered in-flow, taking up vertical space. At the same time, `ScreenLayout.tsx` adds extra padding to the content container:
  ```typescript
  paddingTop: insets.top + TOP_NAV_ESTIMATED_HEIGHT // TOP_NAV_ESTIMATED_HEIGHT is 72
  ```
  This creates a "double padding" effect where the screen content is pushed down by both the in-flow top nav and the `ScreenLayout` padding, leaving a blank gap of ~120dp at the top of the screen.
* **Direct Fix:**
  Add absolute positioning to the top nav container in `src/components/Navigation/CustomTopNav.tsx`:
  ```typescript
  positionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
  }
  ```

### Issue B: AppThemeProvider useMemo Dependency Array Bug
* **Location:** `providers/AppThemeProvider.tsx` (line 190)
* **Description:**
  The `useMemo` that generates the dynamic application theme object uses `themePrimary` and `themeSecondary` to override theme colors (accent colors). However, these variables are missing from the `useMemo` dependency array:
  ```typescript
  }, [highContrastEnabled, isDark, oledTrueBlackEnabled, m3Theme]);
  ```
  Consequently, when the user updates their Accent Color or Secondary Accent Color in Settings, the change is saved to the store but the app's visual theme does not recompute or update until the application is fully restarted.
* **Direct Fix:**
  Add `themePrimary` and `themeSecondary` to the dependency array in `providers/AppThemeProvider.tsx`:
  ```typescript
  }, [highContrastEnabled, isDark, oledTrueBlackEnabled, m3Theme, themePrimary, themeSecondary]);
  ```

### Issue C: Transaction Detail Modal Hardcoded Currency
* **Location:** `src/features/home/components/TransactionDetailModal.tsx` (line 136)
* **Description:**
  The modal displays the transaction amount using a hardcoded `$` sign:
  ```typescript
  <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 18 }}>
    ${(transaction.amountCents / 100).toFixed(2)}
  </Text>
  ```
  This breaks localization and multi-currency formatting since settings support various currencies and regions.
* **Direct Fix:**
  Import and use `formatAppCurrency` (from `utils/currency`) or `formatCurrency` in `src/features/home/components/TransactionDetailModal.tsx`.

---

## 2. Core Service Functions Unimplemented, Non-Working, or Unlinked

### Issue A: Hugging Face AI Provider Bypassed in Chat Screen
* **Location:** `src/features/chat/screens/ChatScreen.tsx` (line 203)
* **Description:**
  The chat screen logic manually switches between providers but only checks for `'local'`:
  ```typescript
  const runner = settings.aiProvider === 'local'
    ? streamLocalFinancialAnalysis
    : streamGeminiFinancialAnalysis;
  ```
  If the user chooses `huggingface` as their AI provider in the Settings screen, the chat screen defaults to `streamGeminiFinancialAnalysis`, which expects a Gemini API key. The chat screen fails to use the configured Hugging Face settings or Token.
* **Direct Fix:**
  Use the provider-aware selector function `streamFinancialAnalysis` from `src/features/nlp/services/gemmaAnalysis.ts`, which already encapsulates `huggingface` and `google` routing:
  ```typescript
  import { streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';
  // ...
  const runner = streamFinancialAnalysis;
  ```

### Issue B: Unlinked insights.tsx Screen File
* **Location:** `app/insights.tsx`
* **Description:**
  The file `app/insights.tsx` is implemented but completely unlinked. The actual bottom tab in `app/_layout.tsx` points to the `analytics` route:
  ```typescript
  <Tabs.Screen name="analytics" options={{ title: 'Insights', ... }} />
  ```
  which maps to `app/analytics.tsx` -> `src/features/analytics/screens/AnalyticsScreen.tsx`. `app/insights.tsx` implements charts using `react-native-gifted-charts`, whereas the active `AnalyticsScreen.tsx` renders custom Reanimated bar/progress charts. This represents dead/unlinked code.
* **Direct Fix:**
  Remove the duplicate `app/insights.tsx` file to clean up the codebase, or rewire the route if `react-native-gifted-charts` is preferred.

---

## 3. Test Suite Status and Failing Tests

### Test Suite Execution
* **To run unit tests:** `npm test`
* **To run static contract checks:** `node --import tsx/esm --test tests/__tests__/**/*.test.ts`
* **Execution Constraint:** Node.js requires `--experimental-test-module-mocks` flag for the unit tests utilizing `mock.module` to execute.

### Failing Tests

#### 1. Unit Tests (`tests/*.test.ts`)
* **Failing Files:**
  * `tests/useGoalsStore.test.ts`
  * `tests/useTransactionStore.test.ts`
* **Error Verbose:**
  `TypeError: import_node_test.mock.module is not a function` (when run without the mocks flag).
  `ReferenceError: window is not defined` (when run with the mocks flag).
* **Cause:**
  1. The test script in `package.json` does not include the `--experimental-test-module-mocks` flag.
  2. Because the store import is static (`import { useGoalsStore } ...`), ES module hoisting evaluates and loads the store file *before* the `mock.module('@react-native-async-storage/async-storage')` line executes. Consequently, the real AsyncStorage module is imported. Since the test runs in pure Node.js, the AsyncStorage native implementation throws `ReferenceError: window is not defined`.
* **Direct Fix:**
  1. Add `--experimental-test-module-mocks` to the `test` script in `package.json`.
  2. Replace the static store imports with dynamic imports after mocking inside the test suite:
     ```typescript
     mock.module('@react-native-async-storage/async-storage', { ... });
     // Inside describe/beforeEach:
     const { useGoalsStore } = await import('../store/useGoalsStore');
     ```

#### 2. Contract Tests (`tests/__tests__/*.test.ts`)
* **Failing File A:** `tests/__tests__/screens/screenContracts.test.ts`
  * **Error:** `Transform failed: Unexpected ")" in regular expression` (lines 13-14) during esbuild compilation.
  * **Cause:** A regular expression syntax typo: `/openQuickAction\('income'\\)/`. The double backslash escapes a literal backslash, leaving the subsequent `)` closing parenthesis unescaped.
  * **Direct Fix:** Change to `/openQuickAction\('income'\)/` and `/openQuickAction\('expense'\)/`.
* **Failing File B:** `tests/__tests__/services/gemmaCommandParsing.test.ts`
  * **Error:** `Transform failed: Expected "as" but found "{"` (lines 4-5) during esbuild compilation.
  * **Cause:** A broken nested/overlapping import statement block:
    ```typescript
    import {
    import { join } from 'path';
      parseAddExpenseCommand,
    ```
  * **Direct Fix:** Repair the imports to:
    ```typescript
    import { join } from 'path';
    import {
      parseAddExpenseCommand,
      parseAddIncomeCommand,
      parseAddRecurringCommand,
      parseAddGoalCommand,
    } from '../../../src/features/nlp/services/gemmaAnalysis';
    ```
