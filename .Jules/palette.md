## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.

## 2024-07-04 - Accessibility Props for Custom Bottom Navigation Tabs
**Learning:** Custom tab buttons (like BouncyButton used in CustomBottomNav) require explicit accessibility state management. While adding `accessibilityRole="button"` and `accessibilityLabel` is good, indicating the active tab to screen readers requires `accessibilityState={{ selected: isFocused }}`.
**Action:** When creating or modifying custom tab bars or segmented controls, always include `accessibilityState={{ selected: isActive }}` alongside `accessibilityRole` and `accessibilityLabel`.
