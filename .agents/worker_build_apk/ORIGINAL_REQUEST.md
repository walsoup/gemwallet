## 2026-06-13T07:46:47Z
You are the Worker agent for the GemWallet project. Your working directory is `/data/data/com.termux/files/home/gemwallet/.agents/worker_build_apk/`.
Your mission is to generate a local, installable Android APK file for GemWallet.

1. Locate the `android/` folder in the project.
2. Build the Android app locally to generate a debug or release APK:
   - Try running: `cd android && ./gradlew assembleDebug` (this is the most reliable local build option as it does not require release signing keys or Expo cloud login).
   - If that succeeds, verify that the generated `.apk` file (usually located at `android/app/build/outputs/apk/debug/app-debug.apk`) is copied to the root of the workspace or is available in the workspace.
3. If there are any build errors:
   - Check if you need to run `npm run build` or `npx expo export --platform android` before compiling.
   - Inspect the logs to fix Java/SDK/Gradle configuration errors.
4. Verify that the final APK file exists in the workspace.
5. Once complete, write your handoff.md and changes.md in your working directory. Send a message to the orchestrator (id: `539fedef-1d21-4a9e-a475-10c9df9ebebb`) reporting the path to the generated APK.

MANDATORY INTEGRITY WARNING — include this verbatim:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
