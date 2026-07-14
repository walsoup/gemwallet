package com.walsoup.gemwallet.ui.theme

import androidx.compose.ui.graphics.Color

val DarkBackground = Color(0xFF1C1B1F)
val DarkSurface = Color(0xFF232128)
val DarkSurfaceVariant = Color(0xFF2A2731)
val DarkOutline = Color(0xFF49454F)

val LightBackground = Color(0xFFFAFAFE)
val LightSurface = Color(0xFFF3EDF7)
val LightSurfaceVariant = Color(0xFFEDDFF6)
val LightOutline = Color(0xFF79747E)

val DefaultPrimary = Color(0xFFff6b6b)
val DefaultSecondary = Color(0xFF52dea2)
val DefaultTertiary = Color(0xFF4a90e2)

val OLEDBackground = Color(0xFF000000)
val OLEDSurface = Color(0xFF121212)
val OLEDSurfaceVariant = Color(0xFF1E1E1E)
val OLEDOutline = Color(0xFF2A2A2A)

// HSL helpers to create dynamic primary/secondary colors
fun parseColor(hex: String, fallback: Color): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: Exception) {
        fallback
    }
}
