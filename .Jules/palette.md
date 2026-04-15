## 2024-05-24 - Screen Reader Labels for Icon-Only React Native Paper Components
**Learning:** In React Native Paper, icon-only components like `IconButton`, `FAB`, and `TextInput.Icon` do not automatically derive a screen reader friendly name from their icon name. Relying solely on the visual icon makes the app inaccessible to users relying on assistive technologies.
**Action:** Always provide an explicit `accessibilityLabel` string to all icon-only components to ensure they are properly announced by screen readers.
