## 2024-04-17 - React Native Paper Accessibility Labels
**Learning:** Icon-only components like `IconButton`, `FAB`, and `TextInput.Icon` in React Native Paper do not automatically infer a meaningful label for screen readers. They require an explicit `accessibilityLabel` prop to provide readable names for assistive technologies.
**Action:** Always verify icon-only buttons have an `accessibilityLabel` when adding or modifying them in the codebase.
