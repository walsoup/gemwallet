# GemWallet 💎

GemWallet is a premium, offline-first personal finance companion built with financial empathy. Designed under the creative North Star of **"The Velvet Sanctuary,"** it moves away from aggressive fintech aesthetics to offer an immersive, dark environment where tracking spending feels calm, private, and intentional.

Everything is processed and stored 100% locally on your device. No cloud accounts, no third-party trackers, and no internet connection required.

---

## 📱 App Preview

Below are the actual screens rendered from the GemWallet design system:

| 🏠 Home Screen | 📈 Cashflow & Insights | 🗓️ Savings & Planning | ⚙️ App Settings |
| :---: | :---: | :---: | :---: |
| ![Home Screen](assets/screenshots/home.png) | ![Cashflow Trends](assets/screenshots/analytics.png) | ![Savings Goals](assets/screenshots/planning.png) | ![System Settings](assets/screenshots/settings.png) |

---

## ✨ Key Features

### 1. Core Ledger & Transaction Tracking
* **Daily Ledger:** Transactions are grouped in a reverse-chronological `SectionList` with sticky day headers for quick scanning.
* **Tonal Layouts:** Clean list items with custom category emojis, notes, and color-coded values (Tertiary for income, OnSurface for expense, Error for overdrafts).
* **Double-Tap Quick Entry:** Tap category chips to log instantly, or use the floating quick actions menu.
* **Transaction Detail Sheet:** Deep-dive into notes, exact timestamps, and categories. Features instant editing or safe deletion with a snackbar undo action.

### 2. Financial Planning & Budgeting
* **Savings Goals:** Create and track customized goals (e.g., Emergency Fund, Vacation) with visual progress meters, target percentages, and estimated completion dates.
* **Recurring Transactions:** Manage regular obligations like rent, gym memberships, and salaries with toggleable active states.

### 3. Local AI & Natural Language Processing
* **Local NLP Input:** Quickly input transactions in plain English (e.g., *"Spent 15 dollars on ramen at Ichiran"*). The local model parses amounts, matches descriptions, and maps them via fuzzy matching to your categories.
* **Gemini Smart Advisor:** Stream humorous, sarcastic, yet highly accurate financial advice tailored to your spending habits directly from a Gemini 1.5 Flash stream.

### 4. High-Fidelity Micro-interactions & Motion
* **The "Odometer" Effect:** Available cash numbers roll smoothly during updates using custom spring physics (`friction: 8, tension: 40`).
* **Keypad Shake Feedback:** Invalid decimal entries or character limits trigger a 4-part horizontal shake translation sequence (`±10dp` over `160ms`).
* **Scroll-Linked Headers:** Page balances fade seamlessly into the center Appbar on scrolling.
* **Tactile Haptic Signature Map:**
  * `selection`: General keypad taps, category selections, and searches.
  * `impactLight`: Backspace/delete key.
  * `impactMedium`: Opening the manual entry layout or long-pressing the FAB.
  * `impactHeavy`: Triggering AI transaction parsing.
  * `notificationSuccess`: Transaction saves and onboarding completion.
  * `notificationWarning`: Input errors (shake feedback) and rollback/undo triggers.

### 5. Custom Material 3 Customization
* **Monet Color Engine:** Extract dynamic accent palettes based on your system theme.
* **The "No-Line" Rule:** Visual layout boundaries are defined strictly through value elevation shifts (`surface-container-low` to `highest`) rather than solid borders.
* **OLED & Contrast Modes:** Toggle true pitch-black theme mode to save battery on OLED screens, or enable a High Contrast mode for enhanced sunlight readability.

### 6. Privacy & Offline Security
* **Biometric Vault:** Restrict app access using Face ID / Touch ID or a fallback 6-digit PIN lock.
* **CSV Export:** Compile transactions instantly into standard `.csv` documents and share them via local share intents.
* **Data Control:** Fully wipe all stored data securely with error-tinted double-confirmation prompts.
* **Category Safety:** Deleting a category automatically cascades and maps orphan historical transactions to the "Misc" category.

---

## 🛠️ Tech Stack & Architecture

* **Framework:** React Native + Expo (managed workflow with Expo Router).
* **Styling:** React Native Paper (Material 3 components) and a customized typography system (featuring Space Grotesk for numbers/headers and Be Vietnam Pro for content).
* **State Management:** Zustand with custom AsyncStorage persistent middleware.
* **Data Integrity:** All financial values are kept as **integer cents (`amountCents`)** to completely avoid JavaScript floating-point errors.

### Directory Structure

```
├── app/                  # File-based navigation (routes, layouts, screens)
├── assets/               # Branding assets & screen screenshots
├── src/
│   ├── components/       # Custom shared UI elements (keypad, charts, list cells)
│   ├── core/             # Design themes, database configuration, security hooks
│   ├── features/         # Feature-specific isolation (analytics, chat, home, nlp)
│   └── hooks/            # Generic custom hooks (haptics, layout-aware viewports)
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed. We recommend using a modern package manager like `npm` or `yarn`.

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/your-username/gemwallet.git
   cd gemwallet
   ```

2. Install the workspace dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:
```bash
npm run start
```

From the Expo CLI console, you can launch the app on:
* **iOS Simulator:** Press `i` (or run `npm run ios`)
* **Android Emulator:** Press `a` (or run `npm run android`)
* **Web Browser:** Press `w` (or run `npm run web`)

### Tests & Quality Checks

Run the Jest test suites (covering 100% of core state transition functions):
```bash
npm run test
```

Perform type checking and linting:
```bash
npm run typecheck
npm run lint
```

### Production Build

Export the production bundle (configured for Android APK compilation by default):
```bash
npm run build
```

---

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
