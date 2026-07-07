## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.

## 2024-07-26 - Contextual Accessibility Labels for Generic Action Buttons
**Learning:** Custom interactive components like `BouncyButton` often lack accessibility descriptors in generic actions like "NEW". While visual context (e.g., being located in a "Savings Goals" section) is sufficient for sighted users, screen readers lack this spatial context and simply announce "New, button".
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` with descriptive context (e.g., "Add new savings goal" instead of just "New") to generic action buttons within categorized sections to improve screen reader navigation.
