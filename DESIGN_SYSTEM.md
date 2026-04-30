# Gemwallet Material 3 Design System

This document outlines the design decisions and structures used for the massive UI overhaul of Gemwallet, strictly adhering to Material Design 3 (Material You) guidelines.

## Philosophy

The previous custom UI was completely removed in favor of a standardized, accessible, and deeply expressive Material 3 aesthetic. Bounciness was toned down but retained using subtle haptics (`expo-haptics`) to provide "Hamrick-style" (Haptic) feedback without feeling overwhelmingly springy.

## Foundation

*   **Color Palette**: Controlled entirely by `react-native-paper`'s Material 3 theme generation (derived from `@pchmn/expo-material3-theme` if used, or paper's default MD3 algorithm). We use `theme.colors.surface`, `theme.colors.primaryContainer`, etc.
*   **Typography**: Uses standard Material 3 roles provided by Paper (`displayMedium`, `headlineMedium`, `titleLarge`, `bodyLarge`, `labelMedium`, etc.).
*   **Shapes**: Large rounded corners (usually 16px to 24px) for Cards and Surfaces to align with MD3 expressive structures.

## Navigation

*   **Bottom Navigation**: Replaced the custom floating pill with the standard MD3 `BottomNavigation.Bar` from `react-native-paper`.
    *   Features pill-shaped active indicators.
    *   Subtle light haptic feedback on tab press.
    *   Dynamic rendering (e.g., "Chat" tab is conditionally rendered based on the user's AI preference set during onboarding).

## UI Structures & Components

### Onboarding Flow (`OnboardingScreen.tsx`)
*   **Structure**: ScrollView centered content.
*   **Typography**: `displayMedium` for welcome text.
*   **Interactive**: Standard MD3 `Switch` to toggle AI features with haptic feedback.
*   **Action**: Filled `Button` (`mode="contained"`) with fully rounded corners (`borderRadius: 24`).

### Home Screen (`HomeScreen.tsx`)
*   **Hero Section**: Elevated `Surface` (elevation 1) displaying the Total Balance. Uses `surface` color and `displayMedium` font.
*   **Transactions List**: Rendered using MD3 `Card` (`mode="elevated"`).
    *   `Card.Title` used for consistent layout.
    *   `Avatar.Icon` used for transaction type visuals.
*   **Floating Action Button (FAB)**: Standard MD3 `FAB` anchored to the bottom right, utilizing `primaryContainer` colors.

### Settings Screen (`SettingsScreen.tsx`)
*   **Structure**: Utilizes `List.Section` and `List.Item` for standard MD3 list behaviors.
*   **Dividers**: Uses MD3 `Divider` to separate sections.
*   **Interactive**: Standard `Switch` components embedded in list right-accessories.

### Chat Screen (`ChatScreen.tsx`)
*   **Structure**: A typical chat interface layout with a sticky bottom input.
*   **Messages**: `Surface` bubbles using `secondaryContainer` and `onSecondaryContainer` for distinct AI visual separation.
*   **Input**: `TextInput` with `mode="outlined"` and deeply rounded outlines (`borderRadius: 24`) alongside an `IconButton` for sending.

## Haptic Feedback (The "Bounciness")

Instead of heavy Reanimated spring values scaling components up and down drastically, we now use `expo-haptics` at critical interaction points:
*   `Haptics.ImpactFeedbackStyle.Light` - For subtle interactions (Tab presses, FAB presses, Switch toggles).
*   `Haptics.ImpactFeedbackStyle.Medium` - For prominent actions (Completing Onboarding).

This ensures the app feels alive and responsive ("bouncy/Hamrick feedback") without visual overload.
