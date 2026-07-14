package com.walsoup.gemwallet.ui.theme

import androidx.compose.ui.graphics.Color

// Warm, premium Velvet-tinted dark colors
val DarkBackground = Color(0xFF151313)
val DarkSurface = Color(0xFF1C1A1A)
val DarkSurfaceVariant = Color(0xFF252222)
val DarkOutline = Color(0xFF3E3636)

// Velvet-tinted light colors
val LightBackground = Color(0xFFFFFBFB)
val LightSurface = Color(0xFFF7F0F0)
val LightSurfaceVariant = Color(0xFFF4DDDB)
val LightOutline = Color(0xFF857371)

// Default brand colors
val DefaultPrimary = Color(0xFFae2f34)    // Rich Velvet red
val DefaultSecondary = Color(0xFF904a47)  // Soft warm secondary
val DefaultTertiary = Color(0xFF006d48)   // Forest emerald green

// OLED true black styling
val OLEDBackground = Color(0xFF000000)
val OLEDSurface = Color(0xFF0A0909)
val OLEDSurfaceVariant = Color(0xFF161313)
val OLEDOutline = Color(0xFF252121)

// HSL helpers to create dynamic primary/secondary colors
fun parseColor(hex: String, fallback: Color): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: Exception) {
        fallback
    }
}
