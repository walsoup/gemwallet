## 2025-04-14 - Accessibility labels for react-native-paper icons
**Learning:** Icon-only buttons (like `IconButton`, `FAB`, or `TextInput.Icon`) in `react-native-paper` components often lack implicit readable names. Screen readers rely on the `accessibilityLabel` prop to announce their purpose, which is missing by default.
**Action:** Always check `IconButton`, `FAB`, and `TextInput.Icon` elements for explicit `accessibilityLabel` props to ensure they are screen-reader accessible.
