package com.walsoup.gemwallet.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

@Composable
fun GemWalletTheme(
    themePreference: String = "dark",
    oledTrueBlackEnabled: Boolean = true,
    highContrastEnabled: Boolean = false,
    primaryColorHex: String = "#ff6b6b",
    secondaryColorHex: String = "#52dea2",
    content: @Composable () -> Unit
) {
    val isDark = when (themePreference) {
        "light" -> false
        "dark" -> true
        else -> isSystemInDarkTheme()
    }

    val primary = parseColor(primaryColorHex, DefaultPrimary)
    val secondary = parseColor(secondaryColorHex, DefaultSecondary)
    val tertiary = DefaultTertiary

    val colorScheme = if (isDark) {
        val bg = if (oledTrueBlackEnabled) OLEDBackground else DarkBackground
        val surf = if (oledTrueBlackEnabled) OLEDSurface else DarkSurface
        val surfVariant = if (oledTrueBlackEnabled) OLEDSurfaceVariant else DarkSurfaceVariant
        val outlineColor = if (oledTrueBlackEnabled) OLEDOutline else DarkOutline

        darkColorScheme(
            primary = primary,
            onPrimary = if (highContrastEnabled) Color.Black else Color.White,
            primaryContainer = primary.copy(alpha = 0.25f),
            onPrimaryContainer = primary,
            secondary = secondary,
            onSecondary = Color.Black,
            secondaryContainer = secondary.copy(alpha = 0.2f),
            onSecondaryContainer = secondary,
            tertiary = tertiary,
            onTertiary = Color.White,
            tertiaryContainer = tertiary.copy(alpha = 0.2f),
            onTertiaryContainer = tertiary,
            background = bg,
            onBackground = Color.White,
            surface = surf,
            onSurface = Color.White,
            surfaceVariant = surfVariant,
            onSurfaceVariant = Color(0xFFCAC4D0),
            outline = outlineColor,
            error = Color(0xFFF2B8B5),
            onError = Color(0xFF601410),
            errorContainer = Color(0xFF8C1D18),
            onErrorContainer = Color(0xFFF9DEDC)
        )
    } else {
        lightColorScheme(
            primary = primary,
            onPrimary = Color.White,
            primaryContainer = primary.copy(alpha = 0.15f),
            onPrimaryContainer = primary,
            secondary = secondary,
            onSecondary = Color.White,
            secondaryContainer = secondary.copy(alpha = 0.15f),
            onSecondaryContainer = secondary,
            tertiary = tertiary,
            onTertiary = Color.White,
            tertiaryContainer = tertiary.copy(alpha = 0.15f),
            onTertiaryContainer = tertiary,
            background = LightBackground,
            onBackground = Color.Black,
            surface = LightSurface,
            onSurface = Color.Black,
            surfaceVariant = LightSurfaceVariant,
            onSurfaceVariant = Color(0xFF49454F),
            outline = LightOutline,
            error = Color(0xFFB3261E),
            onError = Color.White,
            errorContainer = Color(0xFFF9DEDC),
            onErrorContainer = Color(0xFF370B1E)
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
