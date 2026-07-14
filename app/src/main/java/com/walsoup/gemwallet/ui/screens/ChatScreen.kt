package com.walsoup.gemwallet.ui.screens

import android.os.Build
import android.view.View
import android.view.WindowInsets
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.WindowInsets
import androidx.compose.ui.platform.WindowInsetsControllerCompat
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.PopupProperties
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.walsoup.gemwallet.R
import com.walsoup.gemwallet.ai.NlpService
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ========================================================================
// DOMAIN MODELS
// ========================================================================

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: MessageRole,
    val text: String,
    val timestamp: Long = System.currentTimeMillis()
) {
    companion object {
        fun user(text: String) = ChatMessage(role = MessageRole.User, text = text)
        fun assistant(text: String) = ChatMessage(role = MessageRole.Assistant, text = text)
        fun system(text: String) = ChatMessage(role = MessageRole.System, text = text)
        fun thinking() = ChatMessage(role = MessageRole.Assistant, text = "")
    }
}

enum class MessageRole { User, Assistant, System }

sealed class PendingCommand {
    data class AddExpense(
        val amountCents: Long,
        val categoryHint: String,
        val note: String?
    ) : PendingCommand()

    data class AddIncome(
        val amountCents: Long,
        val categoryHint: String,
        val note: String?
    ) : PendingCommand()

    data class AddRecurring(
        val name: String,
        val amountCents: Long,
        val type: String, // "income" | "expense"
        val interval: String,
        val categoryHint: String?,
        val startDate: Long
    ) : PendingCommand()

    data class AddGoal(
        val name: String,
        val targetCents: Long,
        val dueDate: Long?
    ) : PendingCommand()
}

data class ProviderInfo(
    val isLocal: Boolean,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)

enum class SendState { Idle, Sending, Streaming }

// ========================================================================
// VIEWMODEL
// ========================================================================

class ChatViewModel(
    private val nlpService: NlpService,
    private val settingsManager: SettingsManager,
    private val settingsState: SettingsManager.SettingsState,
    private val transactions: List<TransactionEntity>,
    private val categories: List<CategoryEntity>,
    private val onAddExpense: (amountCents: Long, categoryId: String, note: String?) -> Unit,
    private val onAddIncome: (amountCents: Long, categoryId: String, note: String?) -> Unit,
    private val onAddRecurring: (name: String, amountCents: Long, type: String, interval: String, categoryId: String, startDate: Long) -> Unit,
    private val onAddGoal: (name: String, targetCents: Long, dueDate: Long?) -> Unit
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(listOf(
        ChatMessage.assistant("Hello! I'm your AI financial assistant. How can I help you today?")
    ))
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _sendState = MutableStateFlow<SendState>(SendState.Idle)
    val sendState: StateFlow<SendState> = _sendState

    private val _pendingCommand = MutableStateFlow<PendingCommand?>(null)
    val pendingCommand: StateFlow<PendingCommand?> = _pendingCommand

    private val _providerInfo = MutableStateFlow<ProviderInfo>(computeProviderInfo())
    val providerInfo: StateFlow<ProviderInfo> = _providerInfo

    private val _hasKey = MutableStateFlow(settingsManager.getGeminiApiKey().isNotEmpty())
    val hasKey: StateFlow<Boolean> = _hasKey

    private val _keyWarningVisible = MutableStateFlow(false)
    val keyWarningVisible: StateFlow<Boolean> = _keyWarningVisible

    private val categoryCache = buildCategoryCache()
    private val currencyFormatter = CurrencyFormatter(settingsState.currencyCode, settingsState.language)
    private var currentAssistantMessageId: String? = null
    private var streamingResponse = ""

    private fun computeProviderInfo(): ProviderInfo {
        val isLocal = settingsState.aiProvider == "local"
        return ProviderInfo(
            isLocal = isLocal,
            label = if (isLocal) "Local • Gemma 2B" else "Cloud • Gemini",
            icon = if (isLocal) Icons.Default.Memory else Icons.Default.Cloud
        )
    }

    private fun buildCategoryCache(): Map<String, CategoryEntity> {
        val map = ConcurrentHashMap<String, CategoryEntity>()
        categories.forEach { cat ->
            val key = "${cat.kind}:${normalizeName(cat.name)}"
            map[key] = cat
            // also index by just name for fallback
            map[normalizeName(cat.name)] = cat
        }
        return map
    }

    private fun normalizeName(name: String): String = name.trim().lowercase(Locale.getDefault())

    private fun findCategory(kind: String, hint: String?): String {
        hint?.let { normalized ->
            val exactKey = "$kind:$normalized"
            categoryCache[exactKey]?.id?.let { return it }
            // fuzzy fallback: contains match
            categoryCache.entries.firstOrNull { (key, cat) ->
                cat.kind == kind && (key.contains(normalized) || normalized.contains(key.replace("$kind:", "")))
            }?.value?.id?.let { return it }
        }
        return if (kind == "income") "income-custom" else "expense-misc"
    }

    fun onSettingsChanged(newSettingsState: SettingsManager.SettingsState) {
        _providerInfo.value = computeProviderInfo()
        _hasKey.value = settingsManager.getGeminiApiKey().isNotEmpty()
    }

    fun sendMessage(text: String) {
        val trimmed = text.trim()
        if (trimmed.isEmpty() || _sendState.value != SendState.Idle) return

        val provider = settingsState.aiProvider
        val apiKey = settingsManager.getGeminiApiKey()

        if (provider == "google" && apiKey.isEmpty()) {
            _keyWarningVisible.value = true
            _messages.value = _messages.value + ChatMessage.system("Please configure your Gemini API Key in Settings to talk to the Cloud model.")
            return
        }

        _keyWarningVisible.value = false
        _sendState.value = SendState.Sending

        val userMessage = ChatMessage.user(trimmed)
        val assistantMessage = ChatMessage.thinking().copy(id = UUID.randomUUID().toString())
        currentAssistantMessageId = assistantMessage.id
        streamingResponse = ""

        _messages.value = _messages.value + userMessage + assistantMessage
        _sendState.value = SendState.Streaming

        viewModelScope.launch {
            val channel = Channel<String>(Channel.UNLIMITED)
            val errorHolder = AtomicReference<Throwable?>()

            // Start streaming in background
            viewModelScope.launch {
                try {
                    nlpService.streamFinancialAnalysis(
                        transactions = transactions,
                        categories = categories,
                        provider = provider,
                        apiKey = apiKey,
                        token = settingsManager.getHuggingFaceToken(),
                        modelName = settingsState.gemmaModel,
                        userQuestion = trimmed,
                        currencyCode = settingsState.currencyCode,
                        localeString = settingsState.language,
                        region = settingsState.region,
                        callbacks = callbacks,
                        conversationHistory = _messages.value
                            .filter { it.role != MessageRole.System }
                            .takeLast(10) // limit context window
                            .map { "${it.role.name.toLowerCase()}: ${it.text}" }
                            .joinToString("\n")
                    ).collect { chunk ->
                        channel.send(chunk)
                    }
                    channel.close()
                } catch (e: Throwable) {
                    errorHolder.set(e)
                    channel.close(e)
                }
            }

            // Consume chunks and update UI
            var firstChunk = true
            for (chunk in channel) {
                if (firstChunk) {
                    streamingResponse = chunk
                    firstChunk = false
                } else {
                    streamingResponse += chunk
                }
                updateAssistantMessage(streamingResponse)
            }

            val error = errorHolder.get()
            if (error != null) {
                updateAssistantMessage("Error getting response: ${error.message}")
            }

            _sendState.value = SendState.Idle
            currentAssistantMessageId = null
        }
    }

    private val callbacks = object : NlpService.CommandCallbacks {
        override suspend fun onAddExpense(amountCents: Long, categoryHint: String, note: String?) {
            _pendingCommand.value = PendingCommand.AddExpense(amountCents, categoryHint, note)
        }

        override suspend fun onAddIncome(amountCents: Long, categoryHint: String, note: String?) {
            _pendingCommand.value = PendingCommand.AddIncome(amountCents, categoryHint, note)
        }

        override suspend fun onAddRecurring(
            name: String, amountCents: Long, type: String, interval: String,
            categoryHint: String?, startDate: Long?
        ) {
            _pendingCommand.value = PendingCommand.AddRecurring(
                name, amountCents, type, interval, categoryHint, startDate ?: System.currentTimeMillis()
            )
        }

        override suspend fun onAddGoal(name: String, targetCents: Long, dueDate: Long?) {
            _pendingCommand.value = PendingCommand.AddGoal(name, targetCents, dueDate)
        }

        override fun onSystemMessage(message: String) {
            _messages.value = _messages.value + ChatMessage.system(message)
        }
    }

    private fun updateAssistantMessage(text: String) {
        val id = currentAssistantMessageId ?: return
        _messages.value = _messages.value.map { msg ->
            if (msg.id == id) msg.copy(text = text) else msg
        }
    }

    fun confirmPendingCommand() {
        val cmd = _pendingCommand.value ?: return
        when (cmd) {
            is PendingCommand.AddExpense -> {
                val catId = findCategory("expense", cmd.categoryHint)
                onAddExpense(cmd.amountCents, catId, cmd.note)
                _messages.value = _messages.value + ChatMessage.system(
                    "Logged expense: ${currencyFormatter.format(cmd.amountCents)} - ${cmd.note ?: cmd.categoryHint}"
                )
            }
            is PendingCommand.AddIncome -> {
                val catId = findCategory("income", cmd.categoryHint)
                onAddIncome(cmd.amountCents, catId, cmd.note)
                _messages.value = _messages.value + ChatMessage.system(
                    "Logged income: ${currencyFormatter.format(cmd.amountCents)} - ${cmd.note ?: cmd.categoryHint}"
                )
            }
            is PendingCommand.AddRecurring -> {
                val kind = if (cmd.type == "income") "income" else "expense"
                val catId = findCategory(kind, cmd.categoryHint)
                onAddRecurring(cmd.name, cmd.amountCents, cmd.type, cmd.interval, catId, cmd.startDate)
                _messages.value = _messages.value + ChatMessage.system(
                    "Added recurring ${cmd.type}: ${currencyFormatter.format(cmd.amountCents)} - ${cmd.name} (${cmd.interval})"
                )
            }
            is PendingCommand.AddGoal -> {
                onAddGoal(cmd.name, cmd.targetCents, cmd.dueDate)
                _messages.value = _messages.value + ChatMessage.system(
                    "Added goal: ${cmd.name} - ${currencyFormatter.format(cmd.targetCents)}"
                )
            }
        }
        _pendingCommand.value = null
    }

    fun cancelPendingCommand() {
        _messages.value = _messages.value + ChatMessage.system("Command cancelled by user.")
        _pendingCommand.value = null
    }

    fun dismissKeyWarning() {
        _keyWarningVisible.value = false
    }

    fun clearHistory() {
        _messages.value = listOf(
            ChatMessage.assistant("Hello! I'm your AI financial assistant. How can I help you today?")
        )
    }
}

// ========================================================================
// UTILITY CLASSES
// ========================================================================

class CurrencyFormatter(private val currencyCode: String, private val language: String) {
    private val locale = Locale.forLanguageTag(language)
    private val formatter = NumberFormat.getCurrencyInstance(locale).apply {
        currency = java.util.Currency.getInstance(currencyCode)
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }

    fun format(amountCents: Long): String {
        val amount = amountCents / 100.0
        return formatter.format(amount)
    }
}

class AtomicReference<T>(initialValue: T? = null) {
    private var value: T? = initialValue
    fun get(): T? = value
    fun set(newValue: T?) { value = newValue }
}

// ========================================================================
// COMPOSABLES - MESSAGE BUBBLE
// ========================================================================

@Composable
fun ChatMessageBubble(
    message: ChatMessage,
    userGradientBrush: Brush,
    onLongClick: (() -> Unit)? = null
) {
    val isUser = message.role == MessageRole.User
    val isSystem = message.role == MessageRole.System
    val isThinking = message.role == MessageRole.Assistant && message.text.isEmpty()

    val bubbleBackground = if (isUser) userGradientBrush else null
    val bubbleColor = if (isUser) null else MaterialTheme.colorScheme.surfaceContainerLow
    val textColor = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val systemColor = MaterialTheme.colorScheme.onSurfaceVariant

    val alignment = when {
        isUser -> Alignment.CenterEnd
        isSystem -> Alignment.CenterHorizontally
        else -> Alignment.CenterStart
    }

    val borderRadius = when {
        isUser -> RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomStart = 24.dp, bottomEnd = 4.dp)
        isSystem -> RoundedCornerShape(14.dp)
        else -> RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomStart = 4.dp, bottomEnd = 24.dp)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onLongClick != null) Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onLongClick = { onLongClick?.invoke(); true },
                    onClick = {}
                ) else Modifier),
        contentAlignment = alignment
    ) {
        if (isSystem) {
            Box(
                modifier = Modifier
                    .wrapContentSize()
                    .background(MaterialTheme.colorScheme.surfaceContainerHighest, RoundedCornerShape(14.dp))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = message.text,
                    fontFamily = BeVietnamProFamily,
                    fontSize = 13.sp,
                    color = systemColor,
                    textAlign = TextAlign.Center
                )
            }
        } else if (isThinking) {
            ThinkingIndicator(
                modifier = Modifier
                    .clip(borderRadius)
                    .then(if (bubbleBackground != null) Modifier.background(bubbleBackground) else Modifier.background(bubbleColor!!))
                    .padding(horizontal = 18.dp, vertical = 12.dp)
            )
        } else {
            Box(
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .clip(borderRadius)
                    .then(if (bubbleBackground != null) Modifier.background(bubbleBackground) else Modifier.background(bubbleColor!!))
                    .padding(horizontal = 18.dp, vertical = 12.dp)
                    .semantics {
                        role = androidx.compose.ui.semantics.Role.Paragraph
                        contentDescription = when {
                            isUser -> "You said: ${message.text}"
                            else -> "Assistant said: ${message.text}"
                        }
                    }
            ) {
                Text(
                    text = AnnotatedString(message.text),
                    fontFamily = BeVietnamProFamily,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                    color = textColor
                )
            }
        }
    }
}

@Composable
fun ThinkingIndicator(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .width(60.dp)
            .height(36.dp)
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(3) { index ->
                AnimatedThinkingDot(index = index)
            }
        }
    }
}

@Composable
fun AnimatedThinkingDot(index: Int) {
    val infiniteTransition = rememberInfiniteTransition(label = "thinking_dots")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, delayMillis = index * 150, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot_scale"
    )
    val color by infiniteTransition.animateColor(
        initialValue = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.4f),
        targetValue = MaterialTheme.colorScheme.onPrimary,
        animationSpec = infiniteRepeatable(
            animation = tween(600, delayMillis = index * 150, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dot_color"
    )

    Box(
        modifier = Modifier
            .size(8.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .background(color, CircleShape)
    )
}

// ========================================================================
// COMPOSABLES - INPUT BAR
// ========================================================================

@Composable
fun ChatInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    sendState: SendState,
    focusRequester: FocusRequester,
    gradientBrush: Brush
) {
    val isDisabled = sendState != SendState.Idle || text.trim().isEmpty()

    Card(
        shape = RoundedCornerShape(32.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.95f)
        ),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .windowInsetsPadding(WindowInsets.ime)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = text,
                onValueChange = onTextChange,
                placeholder = { Text("Ask me anything...", fontFamily = BeVietnamProFamily, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp, max = 120.dp)
                    .fillMaxWidth()
                    .focusRequester(focusRequester),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                    cursorColor = MaterialTheme.colorScheme.primary,
                    textColor = MaterialTheme.colorScheme.onSurface,
                    placeholderTextColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                ),
                keyboardActions = KeyboardActions(
                    onDone = { onSend() }
                ),
                keyboardOptions = KeyboardOptions(
                    imeAction = androidx.compose.ui.text.input.ImeAction.Done,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Text
                ),
                maxLines = 5,
                singleLine = false
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = { onSend() },
                enabled = !isDisabled,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(gradientBrush)
                    .alpha(if (isDisabled) 0.5f else 1f)
            ) {
                if (sendState == SendState.Streaming) {
                    // Stop icon or just keep send icon
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Stop",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

// ========================================================================
// COMPOSABLES - PROVIDER BADGE
// ========================================================================

@Composable
fun ProviderBadge(providerInfo: ProviderInfo) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = providerInfo.icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(14.dp)
            )
            Text(
                text = providerInfo.label,
                fontFamily = BeVietnamProFamily,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

// ========================================================================
// COMPOSABLES - KEY WARNING CARD
// ========================================================================

@Composable
fun KeyWarningCard(onDismiss: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize()
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
            Column(modifier = Modifier.weight(1f)) {
                Text("No Gemini Key Saved.", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onErrorContainer)
                Text("Open settings to configure it.", fontFamily = BeVietnamProFamily, fontSize = 12.sp, color = MaterialTheme.colorScheme.onErrorContainer)
            }
            IconButton(onClick = onDismiss) {
                Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = MaterialTheme.colorScheme.onErrorContainer)
            }
        }
    }
}

// ========================================================================
// COMPOSABLES - COMMAND CONFIRMATION DIALOG
// ========================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandConfirmationDialog(
    command: PendingCommand,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
    currencyFormatter: CurrencyFormatter
) {
    val detailText = remember(command) {
        when (command) {
            is PendingCommand.AddExpense -> {
                "Add Expense: ${currencyFormatter.format(command.amountCents)} — ${command.note ?: command.categoryHint} (${command.categoryHint})"
            }
            is PendingCommand.AddIncome -> {
                "Add Income: ${currencyFormatter.format(command.amountCents)} — ${command.note ?: command.categoryHint} (${command.categoryHint})"
            }
            is PendingCommand.AddRecurring -> {
                "Add Recurring ${command.type.capitalize()}: ${currencyFormatter.format(command.amountCents)} — ${command.name} (${command.interval})"
            }
            is PendingCommand.AddGoal -> {
                "Add Savings Goal: ${command.name} of ${currencyFormatter.format(command.targetCents)}"
            }
        }
    }

    AlertDialog(
        onDismissRequest = onCancel,
        title = {
            Text(text = "Confirm Action", fontFamily = SpaceGroteskFamily, fontWeight = FontWeight.Bold)
        },
        text = {
            Column {
                Text(
                    text = "The AI wants to execute the following command. Do you confirm this action?",
                    fontFamily = BeVietnamProFamily,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = detailText,
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 15.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = onConfirm, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                Text("Confirm", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onCancel) {
                Text("Cancel", fontFamily = BeVietnamProFamily)
            }
        },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = true)
    )
}

// ========================================================================
// COMPOSABLES - HEADER
// ========================================================================

@Composable
fun ChatHeader(providerInfo: ProviderInfo, windowInsets: WindowInsets) {
    val statusBarHeight = remember(windowInsets) {
        windowInsets.getInsets(WindowInsets.Type.statusBars()).top
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = statusBarHeight.coerceAtLeast(16.dp), bottom = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "AI Assistant",
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        ProviderBadge(providerInfo)
    }
}

// ========================================================================
// MAIN SCREEN COMPOSABLE
// ========================================================================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    transactions: List<TransactionEntity>,
    categories: List<CategoryEntity>,
    settingsState: SettingsManager.SettingsState,
    settingsManager: SettingsManager,
    nlpService: NlpService,
    onAddExpense: (amountCents: Long, categoryId: String, note: String?) -> Unit,
    onAddIncome: (amountCents: Long, categoryId: String, note: String?) -> Unit,
    onAddRecurring: (name: String, amountCents: Long, type: String, interval: String, categoryId: String, startDate: Long) -> Unit,
    onAddGoal: (name: String, targetCents: Long, dueDate: Long?) -> Unit
) {
    val viewModel: ChatViewModel = viewModel(
        factory = ChatViewModelFactory(
            nlpService, settingsManager, settingsState,
            transactions, categories,
            onAddExpense, onAddIncome, onAddRecurring, onAddGoal
        )
    )

    val messages by viewModel.messages.collectAsStateWithLifecycle()
    val sendState by viewModel.sendState.collectAsStateWithLifecycle()
    val pendingCommand by viewModel.pendingCommand.collectAsStateWithLifecycle()
    val providerInfo by viewModel.providerInfo.collectAsStateWithLifecycle()
    val hasKey by viewModel.hasKey.collectAsStateWithLifecycle()
    val keyWarningVisible by viewModel.keyWarningVisible.collectAsStateWithLifecycle()

    val listState = rememberLazyListState()
    val focusRequester = remember { FocusRequester() }
    val userGradientBrush = remember {
        Brush.linearGradient(
            colors = listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary),
            start = androidx.compose.ui.geometry.Offset.Zero,
            end = androidx.compose.ui.geometry.Offset(280f, 0f)
        )
    }
    val currencyFormatter = remember(settingsState.currencyCode, settingsState.language) {
        CurrencyFormatter(settingsState.currencyCode, settingsState.language)
    }
    val view = LocalView.current
    val windowInsets = remember(view) { WindowCompat.getInsetsController(view.window, view).windowInsets }
    var inputText by remember { mutableStateOf("") }

    // Auto-scroll to bottom on new messages
    LaunchedEffect(messages.size, listState.layoutInfo.visibleItemsInfo.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    // Sync settings changes
    LaunchedEffect(settingsState) {
        viewModel.onSettingsChanged(settingsState)
    }

    // Handle hardware back press for dialog
    BackHandler(enabled = pendingCommand != null) {
        viewModel.cancelPendingCommand()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ChatHeader(providerInfo, windowInsets)

            // Message List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                // Key warning
                if (keyWarningVisible) {
                    item {
                        KeyWarningCard(onDismiss = { viewModel.dismissKeyWarning() })
                    }
                }

                items(messages, key = { it.id }) { message ->
                    ChatMessageBubble(
                        message = message,
                        userGradientBrush = userGradientBrush
                    ) { /* long click handler if needed */ }
                }
            }
        }

        // Floating Input Bar
        ChatInputBar(
            text = inputText,
            onTextChange = { inputText = it },
            onSend = { viewModel.sendMessage(inputText) },
            sendState = sendState,
            focusRequester = focusRequester,
            gradientBrush = userGradientBrush
        )

        // Confirmation Dialog
        pendingCommand?.let { cmd ->
            CommandConfirmationDialog(
                command = cmd,
                onConfirm = { viewModel.confirmPendingCommand() },
                onCancel = { viewModel.cancelPendingCommand() },
                currencyFormatter = currencyFormatter
            )
        }
    }
}

// ========================================================================
// VIEWMODEL FACTORY
// ========================================================================

class ChatViewModelFactory(
    private val nlpService: NlpService,
    private val settingsManager: SettingsManager,
    private val settingsState: SettingsManager.SettingsState,
    private val transactions: List<TransactionEntity>,
    private val categories: List<CategoryEntity>,
    private val onAddExpense: (Long, String, String?) -> Unit,
    private val onAddIncome: (Long, String, String?) -> Unit,
    private val onAddRecurring: (String, Long, String, String, String, Long) -> Unit,
    private val onAddGoal: (String, Long, Long?) -> Unit
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel?> create(modelClass: Class<T>): T {
        return ChatViewModel(
            nlpService, settingsManager, settingsState,
            transactions, categories,
            onAddExpense, onAddIncome, onAddRecurring, onAddGoal
        ) as T
    }
}
