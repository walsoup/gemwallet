# Feature Gaps & Implementation Analysis

This report details the implementation gaps, design patterns, and concrete suggestions for the requested features in GemWallet.

---

## 1. Transaction Management

### Swipe-to-Delete on HomeScreen Ledger Items

* **Current Implementation (`src/features/home/screens/HomeScreen.tsx`):**
  * The transaction list maps `filteredTransactions` (lines 321–382).
  * Each item is wrapped in a standard `Pressable` that triggers opening of `TransactionDetailModal` on tap (line 334).
  * The project already wraps the app root in a `GestureHandlerRootView` in `app/_layout.tsx` (line 107), meaning `react-native-gesture-handler` is active.
* **Implementation Gap:**
  * No swipe interaction or deletion shortcut exists in the ledger UI.
* **Proposed Implementation Pattern:**
  * Wrap the `Pressable` representing the ledger item in `Swipeable` from `react-native-gesture-handler`.
  * Create a custom `renderRightActions` function that renders a red container containing a trash/delete icon (styled to match the row's height and border-radius).
  * Wire the delete action to call `undoTransaction(id)` from `useTransactionStore`.
  * Apply haptic feedback using `expo-haptics` (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)`) on trigger.
* **Code/Diff Sketch:**
  ```tsx
  import { Swipeable } from 'react-native-gesture-handler';
  
  // Right action swipe view
  const renderRightActions = (id: string, theme: AppTheme, onDelete: () => void) => {
    return (
      <Pressable 
        style={{
          backgroundColor: theme.colors.error,
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          height: '100%',
          borderTopRightRadius: 20, // matching list container border radius if last, or simple rounded edges
          borderBottomRightRadius: 20,
        }} 
        onPress={onDelete}
      >
        <MaterialCommunityIcons name="delete" size={24} color="#FFF" />
      </Pressable>
    );
  };
  
  // Inside HomeScreen transaction list render loop:
  <Swipeable
    key={tx.id}
    renderRightActions={() => renderRightActions(tx.id, theme, () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      undoTransaction(tx.id);
    })}
    friction={2}
    rightThreshold={40}
  >
    <Pressable style={styles.txItem} ...>
       ...
    </Pressable>
  </Swipeable>
  ```

### Edit Transactions Flow and UI

* **Current Implementation (`src/features/home/components/TransactionDetailModal.tsx`):**
  * Currently supports toggling an `isEditing` mode (lines 84–121) where users can modify the **amount** (line 87) and **note** (line 100).
  * Submits changes to the store via `updateTransaction(...)` (lines 45–49).
* **Implementation Gaps:**
  * **Category Editing:** Users cannot change the category of an existing transaction.
  * **Type Toggling:** Users cannot toggle a transaction between Income and Expense after creation.
  * **Date/Time Editing:** Date is display-only. There is no calendar/picker integration.
  * **UI Validation:** If amount input is invalid (empty or non-numeric), there is no visual warning or feedback.
* **Proposed Implementation Pattern:**
  * **Category Selector:** Fetch all categories via `categories` from `useTransactionStore`. Add a horizontal scrollable list or a dropdown select in the edit view.
  * **Date Picker:** Integrate `@react-native-community/datetimepicker` (already in `package.json` dependencies) into the edit form, allowing timestamp updates.
  * **Type Switcher:** Add a segmented toggle (`react-native-paper`'s `SegmentedButtons` or custom styled buttons) to toggle the transaction type between `income` and `expense`.
  * **Validation Style:** Highlight inputs with `theme.colors.error` and show a helper text if the parsed value is invalid.

### Transaction Detail Sheet/Modal Details

* **Current Implementation (`src/features/home/components/TransactionDetailModal.tsx`):**
  * Built using a native React Native `<Modal>` with custom slides animation.
* **Implementation Gaps:**
  * It lacks drag/swipe gestures to dismiss, standard to modern bottom sheets.
  * Styling is clean but basic.
* **Proposed Implementation Pattern:**
  * **Upgrade component:** Either migrate to `react-native-paper`'s `Modal` (configured as a bottom sheet) or use `react-native-reanimated` with gesture handlers to build a custom bottom sheet with backdrop overlay.
  * **Information Additions:**
    * Visual indicator for category kind (e.g. icon container color matching category theme, or custom tints).
    * Clear divider layout separating details.
    * Added validation helper warnings when updating.

---

## 2. Budgets and Analytics

### Budgets per Category

* **Codebase Check:**
  * **Category Type (`types/finance.ts`):** `Category` contains `id`, `name`, `emoji`, `kind`, `tint`, `isLocked`. It does **not** have a `budgetLimitCents` or similar property.
  * **Store Check (`store/useTransactionStore.ts`):** No state or methods exist for setting/maintaining category budget limits.
* **Proposed Implementation Pattern:**
  1. **Extend Type Definition (`types/finance.ts`):**
     ```typescript
     export type Category = {
       id: string;
       name: string;
       emoji: string;
       kind: CategoryKind;
       tint?: string;
       isLocked?: boolean;
       budgetLimitCents?: number; // Optional monthly limit
     };
     ```
  2. **Extend Store (`store/useTransactionStore.ts`):**
     * Add `setCategoryBudgetLimit: (categoryId: string, limitCents: number | undefined) => void`.
     * Update state to persist the limits in AsyncStorage.
  3. **Calculate Monthly Limits & Progress:**
     * Filter active expenses of the current calendar month:
       ```typescript
       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
       const spendCents = transactions
         .filter(tx => tx.categoryId === categoryId && tx.type === 'expense' && tx.timestamp >= startOfMonth)
         .reduce((sum, tx) => sum + tx.amountCents, 0);
       ```
     * Determine percentage: `progressPercent = Math.min(100, (spendCents / budgetLimitCents) * 100)`.
  4. **Progress Ring UI:**
     * Leverage `react-native-svg` to build a Progress Circle.
     ```tsx
     import Svg, { Circle } from 'react-native-svg';
     // Render circular ring with strokeDashoffset = strokeDasharray - (strokeDasharray * progressPercent) / 100
     ```
  5. **Alerting System:**
     * Inside transaction creation (e.g., `addExpense`), calculate updated category spend.
     * If `spendCents` exceeds `budgetLimitCents * 0.9` (90% threshold), show an in-app banner or push warning.
     * Respect `notificationsBudgetWarnings` preference from `useSettingsStore`.
  6. **Container Styling:**
     * **Safe (<80%):** Standard surface container with neutral green/primary progress highlight.
     * **Warning (80%-100%):** Yellow/orange border warnings.
     * **Exceeded (>100%):** Error container colors (`theme.colors.errorContainer`), error text (`theme.colors.onErrorContainer`), red progress fills.

### Analytics Screen Chart Integration

* **Codebase Check:**
  * **Analytics Screen (`src/features/analytics/screens/AnalyticsScreen.tsx`):**
    * Currently builds its own pure-CSS bar chart using height percentages in flex containers (lines 183–208).
  * **Dependencies (`package.json`):**
    * `"react-native-gifted-charts": "^1.4.17"` and `"react-native-svg": "15.15.4"` are already installed.
* **Proposed Implementation Pattern:**
  * Replace the custom flexbox bars with `BarChart` from `react-native-gifted-charts`.
  * **Daily Velocity Bar Chart Integration:**
    * Format the past 7 days of data:
      ```typescript
      const barData = dailyVelocity.map(day => ({
        value: day.totalCents / 100, // format to standard currency float
        label: day.dayStr,
        frontColor: theme.colors.primaryContainer,
        topLabelComponent: () => (
          <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>
            {day.totalCents > 0 ? `$${(day.totalCents/100).toFixed(0)}` : ''}
          </Text>
        )
      }));
      ```
    * Render components:
      ```tsx
      import { BarChart } from 'react-native-gifted-charts';
      
      <BarChart
        data={barData}
        barWidth={20}
        spacing={14}
        roundedTop
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
        noOfSections={4}
        theme={theme.dark ? 'dark' : 'light'}
      />
      ```
  * **Pie Chart breakdown (Recommended Addition):**
    * Group current month's expenses by category.
    * Use `<PieChart>` to display the division of monthly costs.

---

## 3. Automation & Security

### Recurring Transactions

* **Codebase Check:**
  * **Store (`store/useRecurringStore.ts`):**
    * Has fully defined states: `events: RecurringCashEvent[]`, `recurringEnabled: boolean`.
    * Methods: `addEvent`, `deleteEvent`, `toggleEvent`, `applyDueEvents(now, apply)`.
  * **Scheduler Integration (`app/_layout.tsx`):**
    * Inside `TabLayout`, an effect triggers `applyDueEvents` on startup and schedules it every 60 seconds (`setInterval`) (lines 59–84).
* **Implementation Gaps:**
  * **Missed Cycles (Catchup Bug):** If the app was closed for two weeks, a weekly event `nextRun` becomes past due. In `applyDueEvents`, the logic only executes `apply(event)` once and increments the date by 1 interval. It will leave `nextRun` in the past. This causes the app to log the transaction once every 60-second interval check until it catches up, rather than logging all missed occurrences instantly.
  * **No OS Background Scheduler:** If the app is closed, no transactions are checked or logged.
  * **Lack of Notifications:** No local notifications alert the user when an event is automatically logged.
* **Proposed Implementation Pattern:**
  1. **Fix Catchup Logic in `useRecurringStore.ts`:**
     Modify `applyDueEvents` to use a `while` loop to catch up all missed occurrences instantly:
     ```typescript
     applyDueEvents: (now, apply) => {
       set((state) => {
         const events = state.events.map((event) => {
           if (!state.recurringEnabled || !event.enabled || event.nextRun > now) return event;
           
           let currentNextRun = event.nextRun;
           // Log all past-due intervals at once
           while (currentNextRun <= now) {
             apply({ ...event, nextRun: currentNextRun });
             currentNextRun = addInterval(currentNextRun, event.interval);
           }
           return { ...event, nextRun: currentNextRun };
         });
         return { events };
       });
     }
     ```
  2. **Add Background Tasks:**
     Use `expo-background-fetch` and `expo-task-manager` to register a background task that calls `applyDueEvents` periodically even when the app is killed.
  3. **Add Notifications:**
     Trigger local notifications (`expo-notifications`) inside the callback function in `app/_layout.tsx` when a transaction is auto-logged.

### Biometric Lock

* **Codebase Check:**
  * **Gate Provider (`providers/BiometricGate.tsx`):**
    * Reads `biometricAuthEnabled` from settings.
    * Prompts biometrics via `expo-local-authentication` during mounting (useEffect).
* **Implementation Gaps:**
  * **AppState Re-locking:** The biometric gate only checks authentication once on mount. If the user minimizes the app and resumes, it does not prompt again.
  * **No Passcode Fallback on Gate:** In settings, a passcode can be configured (`passcodePin` / `passcodeEnabled`). If biometric checks fail, cancel is tapped, or hardware is missing, the gate offers no manual PIN keypad option, locking the user out.
* **Proposed Implementation Pattern:**
  1. **Integrate AppState Listener:**
     Listen to app status change in `BiometricGate.tsx` and re-authenticate when the app resumes (transition to `active`).
     ```typescript
     useEffect(() => {
       const subscription = AppState.addEventListener('change', (nextAppState) => {
         if (nextAppState === 'active' && biometricAuthEnabled) {
           setIsAuthed(false); // Lock the screen again
           // Trigger authentication...
         }
       });
       return () => subscription.remove();
     }, [biometricAuthEnabled]);
     ```
  2. **Passcode Gate Integration:**
     * In the `BiometricGate` UI, if biometrics fails or is cancelled, display a "Use Passcode" button.
     * When clicked, render the existing `<PasscodeKeypad>` component.
     * Compare input with `passcodePin` from settings to unlock.

---

## 4. APK Generation

### Configuration Check

* **Dependencies (`package.json`):**
  * `"expo": "~55.0.17"` (Expo SDK 55).
  * Script `"android": "expo run:android"`.
* **EAS Configuration (`eas.json`):**
  * Features a profile named `apk` configured specifically for local/internal APK generation:
    ```json
    "apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
    ```
* **Native Configuration (`android/`):**
  * Android Gradle Wrapper (`android/gradlew` & `android/gradlew.bat`) are fully configured.
  * Native package name is `"com.walsoup.gemwallet"`.

### Command to Generate Local APK

To generate a local `.apk` binary, developers have two paths depending on their toolchain configuration:

#### Option A: EAS CLI Local Build (Recommended)
This uses the EAS profile pipeline to compile locally without uploading assets to Expo servers. It handles native dependency management.
```bash
eas build --platform android --profile apk --local
```
* **Requirements:** EAS CLI installed (`npm install -g eas-cli`), local Android SDK, Java SDK 17+.

#### Option B: Direct Gradle Build (Fastest Local Compiler)
Since there is a fully generated `android/` directory:
```bash
cd android && ./gradlew assembleRelease
```
* **Output Path:** `/android/app/build/outputs/apk/release/app-release.apk`
* **Requirements:** Local Java 17+, `ANDROID_HOME` pointing to Android SDK path.
