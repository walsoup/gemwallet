package com.walsoup.gemwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import java.security.MessageDigest

@Composable
fun PasscodeGateScreen(
    passcodePinHash: String,
    biometricsEnabled: Boolean,
    onSuccess: () -> Unit,
    onRequestBiometrics: (() -> Unit)? = null
) {
    var pinValue by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf<String?>(null) }

    fun handleDigit(digit: String) {
        if (pinValue.length >= 6) return
        pinError = null
        val next = pinValue + digit
        pinValue = next

        if (next.length == 6) {
            // Check passcode
            if (verifyPasscodePin(next, passcodePinHash)) {
                onSuccess()
            } else {
                pinError = "Incorrect passcode. Try again."
                pinValue = ""
            }
        }
    }

    fun handleBackspace() {
        if (pinValue.isNotEmpty()) {
            pinValue = pinValue.dropLast(1)
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceAround
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Enter Passcode",
                    fontFamily = SpaceGroteskFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center
                )
                
                Text(
                    text = "Unlock GemWallet using your secure PIN.",
                    fontFamily = BeVietnamProFamily,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp)
                )

                // Dots representing passcode entry
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 32.dp)
                ) {
                    repeat(6) { idx ->
                        val filled = idx < pinValue.length
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(
                                    if (filled) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surfaceVariant
                                )
                        )
                    }
                }

                pinError?.let {
                    Text(
                        text = it,
                        fontFamily = BeVietnamProFamily,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
            }

            // Custom Keypad
            Column(
                modifier = Modifier.width(280.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val keys = listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("", "0", "delete")
                )

                keys.forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceSpacey()
                    ) {
                        row.forEach { key ->
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (key.isNotEmpty()) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                                        else Color.Transparent
                                    )
                                    .clickable(enabled = key.isNotEmpty()) {
                                        if (key == "delete") handleBackspace()
                                        else handleDigit(key)
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                if (key == "delete") {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Backspace",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                } else if (key.isNotEmpty()) {
                                    Text(
                                        text = key,
                                        fontSize = 24.sp,
                                        fontFamily = SpaceGroteskFamily,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Biometric Auth Fallback Button
            if (biometricsEnabled && onRequestBiometrics != null) {
                TextButton(onClick = onRequestBiometrics) {
                    Text(
                        text = "Use Biometrics",
                        fontFamily = BeVietnamProFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

private fun Arrangement.SpaceSpacey() = Arrangement.SpaceEvenly

private fun verifyPasscodePin(enteredPin: String, storedHash: String): Boolean {
    if (storedHash.isEmpty()) return false
    return try {
        val parts = storedHash.split(":")
        if (parts.size != 2) return false
        val salt = android.util.Base64.decode(parts[0], android.util.Base64.NO_WRAP)
        val storedPinHash = parts[1]
        
        val iterations = 10000
        val keyLength = 256
        val spec = javax.crypto.spec.PBEKeySpec(enteredPin.toCharArray(), salt, iterations, keyLength)
        val skf = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val hash = skf.generateSecret(spec).encoded
        val computedPinHash = android.util.Base64.encodeToString(hash, android.util.Base64.NO_WRAP)
        
        storedPinHash == computedPinHash
    } catch (e: Exception) {
        false
    }
}
