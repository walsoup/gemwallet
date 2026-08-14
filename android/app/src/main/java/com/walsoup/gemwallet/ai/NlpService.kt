package com.walsoup.gemwallet.ai

import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

// ========================================================================
// DOMAIN MODELS & RESULT TYPES
// ========================================================================

sealed interface AiProvider {
    data class Local(val modelName: String) : AiProvider
    data class Google(val apiKey: String, val modelName: String) : AiProvider
    data class HuggingFace(val token: String, val modelName: String) : AiProvider
}

data class AnalysisRequest(
    val transactions: List<TransactionEntity>,
    val categories: List<CategoryEntity>,
    val userQuestion: String?,
    val conversationHistory: List<String>,
    val currencyCode: String,
    val locale: Locale,
    val region: String,
    val maxTransactions: Int = 50
)

data class ParsedCommand(
    val type: CommandType,
    val amountCents: Long?,
    val categoryHint: String?,
    val note: String?,
    val name: String?,
    val interval: String?,
    val recurrenceType: String?,
    val startDate: Long?,
    val dueDate: Long?,
    val targetCents: Long?,
    val rawLine: String
) {
    enum class CommandType { ADD_EXPENSE, ADD_INCOME, ADD_RECURRING, ADD_GOAL, UNKNOWN }
}

sealed class NlpResult {
    data class Chunk(val text: String) : NlpResult()
    data class Command(val command: ParsedCommand) : NlpResult()
    data class Error(val message: String, val throwable: Throwable?) : NlpResult()
    object StreamComplete : NlpResult()
}

interface CommandExecutor {
    suspend fun execute(command: ParsedCommand): CommandExecutionResult
}

data class CommandExecutionResult(
    val success: Boolean,
    val message: String,
    val data: Any? = null
)

interface LocalModelService {
    fun streamAnalysis(prompt: String, modelName: String, cancellationToken: AtomicBoolean): Flow<String>
}

// ========================================================================
// MAIN SERVICE
// ========================================================================

class NlpService(
    private val geminiService: GeminiService,
    private val huggingFaceService: HuggingFaceService,
    private val localModelService: LocalModelService? = null,
    private val commandExecutor: CommandExecutor,
    private val maxPromptTokens: Int = 8000,
    private val maxHistoryMessages: Int = 10
) {

    fun streamAnalysis(request: AnalysisRequest): Flow<NlpResult> = flow {
        val provider = resolveProvider(request)
        
        // Validate provider requirements
        when (provider) {
            is AiProvider.Google -> if (provider.apiKey.isBlank()) {
                emit(NlpResult.Error("Gemini API key not configured", null))
                return@flow
            }
            is AiProvider.HuggingFace -> if (provider.token.isBlank()) {
                emit(NlpResult.Error("HuggingFace token not configured", null))
                return@flow
            }
            is AiProvider.Local -> if (localModelService == null) {
                emit(NlpResult.Error("Local model service not available", null))
                return@flow
            }
        }

        val prompt = buildPrompt(request)
        val tokenCount = estimateTokens(prompt)
        
        if (tokenCount > maxPromptTokens) {
            emit(NlpResult.Error("Conversation too long, please clear history", null))
            return@flow
        }

        val cancellationToken = AtomicBoolean(false)
        val fullResponse = AtomicReference<StringBuilder>(StringBuilder())

        try {
            val rawFlow: Flow<String> = when (provider) {
                is AiProvider.Google -> geminiService.streamAnalysis(
                    prompt = prompt,
                    apiKey = provider.apiKey,
                    modelName = provider.modelName
                )
                is AiProvider.HuggingFace -> huggingFaceService.streamModel(
                    prompt = prompt,
                    token = provider.token,
                    modelName = provider.modelName,
                    cancellationToken = cancellationToken
                ).map { it.text }
                is AiProvider.Local -> localModelService?.streamAnalysis(
                    prompt = prompt,
                    modelName = provider.modelName,
                    cancellationToken = cancellationToken
                ) ?: emptyFlow()
            }

            rawFlow.collect { text ->
                if (cancellationToken.get()) return@collect
                
                fullResponse.getAndUpdate { it.append(text) }
                
                if (text.isNotBlank()) {
                    emit(NlpResult.Chunk(text))
                }
            }

            val fallbackCommands = parseCommandsFromText(fullResponse.get().toString())
            fallbackCommands.forEach { emit(NlpResult.Command(it)) }

            emit(NlpResult.StreamComplete)

        } catch (e: Throwable) {
            emit(NlpResult.Error("Analysis failed: ${e.message}", e))
        }
    }

    // Allow external cancellation
    fun cancel() {
        // implemented via cancellationToken in streamAnalysis
    }

    private fun resolveProvider(request: AnalysisRequest): AiProvider {
        // This would come from settings in practice
        // For now, infer from request or use a default
        return AiProvider.Google(apiKey = "", modelName = "gemini-flash-lite-lastest") // placeholder
    }

    private fun buildPrompt(request: AnalysisRequest): String {
        val currencyFormat = NumberFormat.getCurrencyInstance(request.locale).apply {
            currency = java.util.Currency.getInstance(request.currencyCode)
        }

        val categoryMap = request.categories.associateBy({ it.id }, { it.name })
        val categoryList = request.categories.map { it.name }.joinToString(", ")

        // Take most recent transactions, format compactly
        val recentTx = request.transactions
            .take(request.maxTransactions)
            .map { tx ->
                val catName = categoryMap[tx.categoryId] ?: tx.categoryId
                val sign = if (tx.type == "expense") "-" else "+"
                "$sign${currencyFormat.format(tx.amountCents / 100.0)} | $catName | ${tx.note ?: "—"} | ${Date(tx.timestamp)}"
            }
            .joinToString("\n")

        val historyBlock = request.conversationHistory
            .takeLast(maxHistoryMessages)
            .joinToString("\n") { "HISTORY: $it" }

        return """
            You are GemWallet's AI financial assistant. Analyze the user's finances and help them manage money.

            CONTEXT:
            - Locale: ${request.locale.toLanguageTag()}
            - Region: ${request.region}
            - Currency: ${request.currencyCode} (${currencyFormat.currency.symbol})
            - Available categories: $categoryList
            - Current date: ${SimpleDateFormat("yyyy-MM-dd", request.locale).format(Date())}

            RECENT TRANSACTIONS (newest first):
            ${if (recentTx.isEmpty()) "No transactions yet." else recentTx}

            CONVERSATION HISTORY:
            ${if (historyBlock.isEmpty()) "None." else historyBlock}

            USER QUESTION:
            ${request.userQuestion ?: "General analysis requested."}

            INSTRUCTIONS:
            1. Respond naturally in the user's language. Use Markdown for formatting (tables, bold, lists).
            2. If the user wants to LOG DATA, use the function calling tools provided. Do NOT emit text commands.
            3. For analysis questions, provide insights: spending trends, top categories, savings rate, anomalies.
            4. Always end with ONE clear, actionable suggestion.
            5. Be concise but thorough. Use **bold** for key numbers.
        """.trimIndent()
    }

    private fun parseFunctionCall(name: String, args: Map<String, Any>): ParsedCommand? {
        return when (name) {
            "add_expense" -> ParsedCommand(
                type = ParsedCommand.CommandType.ADD_EXPENSE,
                amountCents = (args["amount_cents"] as? Number)?.toLong(),
                categoryHint = args["category_hint"] as? String,
                note = args["note"] as? String,
                name = null, interval = null, recurrenceType = null,
                startDate = null, dueDate = null, targetCents = null,
                rawLine = "function:$name"
            )
            "add_income" -> ParsedCommand(
                type = ParsedCommand.CommandType.ADD_INCOME,
                amountCents = (args["amount_cents"] as? Number)?.toLong(),
                categoryHint = args["category_hint"] as? String,
                note = args["note"] as? String,
                name = null, interval = null, recurrenceType = null,
                startDate = null, dueDate = null, targetCents = null,
                rawLine = "function:$name"
            )
            "add_recurring" -> ParsedCommand(
                type = ParsedCommand.CommandType.ADD_RECURRING,
                amountCents = (args["amount_cents"] as? Number)?.toLong(),
                categoryHint = args["category_hint"] as? String,
                note = null,
                name = args["name"] as? String,
                interval = args["interval"] as? String,
                recurrenceType = args["type"] as? String,
                startDate = (args["start_date"] as? Number)?.toLong(),
                dueDate = null, targetCents = null,
                rawLine = "function:$name"
            )
            "add_goal" -> ParsedCommand(
                type = ParsedCommand.CommandType.ADD_GOAL,
                amountCents = null,
                categoryHint = null,
                note = null,
                name = args["name"] as? String,
                interval = null, recurrenceType = null,
                startDate = null,
                dueDate = (args["due_date"] as? Number)?.toLong(),
                targetCents = (args["target_cents"] as? Number)?.toLong(),
                rawLine = "function:$name"
            )
            else -> null
        }
    }

    // Fallback regex parser for providers without function calling
    private fun parseCommandsFromText(text: String): List<ParsedCommand> {
        val commands = mutableListOf<ParsedCommand>()
        val lines = text.split("\n")

        // More robust patterns with named groups
        val patterns = mapOf(
            ParsedCommand.CommandType.ADD_EXPENSE to Regex(
                """(?i)ADD_EXPENSE\s*[:=]\s*(?<amount>[\d.,]+)\s+(?<category>\S+(?:\s+\S+)*)\s*(?<note>.*)"""
            ),
            ParsedCommand.CommandType.ADD_INCOME to Regex(
                """(?i)ADD_INCOME\s*[:=]\s*(?<amount>[\d.,]+)\s+(?<category>\S+(?:\s+\S+)*)\s*(?<note>.*)"""
            ),
            ParsedCommand.CommandType.ADD_RECURRING to Regex(
                """(?i)ADD_RECURRING\s*[:=]\s*(?<name>\S+(?:\s+\S+)*)\s+(?<amount>[\d.,]+)\s+(?<type>income|expense)\s+(?<interval>weekly|monthly)\s*(?<category>\S+(?:\s+\S+)*)?\s*(?<date>\d{4}-\d{2}-\d{2})?"""
            ),
            ParsedCommand.CommandType.ADD_GOAL to Regex(
                """(?i)ADD_GOAL\s*[:=]\s*(?<name>.+?)\s+(?<amount>[\d.,]+)\s*(?<date>\d{4}-\d{2}-\d{2})?"""
            )
        )

        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) continue

            for ((type, pattern) in patterns) {
                val match = pattern.matchEntire(trimmed)
                if (match != null) {
                    val amountStr = match.groups["amount"]?.value?.replace(",", "") ?: "0"
                    val amountCents = ((amountStr.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    
                    val command = when (type) {
                        ParsedCommand.CommandType.ADD_EXPENSE -> ParsedCommand(
                            type = type, amountCents = amountCents,
                            categoryHint = match.groups["category"]?.value?.trim(),
                            note = match.groups["note"]?.value?.trim()?.takeIf { it.isNotBlank() },
                            name = null, interval = null, recurrenceType = null,
                            startDate = null, dueDate = null, targetCents = null, rawLine = trimmed
                        )
                        ParsedCommand.CommandType.ADD_INCOME -> ParsedCommand(
                            type = type, amountCents = amountCents,
                            categoryHint = match.groups["category"]?.value?.trim(),
                            note = match.groups["note"]?.value?.trim()?.takeIf { it.isNotBlank() },
                            name = null, interval = null, recurrenceType = null,
                            startDate = null, dueDate = null, targetCents = null, rawLine = trimmed
                        )
                        ParsedCommand.CommandType.ADD_RECURRING -> ParsedCommand(
                            type = type, amountCents = amountCents,
                            categoryHint = match.groups["category"]?.value?.trim()?.takeIf { it.isNotBlank() },
                            note = null,
                            name = match.groups["name"]?.value?.trim(),
                            interval = match.groups["interval"]?.value?.lowercase(),
                            recurrenceType = match.groups["type"]?.value?.lowercase(),
                            startDate = parseDate(match.groups["date"]?.value),
                            dueDate = null, targetCents = null, rawLine = trimmed
                        )
                        ParsedCommand.CommandType.ADD_GOAL -> ParsedCommand(
                            type = type, amountCents = null,
                            categoryHint = null, note = null,
                            name = match.groups["name"]?.value?.trim(),
                            interval = null, recurrenceType = null,
                            startDate = null,
                            dueDate = parseDate(match.groups["date"]?.value),
                            targetCents = amountCents, // reuse amount field for target
                            rawLine = trimmed
                        )
                        ParsedCommand.CommandType.UNKNOWN -> null
                    }
                    if (command != null) {
                        commands.add(command)
                        break // one command per line
                    }
                }
            }
        }
        return commands
    }

    private fun parseDate(dateStr: String?): Long? {
        dateStr?.let {
            val formats = listOf("yyyy-MM-dd", "MM/dd/yyyy", "yyyy/MM/dd", "dd.MM.yyyy")
            for (fmt in formats) {
                try {
                    val sdf = SimpleDateFormat(fmt, Locale.US)
                    sdf.isLenient = false
                    return sdf.parse(it).time
                } catch (e: Exception) {}
            }
        }
        return null
    }

    private fun estimateTokens(text: String): Int {
        // Rough approximation: 1 token ≈ 4 chars for English
        return text.length / 4
    }
}

interface LocalModelService {
    fun streamAnalysis(
        prompt: String,
        modelName: String,
        cancellationToken: AtomicBoolean
    ): Flow<LocalChunk>
}

data class LocalChunk(val text: String)

// Default no-op executor (replace with real implementation)
class DefaultCommandExecutor : CommandExecutor {
    override suspend fun execute(command: ParsedCommand): CommandExecutionResult {
        return CommandExecutionResult(false, "No executor configured")
    }
}

// ========================================================================
// PROMPT BUILDER (extracted for testability)
// ========================================================================

class PromptBuilder(
    private val maxTransactions: Int = 50,
    private val maxHistoryMessages: Int = 10
) {
    fun build(request: AnalysisRequest): String {
        val currencyFormat = NumberFormat.getCurrencyInstance(request.locale).apply {
            currency = java.util.Currency.getInstance(request.currencyCode)
        }

        val categoryMap = request.categories.associateBy({ it.id }, { it.name })
        val categoryList = request.categories.map { it.name }.joinToString(", ")

        val recentTx = request.transactions
            .take(maxTransactions)
            .map { tx ->
                val catName = categoryMap[tx.categoryId] ?: tx.categoryId
                val sign = if (tx.type == "expense") "-" else "+"
                "$sign${currencyFormat.format(tx.amountCents / 100.0)} | $catName | ${tx.note ?: "—"} | ${Date(tx.timestamp)}"
            }
            .joinToString("\n")

        val historyBlock = request.conversationHistory
            .takeLast(maxHistoryMessages)
            .joinToString("\n") { "HISTORY: $it" }

        return """
            You are GemWallet's AI financial assistant. Analyze the user's finances and help them manage money.

            CONTEXT:
            - Locale: ${request.locale.toLanguageTag()}
            - Region: ${request.region}
            - Currency: ${request.currencyCode} (${currencyFormat.currency.symbol})
            - Available categories: $categoryList
            - Current date: ${SimpleDateFormat("yyyy-MM-dd", request.locale).format(Date())}

            RECENT TRANSACTIONS (newest first):
            ${if (recentTx.isEmpty()) "No transactions yet." else recentTx}

            CONVERSATION HISTORY:
            ${if (historyBlock.isEmpty()) "None." else historyBlock}

            USER QUESTION:
            ${request.userQuestion ?: "General analysis requested."}

            INSTRUCTIONS:
            1. Respond naturally in the user's language. Use Markdown for formatting (tables, bold, lists).
            2. If the user wants to LOG DATA, use the function calling tools provided. Do NOT emit text commands.
            3. For analysis questions, provide insights: spending trends, top categories, savings rate, anomalies.
            4. Always end with ONE clear, actionable suggestion.
            5. Be concise but thorough. Use **bold** for key numbers.
        """.trimIndent()
    }
}
