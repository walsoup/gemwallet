# GemWallet: Native Kotlin & Compose Re-Architecture (July 2026)

This document serves as the absolute ground truth for the restructured native Kotlin implementation of GemWallet, which replaced the previous React Native codebase.

---

## 1. Core Architecture & Local Database (Room)
*   **Database Schema (`Entities.kt`):**
    *   **CategoryEntity:** Defines category fields (`id`, `name`, `emoji`, `kind`, `isLocked`, `maxBudgetLimitCents`, `createdAt`).
    *   **TransactionEntity:** Financial ledger entries (`id`, `amountCents` as integer, `type`, `timestamp`, `categoryId`, `note`).
    *   **GoalEntity:** Savings milestones (`id`, `name`, `targetCents`, `savedCents`, `dueDate`, `createdAt`).
    *   **RecurringEventEntity:** Automated schedules (`id`, `name`, `amountCents`, `type`, `interval` as "weekly" or "monthly", `categoryId`, `nextRun`, `enabled`, `createdAt`).
*   **Reactive Streams (`Daos.kt`):**
    *   Exposes category, transaction, goal, and recurring events using Kotlin `Flow` for real-time Compose UI updates.
*   **Database Initializer (`AppDatabase.kt`):**
    *   Implements a custom database room callback to pre-populate standard default categories (Food, Transit, Utilities, Salary, etc.) on first launch.

---

## 2. Dynamic Preferences Store (`SettingsManager.kt`)
*   **Shared Preferences Manager:**
    *   Exposes a read-only `StateFlow<SettingsState>` containing theme configuration, currency codes, regional language preferences, voice controls, onboarding completion, and secure PIN validation.
    *   **Passcode PIN:** Securely hashes entered PIN codes using standard SHA-256 before writing to storage.

---

## 3. UI Design System (Jetpack Compose & Material 3)
*   **Expressive Theme (`Theme.kt` & `Type.kt`):**
    *   Integrates Space Grotesk and Be Vietnam Pro typefaces downloaded dynamically via the Google Fonts Cert provider.
    *   Supports Dynamic Material 3 colors, a sleek dark mode, and an OLED True Black theme.
    *   Handles safe drawing areas via `Modifier.safeDrawingPadding()`.
*   **Dynamic Bottom Navigation (`MainActivity.kt`):**
    *   Scaffold with tabbed navigation: **Home**, **Insights**, **Chat** (conditionally shown), **Plan**, and **Settings**.
    *   Purges all navigation top headers except for the **Home Screen** top bar, which features a custom greetings layout with name fallback.

---

## 4. Canvas-based Custom Charts
*   **Donut Chart (`CustomCharts.kt`):** Uses Canvas drawing to render category breakdown segments and legend counters.
*   **Bar Chart (`CustomCharts.kt`):** Renders monthly spending progress over the last 6 months.
*   **Line Chart (`CustomCharts.kt`):** Compares Income vs. Expense trends using smooth curves and nodes.

---

## 5. Security & Biometrics Gate
*   **Passcode Screen (`PasscodeGateScreen.kt`):** Renders custom dots and a grid keypad to unlock the application.
*   **Biometrics Integration (`MainActivity.kt`):** Integrates standard Android `BiometricPrompt` prompts to unlock the application on launch or return from background.

---

## 6. AI & Natural Language Parser (OkHttp Streaming)
*   **Gemini Service (`GeminiService.kt`):** Queries Gemini endpoints via direct, light OkHttp requests and streams back generated advisory text.
*   **NLP Parser (`NlpService.kt`):** Employs regex matching rules to detect tracking commands (`ADD_EXPENSE:`, `ADD_INCOME:`, `ADD_RECURRING:`, `ADD_GOAL:`) and trigger local database insertions automatically.
*   **Conversational Assistant (`ChatScreen.kt`):** Stream assistant text outputs, displaying system commands and bubble layout styles.

---

## 7. Build System & Restructuring
*   **Root Directory Structure:**
    *   `/app/`: Pure Kotlin Android application module.
    *   `build.gradle` & `settings.gradle`: Clean Gradle build rules containing only standard compile directives (free from all React Native, Expo, and autolinked libraries).
