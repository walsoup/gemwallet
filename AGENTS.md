# GemWallet Agent Guidelines

## 1. Android & Kotlin Backend Development
- **Kotlin 2.x & Room Compatibility**: In Expo / React Native environments using Kotlin 2.x+, avoid `kotlin-kapt` with Room 2.6.1 due to metadata 2.3.0 version mismatch. Rely on `androidx.room:room-runtime` and runtime data structures.
- **Kotlin Regex Named Groups**: Always access named regex capture groups using `match.groups["groupName"]?.value` (never `match.groupValues["groupName"]`).
- **SSE Streaming**: For native AI / LLM streaming in Kotlin, use core OkHttp `response.body?.byteStream()` + `BufferedReader` parsing `data:` lines.
- **Proguard & R8 Minification**: Maintain `-dontwarn **` and `-ignorewarnings` in `android/app/proguard-rules.pro` to prevent R8 build errors from unreferenced optional classes in Expo modules.

## 2. React Native & Financial Logic
- **Integer Cents Precision**: All financial amounts in state stores must be represented as integer cents (`amountCents: number`) to eliminate floating-point rounding issues.
- **Multi-Currency & Zero-Decimal Support**: Zero-decimal currencies (e.g. JPY, KRW, VND) must format with `minimumFractionDigits: 0` and `maximumFractionDigits: 0`.
- **CSV Security**: Always escape potential formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a leading `'` when exporting transaction notes.
- **Secret Isolation**: Never store API keys or private tokens in AsyncStorage. Use `expo-secure-store` exclusively.
