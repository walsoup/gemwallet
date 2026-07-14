package com.walsoup.gemwallet.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.components.formatCurrency
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import java.io.File
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settingsManager: SettingsManager = viewModel(),
    categories: List<CategoryEntity>,
    onAddCustomCategory: (name: String, emoji: String) -> Unit,
    onClearAllData: () -> Unit,
    onExportCsv: () -> String
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val settingsState by settingsManager.settingsState.collectAsStateWithLifecycle()

    // Modal states
    var showCategoryModal by remember { mutableStateOf(false) }
    var showGeminiKeyModal by remember { mutableStateOf(false) }
    var showPasscodeModal by remember { mutableStateOf(false) }
    var showRemovePasscodeConfirm by remember { mutableStateOf(false) }
    var showClearDataConfirm by remember { mutableStateOf(false) }
    var showResetConfirm by remember { mutableStateOf(false) }

    // Currency picker state
    var showCurrencyPicker by remember { mutableStateOf(false) }

    // Common currency list
    val currencyOptions = remember {
        listOf(
            "USD" to "US Dollar ($)",
            "EUR" to "Euro (€)",
            "GBP" to "British Pound (£)",
            "JPY" to "Japanese Yen (¥)",
            "CAD" to "Canadian Dollar (CA$)",
            "AUD" to "Australian Dollar (A$)",
            "CHF" to "Swiss Franc (CHF)",
            "CNY" to "Chinese Yuan (¥)",
            "INR" to "Indian Rupee (₹)",
            "BRL" to "Brazilian Real (R$)"
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item { Spacer(modifier = Modifier.height(48.dp)) }

        // Header
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

        // 1. Security Section
        item {
            SectionCard(title = "Security", icon = Icons.Default.Shield) {
                // Biometric Auth
                SettingsRow(
                    icon = Icons.Default.Fingerprint,
                    title = "Biometric Authentication",
                    subtitle = "Require Face ID / Touch ID"
                ) {
                    Switch(
                        checked = settingsState.biometricAuthEnabled,
                        onCheckedChange = { checked ->
                            if (checked) {
                                val biometricManager = BiometricManager.from(context)
                                val canAuthenticate = biometricManager.canAuthenticate(
                                    BiometricManager.Authenticators.BIOMETRIC_STRONG or
                                    BiometricManager.Authenticators.BIOMETRIC_WEAK
                                )
                                when (canAuthenticate) {
                                    BiometricManager.BIOMETRIC_SUCCESS -> {
                                        settingsManager.setBiometricAuthEnabled(true)
                                    }
                                    BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
                                    BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                                        Toast.makeText(context, "Biometric hardware not available", Toast.LENGTH_LONG).show()
                                    }
                                    BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                                        Toast.makeText(context, "No biometrics enrolled. Set up Face ID / Touch ID in system settings.", Toast.LENGTH_LONG).show()
                                    }
                                    else -> {
                                        Toast.makeText(context, "Biometric authentication unavailable", Toast.LENGTH_LONG).show()
                                    }
                                }
                            } else {
                                settingsManager.setBiometricAuthEnabled(false)
                            }
                        }
                    )
                }

                DividerItem()

                // Passcode
                if (settingsState.passcodeEnabled) {
                    SettingsRow(
                        icon = Icons.Default.Lock,
                        title = "Change Passcode",
                        subtitle = "Update your 6-digit PIN",
                        showChevron = true,
                        onClick = { showPasscodeModal = true; true }
                    )
                    DividerItem()
                    SettingsRow(
                        icon = Icons.Default.LockOpen,
                        title = "Remove Passcode",
                        subtitle = "Disable PIN authentication",
                        iconColor = MaterialTheme.colorScheme.error,
                        titleColor = MaterialTheme.colorScheme.error,
                        onClick = { showRemovePasscodeConfirm = true; true }
                    )
                } else {
                    SettingsRow(
                        icon = Icons.Default.Lock,
                        title = "Set Passcode",
                        subtitle = "Require a PIN to open",
                        showChevron = true,
                        onClick = { showPasscodeModal = true; true }
                    )
                }
            }
        }

        // 2. Appearance
        item {
            SectionCard(title = "Appearance", icon = Icons.Default.Palette) {
                SettingsRow(
                    icon = Icons.Default.Brightness6,
                    title = "Theme Preference",
                    subtitle = "Light, Dark, or System"
                ) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("light" to "Light", "dark" to "Dark", "system" to "System").forEach { (key, label) ->
                            val active = settingsState.themePreference == key
                            FilterChip(
                                selected = active,
                                onClick = { settingsManager.setThemePreference(key) },
                                label = { Text(label, fontFamily = BeVietnamProFamily) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                DividerItem()

                SettingsRow(
                    icon = Icons.Default.Brightness2,
                    title = "OLED True Black",
                    subtitle = "Force total black background"
                ) {
                    Switch(
                        checked = settingsState.oledTrueBlackEnabled,
                        onCheckedChange = { settingsManager.setOledTrueBlackEnabled(it) }
                    )
                }

                DividerItem()

                SettingsRow(
                    icon = Icons.Default.Compare,
                    title = "High Contrast Mode",
                    subtitle = "Maximum contrast outlines & text"
                ) {
                    Switch(
                        checked = settingsState.highContrastEnabled,
                        onCheckedChange = { settingsManager.setHighContrastEnabled(it) }
                    )
                }
            }
        }

        // 3. AI & Assistant
        item {
            SectionCard(title = "AI & Assistant", icon = Icons.Default.Psychology) {
                SettingsRow(
                    icon = Icons.Default.Cloud,
                    title = "Model Provider",
                    subtitle = "Choose between local or cloud"
                ) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("local" to "Local Model", "google" to "Cloud API").forEach { (key, label) ->
                            val active = settingsState.aiProvider == key
                            FilterChip(
                                selected = active,
                                onClick = { settingsManager.setAiProvider(key) },
                                label = { Text(label, fontFamily = BeVietnamProFamily) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                DividerItem()

                SettingsRow(
                    icon = Icons.Default.Chat,
                    title = "AI Assistant",
                    subtitle = "Show Chat screen in navigation"
                ) {
                    Switch(
                        checked = settingsState.aiFeaturesEnabled,
                        onCheckedChange = { settingsManager.setAiFeaturesEnabled(it) }
                    )
                }

                DividerItem()

                if (settingsState.aiProvider == "google") {
                    SettingsRow(
                        icon = Icons.Default.Key,
                        title = "Gemini API Key",
                        subtitle = if (settingsManager.getGeminiApiKey().isNotEmpty()) "Key configured" else "Tap to configure key",
                        subtitleColor = if (settingsManager.getGeminiApiKey().isNotEmpty()) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                        showChevron = true,
                        onClick = { showGeminiKeyModal = true; true }
                    )
                } else {
                    SettingsRow(
                        icon = Icons.Default.Memory,
                        title = "Local Model Status",
                        subtitle = settingsState.localModelId
                    ) {
                        Button(
                            onClick = {
                                scope.launch {
                                    // Simulate download
                                    try {
                                        // TODO: Actual model download logic
                                        settingsManager.setLocalModelDownloaded(true)
                                        settingsManager.setLocalModelId("gemma-4-e2b-it")
                                        Toast.makeText(context, "Local model downloaded & active", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Download failed: ${e.message}", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            enabled = !settingsState.localModelDownloaded,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                if (settingsState.localModelDownloaded) "Downloaded" else "Download",
                                fontFamily = BeVietnamProFamily
                            )
                        }
                    }
                }
            }
        }

        // 4. Region & Localization
        item {
            SectionCard(title = "Region & Localization", icon = Icons.Default.Public) {
                SettingsRow(
                    icon = Icons.Default.AttachMoney,
                    title = "Currency",
                    subtitle = currencyOptions.find { it.first == settingsState.currencyCode }?.second ?: settingsState.currencyCode,
                    showChevron = true,
                    onClick = { showCurrencyPicker = true; true }
                )
            }
        }

        // 5. Categories
        item {
            SectionCard(title = "Categories", icon = Icons.Default.Category, actionLabel = "+ ADD CUSTOM", onActionClick = { showCategoryModal = true }) {
                if (categories.isEmpty()) {
                    Text(
                        "No custom categories yet",
                        fontFamily = BeVietnamProFamily,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                        textAlign = TextAlign.Center
                    )
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        categories.forEach { cat ->
                            CategoryRow(category = cat)
                        }
                    }
                }
            }
        }

        // 6. Data Management
        item {
            SectionCard(title = "Data Management", icon = Icons.Default.Storage) {
                SettingsRow(
                    icon = Icons.Default.Share,
                    title = "Export Data",
                    subtitle = "Export ledger to .csv",
                    showChevron = true,
                    onClick = {
                        scope.launch {
                            try {
                                val csvContent = withContext(Dispatchers.IO) { onExportCsv() }
                                val file = withContext(Dispatchers.IO) {
                                    val f = File(context.cacheDir, "gemwallet_transactions.csv")
                                    f.writeText(csvContent)
                                    f
                                }
                                val uri = FileProvider.getUriForFile(
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
                                Toast.makeText(context, "Export failed: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                        true
                    }
                )

                DividerItem()

                SettingsRow(
                    icon = Icons.Default.Refresh,
                    title = "Reset Settings",
                    subtitle = "Restore default configurations (keeps transactions)",
                    showChevron = true,
                    onClick = { showResetConfirm = true; true }
                )

                DividerItem()

                SettingsRow(
                    icon = Icons.Default.DeleteForever,
                    title = "Clear All Data",
                    subtitle = "Wipe database & preferences permanently",
                    iconColor = MaterialTheme.colorScheme.error,
                    titleColor = MaterialTheme.colorScheme.error,
                    onClick = { showClearDataConfirm = true; true }
                )
            }
        }

        // About
        item {
            SectionCard(title = "") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
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

        item { Spacer(modifier = Modifier.height(48.dp)) }
    }

    // ===== MODALS =====

    // Add Category Modal
    if (showCategoryModal) CategoryModal(
        onDismiss = { showCategoryModal = false },
        onAdd = { name, emoji ->
            onAddCustomCategory(name, emoji)
            showCategoryModal = false
        }
    )

    // Gemini API Key Modal
    if (showGeminiKeyModal) GeminiKeyModal(
        currentKey = settingsManager.getGeminiApiKey(),
        onDismiss = { showGeminiKeyModal = false },
        onSave = { key ->
            settingsManager.setGeminiApiKey(key)
            showGeminiKeyModal = false
        },
        onDelete = {
            settingsManager.deleteGeminiApiKey()
            showGeminiKeyModal = false
        }
    )

    // Passcode Modal (Set / Change)
    if (showPasscodeModal) PasscodeModal(
        isChange = settingsState.passcodeEnabled,
        onDismiss = { showPasscodeModal = false },
        onSubmit = { newPin, oldPin ->
            val result = if (settingsState.passcodeEnabled) {
                settingsManager.setPasscodePin(newPin, oldPin)
            } else {
                settingsManager.setPasscodePin(newPin)
            }
            result.onSuccess { showPasscodeModal = false }
                .onFailure { e ->
                    Toast.makeText(context, e.message ?: "Failed to set passcode", Toast.LENGTH_SHORT).show()
                }
        }
    )

    // Remove Passcode Confirmation
    if (showRemovePasscodeConfirm) RemovePasscodeConfirmModal(
        onDismiss = { showRemovePasscodeConfirm = false },
        onConfirm = { currentPin ->
            settingsManager.removePasscode(currentPin)
                .onSuccess { showRemovePasscodeConfirm = false }
                .onFailure { e ->
                    Toast.makeText(context, e.message ?: "Incorrect passcode", Toast.LENGTH_SHORT).show()
                }
        }
    )

    // Currency Picker Modal
    if (showCurrencyPicker) CurrencyPickerModal(
        currentCode = settingsState.currencyCode,
        options = currencyOptions,
        onDismiss = { showCurrencyPicker = false },
        onSelect = { code ->
            settingsManager.setCurrencyCode(code)
            showCurrencyPicker = false
        }
    )

    // Reset Settings Confirmation
    if (showResetConfirm) ConfirmDialog(
        title = "Reset Settings?",
        message = "This will restore default configurations but keep your transaction ledger history intact.",
        confirmText = "Reset",
        onConfirm = {
            settingsManager.resetSettings()
            showResetConfirm = false
        },
        onDismiss = { showResetConfirm = false }
    )

    // Clear All Data Confirmation
    if (showClearDataConfirm) ConfirmDialog(
        title = "Clear All Data?",
        message = "Are you sure? This action is permanent and will completely delete your transaction ledger, categories, goals, and settings.",
        confirmText = "Wipe Everything",
        confirmColor = MaterialTheme.colorScheme.error,
        onConfirm = {
            onClearAllData()
            showClearDataConfirm = false
        },
        onDismiss = { showClearDataConfirm = false }
    )
}

// ===== REUSABLE COMPONENTS =====

@Composable
fun SectionCard(
    title: String,
    icon: androidx.compose.material.icons.filled.Icon? = null,
    actionLabel: String? = null,
    onActionClick: (() -> Unit)? = null,
    content: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (title.isNotBlank()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    icon?.let { Icon(it, contentDescription = null, tint = MaterialTheme.colorScheme.primary) }
                    Text(
                        title,
                        fontFamily = SpaceGroteskFamily,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                actionLabel?.let { label ->
                    TextButton(onClick = onActionClick!!) {
                        Text(label, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                content()
            }
        }
    }
}

@Composable
fun SettingsRow(
    icon: androidx.compose.material.icons.filled.Icon,
    title: String,
    subtitle: String,
    iconColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    titleColor: Color = MaterialTheme.colorScheme.onSurface,
    subtitleColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    showChevron: Boolean = false,
    onClick: (() -> Boolean)? = null,
    trailing: @Composable (() -> Unit)? = null
) {
    val modifier = Modifier
        .fillMaxWidth()
        .let { if (onClick != null) it.clickable { onClick() } else it }
        .padding(vertical = 4.dp)

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(icon, contentDescription = null, tint = iconColor)
            Column {
                Text(title, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = titleColor)
                Text(subtitle, fontFamily = BeVietnamProFamily, fontSize = 13.sp, color = subtitleColor)
            }
        }
        if (showChevron) {
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        trailing?.invoke()
    }
}

@Composable
fun DividerItem() {
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
}

@Composable
fun CategoryRow(category: CategoryEntity) {
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
            Text(category.emoji, fontSize = 16.sp)
        }
        Column {
            Text(category.name, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Medium, fontSize = 14.sp)
            Text(
                text = category.kind.replaceFirstChar { it.uppercase() } + if (category.isLocked) " (Locked)" else "",
                fontFamily = BeVietnamProFamily,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ===== MODAL COMPONENTS =====

@Composable
fun CategoryModal(onDismiss: () -> Unit, onAdd: (String, String) -> Unit) {
    var categoryName by remember { mutableStateOf("") }
    var categoryEmoji by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("New Custom Category", fontFamily = SpaceGroteskFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp)

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
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 1
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (categoryName.trim().isNotEmpty()) {
                                val emoji = categoryEmoji.trim().ifEmpty { "🧩" }
                                onAdd(categoryName.trim(), emoji)
                            }
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Add", fontFamily = BeVietnamProFamily) }
                }
            }
        }
    }
}

@Composable
fun GeminiKeyModal(
    currentKey: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
    onDelete: () -> Unit
) {
    var keyText by remember { mutableStateOf(currentKey) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Configure Gemini API Key", fontFamily = SpaceGroteskFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp)

                OutlinedTextField(
                    value = keyText,
                    onValueChange = { keyText = it },
                    label = { Text("Gemini API Key", fontFamily = BeVietnamProFamily) },
                    placeholder = { Text("AIzaSy...", fontFamily = BeVietnamProFamily) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(
                        onClick = onDelete,
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) { Text("Delete Key", fontFamily = BeVietnamProFamily) }
                    Spacer(modifier = Modifier.weight(1f))
                    TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { if (keyText.trim().isNotEmpty()) onSave(keyText.trim()) },
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Save", fontFamily = BeVietnamProFamily) }
                }
            }
        }
    }
}

@Composable
fun PasscodeModal(
    isChange: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (newPin: String, oldPin: String?) -> Unit
) {
    var pinValue by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var oldPin by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var step by remember { mutableStateOf(0) } // 0 = old pin (if change), 1 = new pin, 2 = confirm

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    if (isChange) "Change 6-Digit Passcode" else "Set 6-Digit Passcode",
                    fontFamily = SpaceGroteskFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )

                if (isChange && step == 0) {
                    OutlinedTextField(
                        value = oldPin,
                        onValueChange = {
                            if (it.length <= 6 && it.all { it.isDigit() }) oldPin = it
                        },
                        label = { Text("Current Passcode", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("######", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation()
                    )
                } else if (step == 1 || (!isChange && step == 0)) {
                    OutlinedTextField(
                        value = pinValue,
                        onValueChange = {
                            if (it.length <= 6 && it.all { it.isDigit() }) pinValue = it
                        },
                        label = { Text(if (isChange) "New Passcode" else "Passcode", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("######", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation()
                    )
                } else {
                    OutlinedTextField(
                        value = confirmPin,
                        onValueChange = {
                            if (it.length <= 6 && it.all { it.isDigit() }) confirmPin = it
                        },
                        label = { Text("Confirm Passcode", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("######", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation()
                    )
                }

                errorMsg?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            errorMsg = null
                            if (isChange && step == 0) {
                                if (oldPin.length == 6) step = 1 else errorMsg = "Enter current 6-digit passcode"
                            } else if (step == 1 || (!isChange && step == 0)) {
                                if (pinValue.length == 6) step = 2 else errorMsg = "Passcode must be exactly 6 digits"
                            } else {
                                if (confirmPin == pinValue) {
                                    onSubmit(pinValue, if (isChange) oldPin else null)
                                } else {
                                    errorMsg = "Passcodes don't match"
                                }
                            }
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) { Text(if (step == 2) "Save" else "Next", fontFamily = BeVietnamProFamily) }
                }
            }
        }
    }
}

@Composable
fun RemovePasscodeConfirmModal(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var pinValue by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Remove Passcode", fontFamily = SpaceGroteskFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text("Enter your current passcode to confirm removal", fontFamily = BeVietnamProFamily, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                OutlinedTextField(
                    value = pinValue,
                    onValueChange = {
                        if (it.length <= 6 && it.all { it.isDigit() }) pinValue = it
                    },
                    label = { Text("Current Passcode", fontFamily = BeVietnamProFamily) },
                    placeholder = { Text("######", fontFamily = BeVietnamProFamily) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    visualTransformation = PasswordVisualTransformation()
                )

                errorMsg?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (pinValue.length == 6) onConfirm(pinValue) else errorMsg = "Enter 6-digit passcode"
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Remove", fontFamily = BeVietnamProFamily) }
                }
            }
        }
    }
}

@Composable
fun CurrencyPickerModal(
    currentCode: String,
    options: List<Pair<String, String>>,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit
) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Select Currency", fontFamily = SpaceGroteskFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp)

                Column(
                    modifier = Modifier.fillMaxWidth().height(300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    androidx.compose.foundation.lazy.LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(options) { (code, label) ->
                            val selected = currentCode == code
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp, horizontal = 4.dp)
                                    .clickable { onSelect(code) }
                                    .background(if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent, RoundedCornerShape(12.dp)),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(label, fontFamily = BeVietnamProFamily, fontSize = 16.sp, color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface)
                                if (selected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
                }
            }
        }
    }
}

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String,
    confirmColor: Color = MaterialTheme.colorScheme.primary,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold) },
        text = { Text(message, fontFamily = BeVietnamProFamily) },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(contentColor = confirmColor)
            ) { Text(confirmText, fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", fontFamily = BeVietnamProFamily) }
        }
    )
}
