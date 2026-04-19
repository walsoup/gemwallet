
## 2026-04-19 - Adding explicit accessibility labels to react-native-paper icons
**Learning:** In react-native-paper, icon-only components such as `TextInput.Icon`, `IconButton`, and `FAB` do not automatically have accessibility descriptions. If they perform an action, they require an explicit `accessibilityLabel` prop, otherwise screen readers will not be able to articulate the action to visually impaired users.
**Action:** Whenever using `TextInput.Icon`, `IconButton`, or `FAB` components in react-native-paper, make sure an `accessibilityLabel` is present if it performs a function.
