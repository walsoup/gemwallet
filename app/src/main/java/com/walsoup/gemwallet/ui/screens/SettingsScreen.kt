package com.walsoup.gemwallet.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.components.formatCurrency
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settingsState: SettingsManager.SettingsState,
    settingsManager: SettingsManager,
    categories: List<CategoryEntity>,
    onAddCustomCategory: (name: String, emoji: String) -> Unit,
    onClearAllData: () -> Unit,
    onExportCsv: () -> String
) {
    val context = LocalContext.current

    // Modal view states
    var showCategoryModal by remember { mutableStateOf(false) }
    var showGeminiKeyModal by remember { mutableStateOf(false) }
    var showPasscodeModal by remember { mutableStateOf(false) }
    
    var showClearDataConfirm by remember { mutableStateOf(false) }
    var showResetConfirm by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Safe Area Padding
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }

        // Header Section
        item {
            Column {
                Text(
                    text = "Settings",
                    fontFamily = SpaceGroteskFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 32.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Manage your wallet experience.",
                    fontFamily = BeVietnamProFamily,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 1. Security Section Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Security",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Biometrics Auth Toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Fingerprint, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("Biometric Authentication", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Require Face ID / Touch ID", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Switch(
                                checked = settingsState.biometricAuthEnabled,
                                onCheckedChange = { settingsManager.setBiometricAuthEnabled(it) }
                            )
                        }

                        // Divider
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // Passcode Pin Set/Change Row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showPasscodeModal = true },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text(
                                        text = if (settingsState.passcodeEnabled) "Change Passcode" else "Set Passcode",
                                        fontFamily = BeVietnamProFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    Text(
                                        text = if (settingsState.passcodeEnabled) "Update your 6-digit pin" else "Require a pin to open",
                                        fontFamily = BeVietnamProFamily,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        // Remove Passcode if set
                        if (settingsState.passcodeEnabled) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { settingsManager.removePasscode() },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(Icons.Default.LockOpen, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Column {
                                        Text("Remove Passcode", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text("Disable pin authentication", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Appearance Section Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Appearance",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Theme Selection (Light / Dark / System)
                        Column {
                            Text("Theme Preference", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("light", "dark", "system").forEach { theme ->
                                    val active = settingsState.themePreference == theme
                                    FilterChip(
                                        selected = active,
                                        onClick = { settingsManager.setThemePreference(theme) },
                                        label = { Text(theme.replaceFirstChar { it.uppercase() }, fontFamily = BeVietnamProFamily) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // OLED True Black
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Brightness2, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("OLED True Black", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Force total black background", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Switch(
                                checked = settingsState.oledTrueBlackEnabled,
                                onCheckedChange = { settingsManager.setOledTrueBlackEnabled(it) }
                            )
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // High Contrast Mode
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Compare, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("High Contrast Mode", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Maximum contrast outlines & text", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Switch(
                                checked = settingsState.highContrastEnabled,
                                onCheckedChange = { settingsManager.setHighContrastEnabled(it) }
                            )
                        }
                    }
                }
            }
        }

        // 3. AI & Assistant Section Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "AI & Assistant",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Model Provider
                        Column {
                            Text("Model Provider", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("local", "google").forEach { provider ->
                                    val active = settingsState.aiProvider == provider
                                    val label = if (provider == "local") "Local Model" else "Cloud API"
                                    FilterChip(
                                        selected = active,
                                        onClick = { settingsManager.setAiProvider(provider) },
                                        label = { Text(label, fontFamily = BeVietnamProFamily) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // Show AI Assistant Tab Toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Chat, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("AI Assistant", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Show Chat screen in navigation", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Switch(
                                checked = settingsState.aiFeaturesEnabled,
                                onCheckedChange = { settingsManager.setAiFeaturesEnabled(it) }
                            )
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // Edit Gemini API Key (if cloud selected)
                        if (settingsState.aiProvider == "google") {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showGeminiKeyModal = true },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(Icons.Default.Key, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Column {
                                        Text("Gemini API Key", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        val hasKey = settingsManager.getGeminiApiKey().isNotEmpty()
                                        Text(
                                            text = if (hasKey) "Key configured" else "Tap to configure key",
                                            fontFamily = BeVietnamProFamily,
                                            fontSize = 13.sp,
                                            color = if (hasKey) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        } else {
                            // Local model download button mock
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(Icons.Default.Memory, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Column {
                                        Text("Local Model Status", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text("Gemma 2B model", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Button(
                                    onClick = { Toast.makeText(context, "Local model downloaded & active", Toast.LENGTH_SHORT).show() },
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Download", fontFamily = BeVietnamProFamily)
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Currency & Regions Section Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Region & Localization",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Currency selection dropdown or custom text field for simplicity
                        var isCurrencyExpanded by remember { mutableStateOf(false) }
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { isCurrencyExpanded = !isCurrencyExpanded },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Icon(Icons.Default.AttachMoney, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Column {
                                        Text("Currency Code", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text(settingsState.currencyCode, fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                            if (isCurrencyExpanded) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    listOf("USD", "EUR", "GBP", "JPY").forEach { code ->
                                        val active = settingsState.currencyCode == code
                                        FilterChip(
                                            selected = active,
                                            onClick = {
                                                settingsManager.setCurrencyCode(code)
                                                isCurrencyExpanded = false
                                            },
                                            label = { Text(code, fontFamily = BeVietnamProFamily) },
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Custom Categories List Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        "Categories",
                        fontFamily = SpaceGroteskFamily,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    TextButton(onClick = { showCategoryModal = true }) {
                        Text("+ ADD CUSTOM", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold)
                    }
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        categories.take(6).forEach { cat ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(cat.emoji, fontSize = 16.sp)
                                }
                                Column {
                                    Text(cat.name, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    Text(
                                        text = cat.kind.replaceFirstChar { it.uppercase() } + if (cat.isLocked) " (Locked)" else "",
                                        fontFamily = BeVietnamProFamily,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. Data Export & Clear Section Card
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Data Management",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        // Export CSV
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val csvContent = onExportCsv()
                                    try {
                                        val file = File(context.cacheDir, "gemwallet_transactions.csv")
                                        file.writeText(csvContent)
                                        val uri: Uri = FileProvider.getUriForFile(
                                            context,
                                            "${context.packageName}.fileprovider",
                                            file
                                        )
                                        val shareIntent = Intent().apply {
                                            action = Intent.ACTION_SEND
                                            putExtra(Intent.EXTRA_STREAM, uri)
                                            type = "text/csv"
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        context.startActivity(Intent.createChooser(shareIntent, "Export Transactions CSV"))
                                    } catch (e: Exception) {
                                        Toast
                                            .makeText(context, "Export failed: ${e.message}", Toast.LENGTH_SHORT)
                                            .show()
                                    }
                                },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Share, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("Export Data", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Export ledger to .csv", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // Reset Settings
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showResetConfirm = true },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column {
                                    Text("Reset Settings", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("Reset configuration choices", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))

                        // Clear All Data
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showClearDataConfirm = true },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Default.DeleteForever, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                Column {
                                    Text("Clear All Data", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.error)
                                    Text("Wipe database & preferences", fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        // About Section
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "GemWallet v1.0.0",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        "100% Private, Native Android Finance Assistant",
                        fontFamily = BeVietnamProFamily,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Bottom space
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }
    }

    // Modal Dialog: Add Category
    if (showCategoryModal) {
        var categoryName by remember { mutableStateOf("") }
        var categoryEmoji by remember { mutableStateOf("") }

        Dialog(onDismissRequest = { showCategoryModal = false }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "New Custom Category",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    OutlinedTextField(
                        value = categoryName,
                        onValueChange = { categoryName = it },
                        label = { Text("Name", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("e.g. Gaming, Laundry...", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = categoryEmoji,
                        onValueChange = { categoryEmoji = it },
                        label = { Text("Emoji", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("🎮", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showCategoryModal = false }) {
                            Text("Cancel", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (categoryName.trim().isNotEmpty()) {
                                    val emoji = categoryEmoji.trim().ifEmpty { "🧩" }
                                    onAddCustomCategory(categoryName.trim(), emoji)
                                    showCategoryModal = false
                                }
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Add", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }

    // Modal Dialog: Gemini API Key Config
    if (showGeminiKeyModal) {
        var keyText by remember { mutableStateOf(settingsManager.getGeminiApiKey()) }

        Dialog(onDismissRequest = { showGeminiKeyModal = false }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "Configure Gemini API Key",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    OutlinedTextField(
                        value = keyText,
                        onValueChange = { keyText = it },
                        label = { Text("Gemini API Key", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("AIzaSy...", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(
                            onClick = {
                                settingsManager.deleteGeminiApiKey()
                                showGeminiKeyModal = false
                            },
                            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Delete Key", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        TextButton(onClick = { showGeminiKeyModal = false }) {
                            Text("Cancel", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (keyText.trim().isNotEmpty()) {
                                    settingsManager.setGeminiApiKey(keyText.trim())
                                    showGeminiKeyModal = false
                                }
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Save", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }

    // Modal Dialog: Set Passcode PIN
    if (showPasscodeModal) {
        var pinValue by remember { mutableStateOf("") }
        var errorMsg by remember { mutableStateOf<String?>(null) }

        Dialog(onDismissRequest = { showPasscodeModal = false }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Set 6-Digit Passcode",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    OutlinedTextField(
                        value = pinValue,
                        onValueChange = {
                            if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                                pinValue = it
                            }
                        },
                        label = { Text("Passcode", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("######", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    errorMsg?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showPasscodeModal = false }) {
                            Text("Cancel", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (pinValue.length == 6) {
                                    settingsManager.setPasscodePin(pinValue)
                                    showPasscodeModal = false
                                } else {
                                    errorMsg = "Passcode must be exactly 6 digits."
                                }
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Save", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }

    // Confirmation dialog: Reset settings
    if (showResetConfirm) {
        AlertDialog(
            onDismissRequest = { showResetConfirm = false },
            title = { Text("Reset Settings?") },
            text = { Text("This will restore default configurations but keep your transaction ledger history intact.") },
            confirmButton = {
                TextButton(onClick = {
                    settingsManager.resetSettings()
                    showResetConfirm = false
                }) {
                    Text("Reset")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Confirmation dialog: Wipe data
    if (showClearDataConfirm) {
        AlertDialog(
            onDismissRequest = { showClearDataConfirm = false },
            title = { Text("Clear All Data?") },
            text = { Text("Are you sure? This action is permanent and will completely delete your transaction ledger, categories, goals, and settings.") },
            confirmButton = {
                TextButton(onClick = {
                    onClearAllData()
                    showClearDataConfirm = false
                }) {
                    Text("Wipe Everything", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDataConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
