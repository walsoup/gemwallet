## 2024-05-24 - Accessibility labels for Icon Buttons
**Learning:** `IconButton` components in `react-native-paper` without text content require an explicit `accessibilityLabel` to be usable by screen readers. If the button toggles between states (like play/stop or recording/stopped), the label must dynamically reflect the current state and action.
**Action:** Always verify that icon-only components (like `IconButton`, `FAB`, and `TextInput.Icon`) have appropriate `accessibilityLabel` props set when implementing or modifying UI.
