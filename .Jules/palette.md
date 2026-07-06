## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.

## 2026-07-06 - Confirmation Dialog for Destructive Actions
**Learning:** Destructive actions like deleting custom categories instantly executed without confirmation, leading to potential data loss. Wrapping these actions in a standard React Native `Alert.alert` with a destructive option significantly improves the safety and UX of the app.
**Action:** Always wrap destructive state modifications (like deletions) in a confirmation `Alert` to prevent accidental data loss.
