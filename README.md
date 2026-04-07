# GemWallet Native (Expo)

Native personal finance app built with Expo + React Native.

## Stack

- Expo Router (file-based navigation)
- React Native Paper (Material 3)
- Zustand + AsyncStorage (offline local persistence)
- Reanimated + Gorhom Bottom Sheet
- Google Generative AI SDK integration for Gemma-based spending audit

## Setup

```bash
npm install
npm run start
```

## Environment Variable

Create `.env` (or EAS env var) with:

```bash
EXPO_PUBLIC_GEMMA_API_KEY=your_google_ai_key
```

## Build/Lint

```bash
npm run lint
npm run build
```

## Android APK via EAS

- EAS profile: `apk` in `eas.json` (`buildType: apk`)
- GitHub Actions workflow: `.github/workflows/build.yml`
- Required secret: `EXPO_TOKEN`
