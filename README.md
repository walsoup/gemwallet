# GemWallet 💎

GemWallet is a private, offline-first personal finance assistant built natively for Android using Jetpack Compose and Material 3. It provides a clean, premium, and distraction-free environment to track your cashflow, set savings goals, and manage recurring events, with all processing and data kept 100% on your device.

---

## ✨ Features

* **Local Ledger & Transaction History**: Simple cashflow logging (income & expenses) grouped reverse-chronologically with search and category filtering.
* **Offline Privacy & Biometrics**: Secure access using biometric authentication (fingerprint/face recognition) or a secure 6-digit PIN.
* **Dynamic Material 3 UI**: Clean adaptive styling supporting system dark mode, high-contrast settings, and an OLED True Black theme.
* **Canvas Charts**: Beautifully rendered custom Donut, Bar, and Line charts built directly on Jetpack Compose Canvas elements—zero heavy external dependencies.
* **Financial Planning**: Create savings goals with visual progress bars and manage toggleable weekly or monthly recurring transactions.
* **AI Chat Assistant & NLP Commands**: Track expenses naturally in plain English (e.g., *"Spent 12 dollars on lunch"*). Supports direct cloud Gemini API streams or offline NLP commands.
* **CSV Ledger Export**: Compile and export your entire ledger history into standard `.csv` files using native Android share sheets.

---

## 🛠️ Tech Stack & Architecture

* **UI Framework**: Jetpack Compose & Material 3
* **Database & Storage**: Room Database (SQLite) & SharedPreferences
* **Networking & Parsing**: OkHttp & Kotlinx Serialization
* **Architecture**: Native MVVM structure using Kotlin Flows for real-time UI updates.

---

## 🚀 Getting Started

### Prerequisites
* Android device or emulator running **Android 8.0 (API level 26) or higher**.
* [JDK 17](https://www.oracle.com/java/technologies/downloads/) or newer.

### Building and Running
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/gemwallet.git
   cd gemwallet
   ```
2. Build the debug APK using the Gradle wrapper:
   ```bash
   ./gradlew assembleDebug
   ```
3. The compiled APK will be located at:
   `app/build/outputs/apk/debug/app-debug.apk`

---

## 📝 License

This project is licensed under the MIT License.
