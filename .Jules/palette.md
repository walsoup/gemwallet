## 2024-05-18 - Accessibility Labels for Icon Buttons
**Learning:** React Native Paper icon-only components like `IconButton` and `TextInput.Icon` don't automatically provide screen reader announcements. Adding `accessibilityLabel` makes them discoverable and usable.
**Action:** Always add `accessibilityLabel` to `IconButton` and `TextInput.Icon` components, using dynamic labels when toggling state.

## 2024-06-26 - Accessibility Labels for Custom Icon Buttons (BouncyButton)
**Learning:** Custom interactive components like `BouncyButton` acting as icon-only toggles or closers often omit screen reader announcements, unlike standard library buttons. The codebase uses `BouncyButton` extensively for modal actions without accessibility metadata.
**Action:** Always add `accessibilityRole="button"` and `accessibilityLabel` (dynamic when toggling state) to custom components like `BouncyButton` when they contain only icons.

## 2024-07-05 - Complex Dynamic Accessibility Labels
**Learning:** For lists mapping complex relational data (like transaction amounts, dynamic categories, and types in `HomeScreen.tsx`), an interpolated descriptive string in `accessibilityLabel` (e.g., `"Income of $50 for Groceries, Category Food"`) is far superior to letting the screen reader read disjointed `Text` node descendants. Combining properties correctly on the wrapper container `BouncyButton` vastly improves the navigational flow for users utilizing TalkBack/VoiceOver.
**Action:** When adding accessibility to mapped lists with complex internal structures, assemble a human-readable sentence for the wrapper's `accessibilityLabel` instead of modifying individual sub-elements.
