package com.walsoup.gemwallet.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

fun Modifier.bouncyClickable(
    enabled: Boolean = true,
    scaleTo: Float = 0.95f,
    opacityTo: Float = 0.8f,
    onClick: () -> Unit
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val haptic = LocalHapticFeedback.current

    val scale = remember { Animatable(1f) }
    val opacity = remember { Animatable(1f) }

    LaunchedEffect(isPressed) {
        if (isPressed) {
            try {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            } catch (e: Exception) {
                // ignore if haptics fail
            }
            scale.animateTo(
                targetValue = scaleTo,
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f)
            )
            opacity.animateTo(
                targetValue = opacityTo,
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f)
            )
        } else {
            scale.animateTo(
                targetValue = 1f,
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f)
            )
            opacity.animateTo(
                targetValue = 1f,
                animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f)
            )
        }
    }

    this
        .graphicsLayer {
            scaleX = scale.value
            scaleY = scale.value
            alpha = opacity.value
        }
        .clickable(
            interactionSource = interactionSource,
            indication = null, // Purposely disable standard ripple to emphasize the bouncy spring
            enabled = enabled,
            onClick = onClick
        )
}
