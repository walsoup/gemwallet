## 2024-04-12 - Dashboard Empty State and Keyboard Accessibility
**Learning:** React Native `FlatList` components can leave users confused when empty. Adding a helpful `ListEmptyComponent` significantly improves the onboarding experience. Additionally, custom numpads built with `Pressable` need explicit `accessibilityRole="button"` and `accessibilityLabel` mapping (especially for symbols like '⌫' to 'Backspace') to be usable by screen readers.
**Action:** Always verify `FlatList` components have a fallback empty state and ensure custom touch targets map symbols to words for screen readers.
