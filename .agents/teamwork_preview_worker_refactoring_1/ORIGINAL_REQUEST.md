## 2026-07-14T06:22:32Z
Your working directory is `/data/data/com.termux/files/home/gemwallet/.agents/teamwork_preview_worker_refactoring_1/`.
Your task is to implement all refactoring and security fixes for the GemWallet application to fix all code quality, database, coroutines, UI, and security issues.

Please refer to the audit report stored at `/data/data/com.termux/files/home/gemwallet/.agents/teamwork_preview_explorer_exploration_4/audit_report.md` for full details.

Here is the exact work items list you must execute:

1. Room Database Configuration:
   - Move category operations in `TransactionDao` (like `deleteCategoryById`) to `CategoryDao` in `app/src/main/java/com/walsoup/gemwallet/data/database/Daos.kt`.
   - In `app/src/main/java/com/walsoup/gemwallet/data/database/AppDatabase.kt`, fix the Room callback `onCreate` to avoid accessing the companion object's `INSTANCE` directly if it could be null. Instead, dynamically retrieve or pass the database instance safely.

2. Coroutines & Flows:
   - In `app/src/main/java/com/walsoup/gemwallet/MainActivity.kt`, collect database flows using `collectAsStateWithLifecycle` instead of `collectAsState`.
   - In `MainActivity.kt`, do NOT run critical database writes (like inserting transactions, deleting, resetting database, adding goals) on the cancelable activity `lifecycleScope`. Implement a non-cancelable application-level CoroutineScope or use a database-scoped coroutine context, ensuring writes complete even if the activity is destroyed/recreated.
   - In `MainActivity.kt`, wrap all database coroutine launch writes in try-catch blocks to prevent unhandled SQLite exceptions from crashing the app.
   - In `app/src/main/java/com/walsoup/gemwallet/ai/GeminiService.kt` and `app/src/main/java/com/walsoup/gemwallet/ai/HuggingFaceService.kt`, wrap the blocking OkHttp `execute()` calls in `withContext(Dispatchers.IO)` to ensure they are main-safe.
   - In `MainActivity.kt`, wrap the background recurring events check loop in `LaunchedEffect` in a try-catch block.

3. Jetpack Compose UI:
   - In `app/src/main/java/com/walsoup/gemwallet/ui/screens/ChatScreen.kt`, key the callbacks `remember` block on its dynamic dependencies (`categories`, `settingsState`, `onAddExpense`, etc.) to prevent capturing stale state.
   - In `app/src/main/java/com/walsoup/gemwallet/ui/screens/AnalyticsScreen.kt`, offload heavy calculations (`last6MonthsData`, `topMovers`, calendar operations, grouping/sorting) to a background thread (e.g. `withContext(Dispatchers.Default)` inside a LaunchedEffect or computed off-screen) or optimize them using a ViewModel or remember keys so they do not block the UI thread or cause jank.
   - In `app/src/main/java/com/walsoup/gemwallet/ui/screens/HomeScreen.kt`'s `TransactionDetailModal`, when toggling `txType` (expense/income), validate/reset `selectedCategoryId` to avoid saving a transaction with an invalid category mismatch.
   - In `app/src/main/java/com/walsoup/gemwallet/ui/screens/SettingsScreen.kt`, wrap the CSV file write and sharing intent preparation in a coroutine with `Dispatchers.IO` to avoid blocking the main UI thread.
   - In `HomeScreen.kt`, wrap the greeting message calendar check in a `remember` block.
   - In `MainActivity.kt`, ensure `isUnlocked` lock state is initialized correctly based on settings state loading (bypass lock only when settings are loaded and check if lock is actually disabled).

4. Security & Compliance:
   - In `app/src/main/java/com/walsoup/gemwallet/data/preferences/SettingsManager.kt`, replace standard `SharedPreferences` with `EncryptedSharedPreferences` (using `androidx.security:security-crypto`) for storing the Gemini API Key and Hugging Face Token.
   - In `SettingsManager.kt` and `app/src/main/java/com/walsoup/gemwallet/ui/screens/PasscodeGateScreen.kt`, use a slow/salted hashing algorithm (e.g. PBKDF2 with a salt, or SHA-256 with a unique random/configured salt) to hash and verify the passcode PIN.
   - In `app/src/main/AndroidManifest.xml`, set `android:allowBackup="false"` to prevent backup extraction of private data.
   - In `AndroidManifest.xml`, remove the unused `SYSTEM_ALERT_WINDOW` permission request.
   - In `NlpService.kt` / `ChatScreen.kt`, introduce user confirmation (e.g. a confirm dialog/card) before executing commands parsed from natural language, to mitigate prompt injection risk.

5. Code Quality & Build Config:
   - In `app/build.gradle`, remove the signingConfigs block or release signing configuration using debug keys.
   - In `MainActivity.kt` / `SettingsScreen.kt`, check biometric hardware availability via `BiometricManager` before showing the biometric prompt.
   - In `AndroidManifest.xml` and `app/proguard-rules.pro`, clean up Expo and React Native leftovers.

6. Build Verification:
   - Do NOT run local gradle builds.
   - Commit and push your changes to the remote repository.
   - Monitor the GitHub Actions CI workflow to ensure that the build completes successfully (exit code 0, APK compiled) and the generated APK artifact is uploaded on GitHub.
   - Report the build status and link/logs of the CI run in your handoff.

MANDATORY INTEGRITY WARNING — include this verbatim:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Deliverable:
Apply the fixes directly in the codebase, verify by pushing to the remote repository, monitor the GitHub Actions workflow, and save your handoff report in your workspace as `handoff.md`. Send me a message when done with the path to your handoff report and a summary of your changes.
