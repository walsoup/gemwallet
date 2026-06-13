# Code Changes

This document records the modifications made to the GemWallet codebase:

## 1. Transaction Management & Haptics
- **File**: `src/features/home/screens/HomeScreen.tsx`
  - Added `onSwipeableOpen` handler to the `Swipeable` container for each ledger item.
  - Linked the gesture to trigger `handleDeleteTransaction(tx.id)`, which triggers haptic warning (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)`) and deletes the transaction via `undoTransaction(tx.id)`.

## 2. Budgets & Spending Limits
- **File**: `src/features/settings/screens/CategoriesScreen.tsx`
  - Added state hooks (`budgetModalVisible`, `selectedCategory`, `budgetLimitText`) to support setting monthly budget limits for categories.
  - Wrapped category list items in a `Pressable` component so that tapping a category opens a dedicated `BudgetModal` allowing users to configure or clear its monthly budget limit.
  - Tapping save parses the text input and calls `setCategoryBudget` action.
  - If a budget limit is set, it displays below the category name dynamically using `formatAppCurrency`.
- **File**: `store/useTransactionStore.ts`
  - Added a try-catch safe `triggerBudgetHaptics` helper that dynamically loads `expo-haptics` (avoiding issues in non-Expo or Node test environments).
  - Integrated budget threshold checks in `addExpense` and `updateTransaction`.
  - Triggers a Warning haptic when spending reaches 80%+ of the monthly category budget, and an Error (heavy) haptic when it reaches 100%+.

## 3. Analytics Screen Charts
- **File**: `src/features/analytics/screens/AnalyticsScreen.tsx`
  - Replaced hardcoded `$` formatting in the Donut Chart legend with `formatAppCurrency` to ensure consistency.
  - Added explicit TypeScript type annotations to the local `monthsData` arrays in both monthly trend calculations to prevent implicit `any[]` compilation errors.
