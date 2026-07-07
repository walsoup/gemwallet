## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.
## 2026-07-02 - Adding accessibility to Custom Bottom Navigation
**Learning:** React Navigation's custom bottom tabs mapped iteratively often lack accessibility roles and states out of the box, leading screen readers to read them just as unlabeled views, and do not announce if they are selected.
**Action:** Always ensure that custom wrapped components mapped from routes in bottom navigators inherit `accessibilityRole="button"`, `accessibilityState={{ selected: isFocused }}`, and `accessibilityLabel={label}` props.
