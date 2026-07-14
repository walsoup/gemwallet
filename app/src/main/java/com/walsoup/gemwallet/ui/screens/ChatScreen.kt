package com.walsoup.gemwallet.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import java.util.Locale
import com.walsoup.gemwallet.ai.NlpService
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import java.util.UUID

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String, // "user", "assistant", "system"
    val text: String
)

@OptIn(ExperimentalMaterial3Api::class)
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
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    var inputText by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }

    val messages = remember {
        mutableStateListOf(
            ChatMessage(role = "assistant", text = "Hello! I am your AI financial assistant. How can I help you today?")
        )
    }

    // Scroll to bottom when messages list size changes
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val hasKey = settingsManager.getGeminiApiKey().isNotEmpty()
    val activeModelLabel = if (settingsState.aiProvider == "local") {
        "Local • Gemma 2B"
    } else {
        "Cloud • Gemini"
    }

    // Callback implementation for parsed NLP actions
    val callbacks = remember {
        object : NlpService.CommandCallbacks {
            override suspend fun onAddExpense(amountCents: Long, categoryHint: String, note: String?) {
                val cleaned = categoryHint.trim().lowercase()
                val cat = categories.find { it.kind == "expense" && it.name.lowercase() == cleaned }
                val catId = cat?.id ?: "expense-misc"
                onAddExpense(amountCents, catId, note)
                
                messages.add(
                    ChatMessage(
                        role = "system",
                        text = "Logged expense: ${formatCurrencyAmount(amountCents, settingsState.currencyCode)} - ${note ?: categoryHint}"
                    )
                )
            }

            override suspend fun onAddIncome(amountCents: Long, categoryHint: String, note: String?) {
                val cleaned = categoryHint.trim().lowercase()
                val cat = categories.find { it.kind == "income" && it.name.lowercase() == cleaned }
                val catId = cat?.id ?: "income-custom"
                onAddIncome(amountCents, catId, note)

                messages.add(
                    ChatMessage(
                        role = "system",
                        text = "Logged income: ${formatCurrencyAmount(amountCents, settingsState.currencyCode)} - ${note ?: categoryHint}"
                    )
                )
            }

            override suspend fun onAddRecurring(
                name: String,
                amountCents: Long,
                type: String,
                interval: String,
                categoryHint: String?,
                startDate: Long?
            ) {
                val kind = if (type == "income") "income" else "expense"
                val cat = categoryHint?.let { hint ->
                    categories.find { it.kind == kind && it.name.lowercase() == hint.trim().lowercase() }
                }
                val catId = cat?.id ?: if (type == "income") "income-custom" else "expense-misc"
                
                onAddRecurring(name, amountCents, type, interval, catId, startDate ?: System.currentTimeMillis())

                messages.add(
                    ChatMessage(
                        role = "system",
                        text = "Added recurring $type: ${formatCurrencyAmount(amountCents, settingsState.currencyCode)} - $name ($interval)"
                    )
                )
            }

            override suspend fun onAddGoal(name: String, targetCents: Long, dueDate: Long?) {
                onAddGoal(name, targetCents, dueDate)

                messages.add(
                    ChatMessage(
                        role = "system",
                        text = "Added goal: $name - ${formatCurrencyAmount(targetCents, settingsState.currencyCode)}"
                    )
                )
            }

            override fun onSystemMessage(message: String) {
                messages.add(ChatMessage(role = "system", text = message))
            }
        }
    }

    fun onSend() {
        val text = inputText.trim()
        if (text.isEmpty() || isSending) return

        if (settingsState.aiProvider == "google" && !hasKey) {
            messages.add(ChatMessage(role = "assistant", text = "Please configure your Gemini API Key in Settings to talk to the Cloud model."))
            return
        }

        inputText = ""
        isSending = true

        messages.add(ChatMessage(role = "user", text = text))
        
        val assistantMsgId = UUID.randomUUID().toString()
        messages.add(ChatMessage(id = assistantMsgId, role = "assistant", text = "Thinking…"))

        scope.launch {
            var fullResponse = ""
            nlpService.streamFinancialAnalysis(
                transactions = transactions,
                categories = categories,
                provider = settingsState.aiProvider,
                apiKey = settingsManager.getGeminiApiKey(),
                token = settingsManager.getHuggingFaceToken(),
                modelName = settingsState.gemmaModel,
                userQuestion = text,
                currencyCode = settingsState.currencyCode,
                localeString = settingsState.language,
                region = settingsState.region,
                callbacks = callbacks
            )
            .catch { error ->
                val index = messages.indexOfFirst { it.id == assistantMsgId }
                if (index != -1) {
                    messages[index] = ChatMessage(
                        id = assistantMsgId,
                        role = "assistant",
                        text = "Error getting response: ${error.message}"
                    )
                }
                isSending = false
            }
            .collect { chunk ->
                // Clean the placeholder
                if (fullResponse.isEmpty()) {
                    fullResponse = chunk
                } else {
                    fullResponse += chunk
                }
                val index = messages.indexOfFirst { it.id == assistantMsgId }
                if (index != -1) {
                    messages[index] = ChatMessage(
                        id = assistantMsgId,
                        role = "assistant",
                        text = fullResponse
                    )
                }
            }

            isSending = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header Space padding + Provider badge
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(top = 48.dp, bottom = 12.dp),
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
                // Provider Badge
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
                            imageVector = if (settingsState.aiProvider == "local") Icons.Default.Memory else Icons.Default.Cloud,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = activeModelLabel,
                            fontFamily = BeVietnamProFamily,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Message List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 90.dp)
            ) {
                // Key notification
                if (settingsState.aiProvider == "google" && !hasKey) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                                Column {
                                    Text("No Gemini Key Saved.", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onErrorContainer)
                                    Text("Open settings to configure it.", fontFamily = BeVietnamProFamily, fontSize = 12.sp, color = MaterialTheme.colorScheme.onErrorContainer)
                                }
                            }
                        }
                    }
                }

                items(messages) { message ->
                    val isUser = message.role == "user"
                    val isSystem = message.role == "system"

                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = when {
                            isUser -> Alignment.CenterEnd
                            isSystem -> Alignment.Center
                            else -> Alignment.CenterStart
                        }
                    ) {
                        if (isSystem) {
                            // System log
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    message.text,
                                    fontFamily = BeVietnamProFamily,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            // User or Assistant Bubble
                            val bgBrush = if (isUser) {
                                Brush.linearGradient(
                                    colors = listOf(
                                        MaterialTheme.colorScheme.primary,
                                        MaterialTheme.colorScheme.tertiary
                                    )
                                )
                            } else null

                            Box(
                                modifier = Modifier
                                    .widthIn(max = 280.dp)
                                    .clip(
                                        RoundedCornerShape(
                                            topStart = 24.dp,
                                            topEnd = 24.dp,
                                            bottomStart = if (isUser) 24.dp else 4.dp,
                                            bottomEnd = if (isUser) 4.dp else 24.dp
                                        )
                                    )
                                    .then(
                                        if (bgBrush != null) Modifier.background(bgBrush)
                                        else Modifier.background(MaterialTheme.colorScheme.surfaceContainerLow)
                                    )
                                    .padding(horizontal = 18.dp, vertical = 12.dp)
                            ) {
                                Text(
                                    message.text,
                                    fontFamily = BeVietnamProFamily,
                                    fontSize = 15.sp,
                                    lineHeight = 22.sp,
                                    color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }

        // Floating Input Bar
        Card(
            shape = RoundedCornerShape(32.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.95f)
            ),
            elevation = CardDefaults.cardElevation(8.dp),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Ask me anything...", fontFamily = BeVietnamProFamily) },
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(max = 100.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent
                    )
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = { onSend() },
                    enabled = inputText.trim().isNotEmpty() && !isSending,
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.tertiary
                                )
                            )
                        )
                ) {
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

private fun formatCurrencyAmount(amountCents: Long, currencyCode: String): String {
    val amount = amountCents.toDouble() / 100.0
    return "$currencyCode ${String.format(Locale.US, "%.2f", amount)}"
}
