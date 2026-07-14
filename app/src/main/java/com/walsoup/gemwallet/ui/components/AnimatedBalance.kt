package com.walsoup.gemwallet.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

@Composable
fun AnimatedBalance(
    valueCents: Long,
    currencyCode: String,
    localeString: String,
    modifier: Modifier = Modifier,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontWeight: FontWeight = FontWeight.Bold,
    style: TextStyle = MaterialTheme.typography.displayMedium
) {
    // Smooth Odometer / Spring animation
    val animatedCents = remember { Animatable(valueCents.toFloat()) }

    LaunchedEffect(valueCents) {
        animatedCents.animateTo(
            targetValue = valueCents.toFloat(),
            animationSpec = spring(
                dampingRatio = 0.6f, // Similar to friction: 8
                stiffness = 150f     // Similar to tension: 40
            )
        )
    }

    val formatted = formatCurrency(animatedCents.value.toLong(), currencyCode, localeString)

    Text(
        text = formatted,
        fontSize = fontSize,
        fontWeight = fontWeight,
        style = style,
        modifier = modifier
    )
}

fun formatCurrency(amountCents: Long, currencyCode: String, localeString: String): String {
    val amount = amountCents.toDouble() / 100.0
    return try {
        val parts = localeString.split("-")
        val locale = if (parts.size > 1) Locale(parts[0], parts[1]) else Locale(parts[0])
        val formatter = NumberFormat.getCurrencyInstance(locale)
        formatter.currency = Currency.getInstance(currencyCode)
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.format(amount)
    } catch (e: Exception) {
        "$currencyCode ${String.format(Locale.US, "%.2f", amount)}"
    }
}
