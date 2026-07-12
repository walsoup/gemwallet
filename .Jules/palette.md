## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.
## 2026-07-10 - BouncyButton Tab Pattern
**Learning:** Custom 'BouncyButton' components used in horizontal scroll lists (like filter chips) consistently lack `accessibilityRole="tab"` and `accessibilityState`. This prevents screen readers from understanding their selected state or purpose.
**Action:** Always add `accessibilityRole="tab"` (and wrap the container in `accessibilityRole="tablist"` where appropriate) along with `accessibilityState={{ selected: isActive }}` to these interactive lists.
## 2024-05-19 - Accessibility Labels for Custom Radio Groups
**Learning:** Custom components acting as mutually exclusive toggle buttons (e.g., Expense/Income selectors) must use `accessibilityRole="radio"` and `accessibilityState={{ checked: boolean }}`, while their surrounding container must use `accessibilityRole="radiogroup"`. This ensures screen readers announce the current state properly.
**Action:** Always add `accessibilityRole="radio"` and `accessibilityState={{ checked: isChecked }}` to mutually exclusive toggle buttons and `accessibilityRole="radiogroup"` to the container.
