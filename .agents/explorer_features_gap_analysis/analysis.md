# Gap Analysis: Remaining GemWallet Features

This document provides a detailed codebase analysis and implementation blueprint for the remaining features of the GemWallet application: Transaction Management, Budgets & Analytics, Automation & Security, and APK Generation.

---

## 1. Transaction Management

### Swipe-to-Delete on Ledger Items in `HomeScreen.tsx`
* **File Location**: `src/features/home/screens/HomeScreen.tsx` (Lines 321–382)
* **Current Structure**: The list of recent transactions maps over `filteredTransactions.slice(0, 10)` inside a `<View>` container. Each transaction is rendered using a `<Pressable>` element (Lines 334–375) that opens the detail modal on tap.
* **Proposed Implementation**:
  1. **Imports**: Import `Swipeable` from `react-native-gesture-handler` (or the newer `ReanimatedSwipeable` from `react-native-gesture-handler/ReanimatedSwipeable`).
  2. **Swipe Container**: Wrap the transaction `<Pressable>` item in a `<Swipeable>` wrapper.
  3. **Delete Actions Panel**: Implement a helper function `renderRightActions` that returns a swipe action view:
     ```tsx
     const renderRightActions = (progress: any, dragX: any, txId: string) => {
       const scale = dragX.interpolate({
         inputRange: [-80, 0],
         outputRange: [1, 0],
         extrapolate: 'clamp',
       });
       return (
         <Pressable
           onPress={() => handleDeleteTransaction(txId)}
           style={{
             backgroundColor: theme.colors.errorContainer,
             justifyContent: 'center',
             alignItems: 'center',
             width: 80,
             height: '100%',
             borderRadius: 16,
           }}
         >
           <Animated.View style={{ transform: [{ scale }] }}>
             <MaterialCommunityIcons name="delete" size={24} color={theme.colors.onErrorContainer} />
           </Animated.View>
         </Pressable>
       );
     };
     ```
  4. **Delete Handler**:
     ```tsx
     const undoTransaction = useTransactionStore((state) => state.undoTransaction);
     const handleDeleteTransaction = (txId: string) => {
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
       undoTransaction(txId);
     };
     ```
  5. **Gesture Root**: The root layout in `app/_layout.tsx` (Line 107) already wraps the application inside `<GestureHandlerRootView style={{ flex: 1 }}>`, so gesture-based swipe handlers will function without adding additional root wrappers.

### Edit Transactions and Bottom Sheet in `TransactionDetailModal.tsx`
* **File Location**: `src/features/home/components/TransactionDetailModal.tsx`
* **Current Structure**: This component uses React Native's `<Modal>` with bottom-sheet alignment styles (`styles.modalBackdrop` has `justifyContent: 'flex-end'`, and `styles.modalCard` has border top-left/right radius). It currently supports toggling `isEditing` via a pencil icon and allows updating `amountCents` and `note` (Lines 41–53, 84–121).
* **Proposed Integration**:
  1. **Extend Editable Fields**: Allow editing `categoryId` and transaction `type` ('income' | 'expense').
  2. **Add Categories Selection in Form**:
     - Query categories from the transaction store: `const categories = useTransactionStore(state => state.categories)`.
     - Within the `isEditing` view, render a horizontal ScrollView of category chips matching the app's visual style. Use progress indicators (or mini emojis) on these chips.
     - Add a segmented button or switch to toggle the transaction type between Expense and Income.
  3. **Wire Save Logic**: Update the `handleSave` callback to dispatch the updated values to the store's `updateTransaction` action:
     ```tsx
     updateTransaction({
       id: transaction.id,
       amountCents: Math.round(parsedAmount * 100),
       note: editNote.trim() || undefined,
       categoryId: selectedCategoryId,
       type: selectedType,
     });
     ```

---

## 2. Budgets & Analytics

### Monthly Budgets per Category (Limits, Color Shift & Haptics)
* **Data Model Extension**:
  - Update `Category` in `types/finance.ts` to include an optional monthly budget limit field:
    ```typescript
    export type Category = {
      id: string;
      name: string;
      emoji: string;
      kind: CategoryKind;
      tint?: string;
      isLocked?: boolean;
      maxBudgetLimitCents?: number; // Optional monthly limit
    };
    ```
  - In `store/useTransactionStore.ts`, add an action to set or clear this budget:
    ```typescript
    setCategoryBudget: (categoryId: string, limitCents: number | undefined) => void;
    ```
* **Budget Configuration UI**:
  - Add budget setting/editing inputs to `src/features/settings/screens/CategoriesScreen.tsx`.
  - When tapping a category card in the list, open a modal with a numeric text input to configure the budget limit.
* **Tracking & Threshold Warnings**:
  - Write a utility selector to sum current month's expenses for a category:
    ```typescript
    export const selectCategoryMonthlySpent = (state: TransactionState, categoryId: string) => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      return state.transactions
        .filter(tx => tx.categoryId === categoryId && tx.type === 'expense' && tx.timestamp >= startOfMonth)
        .reduce((sum, tx) => sum + tx.amountCents, 0);
    };
    ```
  - **Haptics**: When adding or editing an expense (e.g. in `HomeScreen.tsx` or `ChatScreen.tsx`), calculate if the transaction pushes spending past the **80% threshold** of the category's budget:
    ```typescript
    const spentAfterTx = currentSpent + newTxAmount;
    if (budgetLimit && spentAfterTx >= 0.8 * budgetLimit) {
      if (spentAfterTx >= budgetLimit) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // 100%+ spent
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // 80%-100% spent
      }
    }
    ```
  - **Color Shift**: In list items or chips representing the category, check if `spent >= 0.8 * budgetLimit`. If so, apply conditional styling using React Native Paper theme tokens:
    ```tsx
    const isOverWarningLimit = budgetLimit && spent >= 0.8 * budgetLimit;
    const itemStyle = isOverWarningLimit 
      ? { backgroundColor: theme.colors.errorContainer, color: theme.colors.onErrorContainer } 
      : { backgroundColor: theme.colors.surfaceContainerLow };
    ```

### Visual Progress Rings on Category Chips/Items
* **Reusable Progress Ring Component**:
  Create `src/components/UI/ProgressRing.tsx` utilizing `react-native-svg` (supported out-of-the-box):
  ```tsx
  import React from 'react';
  import Svg, { Circle } from 'react-native-svg';

  interface Props {
    size: number;
    strokeWidth: number;
    progress: number; // 0 to 1
    color: string;
    trackColor: string;
  }

  export function ProgressRing({ size, strokeWidth, progress, color, trackColor }: Props) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - Math.min(Math.max(progress, 0), 1) * circumference;

    return (
      <Svg width={size} height={size}>
        <Circle stroke={trackColor} fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
        <Circle
          stroke={color}
          fill="none"
          cx={size/2}
          cy={size/2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </Svg>
    );
  }
  ```
* **Ledger Integration**:
  - In `HomeScreen.tsx` transaction rows, if the category has a budget, render `<ProgressRing>` absolutely positioned over the emoji circle container (`txIconContainer`, size 48). Set progress color to `theme.colors.error` if over 80% spending, otherwise `theme.colors.primary`.
* **Category Pickers / Chips**:
  - In `TransactionDetailModal.tsx` and adding forms, wrap category chips' icon containers with smaller `<ProgressRing>` indicators (e.g. size 32) so users see budget utilization before allocating transactions.

### Analytics Screen Design using `react-native-gifted-charts`
* **File Location**: `src/features/analytics/screens/AnalyticsScreen.tsx`
* **Proposed Implementation details**:
  Replace custom view bar components (Lines 184–208) with fully featured components from `react-native-gifted-charts`:
  1. **Donut Chart (Expense Distribution)**:
     - Group expenses by category for the current month.
     - Bind to `<PieChart>`:
       ```tsx
       import { PieChart } from 'react-native-gifted-charts';
       
       <PieChart
         donut
         radius={75}
         innerRadius={45}
         data={donutData} // format: { value, color, text, label }
         centerLabelComponent={() => (
           <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Expenses</Text>
         )}
       />
       ```
  2. **Monthly Bar Chart (Last 6 Months Trend)**:
     - Sum expenses for each month from the last 6 months.
     - Bind to `<BarChart>`:
       ```tsx
       import { BarChart } from 'react-native-gifted-charts';
       
       <BarChart
         data={monthlyBarData} // format: { value, label, frontColor }
         barWidth={22}
         spacing={15}
         barBorderRadius={4}
         yAxisThickness={0}
         xAxisThickness={0}
         noOfSections={4}
       />
       ```
  3. **Income vs Expense Line Chart (Comparison)**:
     - Calculate historical monthly sums for both income and expense lines.
     - Bind to `<LineChart>`:
       ```tsx
       import { LineChart } from 'react-native-gifted-charts';
       
       <LineChart
         data={incomeLineData} // dataset 1 (Income)
         data2={expenseLineData} // dataset 2 (Expense)
         color1={theme.colors.tertiary} // green for income
         color2={theme.colors.error} // red for expense
         thickness={3}
         dataPointsColor1={theme.colors.tertiary}
         dataPointsColor2={theme.colors.error}
       />
       ```

---

## 3. Automation & Security

### Recurring Transactions UI and `applyDueEvents`
* **Current Status of Startup Hook**:
  - In `app/_layout.tsx` (Lines 59–84), `applyDueEvents` is already fully wired inside a `useEffect` hook that fires upon mounting and sets up a 60-second execution interval to process pending recurring transactions.
* **UI Gaps (Planning Screen)**:
  - There is currently no UI feature allowing users to add recurring events; `PlanningScreen.tsx` only lists existing events and lets users toggle them.
* **Proposed Implementation**:
  1. **Add "NEW" Button**: In the Recurring section header of `src/features/planning/screens/PlanningScreen.tsx`, insert a button triggering a modal.
  2. **Modal Form Details**: Create a `RecurringEventModal` capturing:
     - Name (text)
     - Amount (numeric decimal)
     - Type (Expense / Income)
     - Category (Picker dropdown populated from `useTransactionStore`)
     - Interval ('weekly' | 'monthly')
     - Start Date (DateTimePicker overlay)
  3. **Submit Action**: Call `addEvent` from `useRecurringStore` to save:
     ```typescript
     addEvent({
       name,
       amountCents: Math.round(parsedAmount * 100),
       type,
       categoryId,
       interval,
       startDate: new Date(selectedDate).getTime()
     });
     ```
  4. **Global Toggle**: Add a Switch in settings or the planning screen to update `recurringEnabled` via `setRecurringEnabled` from `useRecurringStore`.

### Biometric Lock (expo-local-authentication)
* **Current Setup**:
  - **Settings Toggle**: `SettingsScreen.tsx` (Lines 134–135, 266–283) already includes a Switch that binds to `biometricAuthEnabled` and calls `setBiometricAuthEnabled` from `useSettingsStore`.
  - **App Layout Lock**: `app/_layout.tsx` (Lines 110–112) wraps the screen content inside a `<BiometricGate>` provider.
  - **Biometric Gate Implementation**: `providers/BiometricGate.tsx` performs check & authenticate hooks:
    1. Checks hardware availability: `LocalAuthentication.hasHardwareAsync()`.
    2. Checks enrolled credentials: `LocalAuthentication.isEnrolledAsync()`.
    3. Triggers authentication dialog: `LocalAuthentication.authenticateAsync(...)` with custom prompt messages and cancel fallbacks.
* **Conclusion**: The codebase already satisfies all biometric lock requirements. No additional code changes are needed other than ensuring the settings toggle switches are visible.

---

## 4. APK Generation

To generate a local Android Package (APK), developers can choose between Expo's EAS Build system and building directly through native Android Gradle wrapper files:

### Method A: Expo EAS Build (Recommended for Expo Workflow)
The root folder contains `eas.json` which is configured with an `apk` profile setting `"buildType": "apk"` and `"distribution": "internal"`.
* **Build Command**:
  ```bash
  eas build --platform android --profile apk --local
  ```
* **Parameters**:
  - `--platform android`: Limits the platform to Android.
  - `--profile apk`: Tells EAS to use the profile mapping to an APK build instead of an AAB (App Bundle).
  - `--local`: Builds the package locally on the host machine using the local Android SDK rather than queuing it on Expo Cloud servers.

### Method B: Direct Native Gradle Build
Since the repository exposes the native `android` folder (Prebuild workflow), the app can be compiled using gradle.
1. **Prepare/Export Assets**:
   ```bash
   npx expo export --platform android
   ```
2. **Compile using Gradle Wrapper**:
   Navigate to the `android/` directory and execute:
   * **For Debug APK**:
     ```bash
     ./gradlew assembleDebug
     ```
     *Output file location*: `android/app/build/outputs/apk/debug/app-debug.apk`
   * **For Release APK**:
     ```bash
     ./gradlew assembleRelease
     ```
     *Output file location*: `android/app/build/outputs/apk/release/app-release.apk`
