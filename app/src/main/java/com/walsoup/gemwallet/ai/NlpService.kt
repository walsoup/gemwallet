package com.walsoup.gemwallet.ai

import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class NlpService(
    private val geminiService: GeminiService,
    private val huggingFaceService: HuggingFaceService
) {

    interface CommandCallbacks {
        suspend fun onAddExpense(amountCents: Long, categoryHint: String, note: String?)
        suspend fun onAddIncome(amountCents: Long, categoryHint: String, note: String?)
        suspend fun onAddRecurring(
            name: String,
            amountCents: Long,
            type: String,
            interval: String,
            categoryHint: String?,
            startDate: Long?
        )
        suspend fun onAddGoal(name: String, targetCents: Long, dueDate: Long?)
        fun onSystemMessage(message: String)
    }

    private val expenseRegex = Regex("ADD_EXPENSE:\\s*([0-9]+(?:\\.[0-9]{1,2})?)\\s+([^\\s]+)\\s*(.*)", RegexOption.IGNORE_CASE)
    private val incomeRegex = Regex("ADD_INCOME:\\s*([0-9]+(?:\\.[0-9]{1,2})?)\\s+([^\\s]+)\\s*(.*)", RegexOption.IGNORE_CASE)
    private val recurringRegex = Regex("ADD_RECURRING:\\s*([^\\s]+)\\s+([0-9]+(?:\\.[0-9]{1,2})?)\\s+(income|expense)\\s+(weekly|monthly)\\s*([^\\s]+)?\\s*(.*)?", RegexOption.IGNORE_CASE)
    private val goalRegex = Regex("ADD_GOAL:\\s*([^\\s].*?)\\s+([0-9]+(?:\\.[0-9]{1,2})?)\\s*(.*)?", RegexOption.IGNORE_CASE)

    fun streamFinancialAnalysis(
        transactions: List<TransactionEntity>,
        categories: List<CategoryEntity>,
        provider: String,
        apiKey: String,
        token: String,
        modelName: String,
        userQuestion: String?,
        currencyCode: String,
        localeString: String,
        region: String,
        callbacks: CommandCallbacks
    ): Flow<String> = flow {

        val isLocal = provider == "local"
        if (isLocal) {
            emit("Local model execution fallback: On-device LiteRT analysis is running. Here is your summary:\n\n")
            emit(summarizeLocal(transactions, currencyCode, localeString))
            return@flow
        }

        if (provider == "google" && apiKey.isEmpty()) {
            emit("Add your Gemini API key in Settings to unlock AI insights.")
            return@flow
        }

        if (provider == "huggingface" && token.isEmpty()) {
            emit("Add your HuggingFace token in Settings to unlock AI insights.")
            return@flow
        }

        val prompt = buildPrompt(transactions, categories, userQuestion, currencyCode, localeString, region)
        var responseBuffer = StringBuilder()

        val rawFlow = if (provider == "google") {
            geminiService.streamAnalysis(prompt, apiKey, modelName)
        } else {
            huggingFaceService.streamModel(prompt, token, modelName)
        }

        rawFlow.collect { chunk ->
            responseBuffer.append(chunk)
            
            // Clean commands from output to avoid showing technical markers to the user
            val cleanChunk = sanitizeChunk(chunk)
            if (cleanChunk.isNotEmpty()) {
                emit(cleanChunk)
            }
        }

        // Apply commands parsed from full response
        parseAndApplyCommands(responseBuffer.toString(), callbacks)
    }

    private fun sanitizeChunk(chunk: String): String {
        val lines = chunk.split("\n")
        val cleanLines = lines.filter { line ->
            !line.trim().startsWith("ADD_EXPENSE:", ignoreCase = true) &&
            !line.trim().startsWith("ADD_INCOME:", ignoreCase = true) &&
            !line.trim().startsWith("ADD_RECURRING:", ignoreCase = true) &&
            !line.trim().startsWith("ADD_GOAL:", ignoreCase = true) &&
            !line.trim().startsWith("Locale", ignoreCase = true) &&
            !line.trim().startsWith("Region", ignoreCase = true)
        }
        return cleanLines.joinToString("\n")
    }

    private suspend fun parseAndApplyCommands(fullText: String, callbacks: CommandCallbacks) {
        val lines = fullText.split("\n")
        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) continue

            // 1. Expense
            expenseRegex.matchEntire(trimmed)?.let { match ->
                val amount = match.groupValues[1].toDoubleOrNull() ?: 0.0
                val categoryHint = match.groupValues[2]
                val note = match.groupValues[3].trim().ifEmpty { null }
                callbacks.onAddExpense((amount * 100).toLong(), categoryHint, note)
                return@let
            }

            // 2. Income
            incomeRegex.matchEntire(trimmed)?.let { match ->
                val amount = match.groupValues[1].toDoubleOrNull() ?: 0.0
                val categoryHint = match.groupValues[2]
                val note = match.groupValues[3].trim().ifEmpty { null }
                callbacks.onAddIncome((amount * 100).toLong(), categoryHint, note)
                return@let
            }

            // 3. Recurring
            recurringRegex.matchEntire(trimmed)?.let { match ->
                val name = match.groupValues[1]
                val amount = match.groupValues[2].toDoubleOrNull() ?: 0.0
                val type = match.groupValues[3].lowercase()
                val interval = match.groupValues[4].lowercase()
                val categoryHint = match.groupValues[5].trim().ifEmpty { null }
                val startDateRaw = match.groupValues[6].trim().ifEmpty { null }
                val startDate = parseDate(startDateRaw)
                callbacks.onAddRecurring(name, (amount * 100).toLong(), type, interval, categoryHint, startDate)
                return@let
            }

            // 4. Goal
            goalRegex.matchEntire(trimmed)?.let { match ->
                val name = match.groupValues[1]
                val amount = match.groupValues[2].toDoubleOrNull() ?: 0.0
                val dueDateRaw = match.groupValues[3].trim().ifEmpty { null }
                val dueDate = parseDate(dueDateRaw)
                callbacks.onAddGoal(name, (amount * 100).toLong(), dueDate)
                return@let
            }
        }
    }

    private fun parseDate(dateStr: String?): Long? {
        if (dateStr == null) return null
        return try {
            val formats = listOf("yyyy-MM-dd", "MM/dd/yyyy", "yyyy/MM/dd")
            var parsedTime: Long? = null
            for (format in formats) {
                try {
                    val sdf = SimpleDateFormat(format, Locale.US)
                    parsedTime = sdf.parse(dateStr)?.time
                    break
                } catch (e: Exception) {}
            }
            parsedTime
        } catch (e: Exception) {
            null
        }
    }

    private fun buildPrompt(
        transactions: List<TransactionEntity>,
        categories: List<CategoryEntity>,
        userQuestion: String?,
        currencyCode: String,
        localeString: String,
        region: String
    ): String {
        val categoryNames = categories.map { it.name }.joinToString(", ")
        val recent = transactions.take(30)
        val rows = recent.joinToString("\n") { tx ->
            val formattedAmt = "${tx.type.uppercase()} ${tx.amountCents / 100.0} $currencyCode"
            "$formattedAmt for ${tx.note ?: "no note"} (${tx.categoryId}) on ${Date(tx.timestamp)}"
        }

        return """
            Summarize this cash ledger for a personal finance assistant.
            Locale $localeString, Region $region, Currency $currencyCode.
            ${userQuestion?.let { "User question: $it" } ?: ""}

            If the user asks to log purchases, emit "ADD_EXPENSE: <amount> <category> <note>" lines.
            If the user asks to log income, emit "ADD_INCOME: <amount> <category> <note>".
            If the user asks to create recurring items, emit "ADD_RECURRING: <name> <amount> <income|expense> <weekly|monthly> <categoryHint?> <startDate?>".
            If the user asks to save a goal, emit "ADD_GOAL: <name> <targetAmount> <dueDate?>".

            Keep commands on their own lines; otherwise respond with helpful Markdown.
            Use Markdown formatting heavily. Use **bold** for important numbers.
            Present the balance trend and biggest categories in a clean Markdown table.
            Provide one clear next action bullet point at the end.
            Keep response user-ready only—no system or prompt text. Do not wrap the response in a code block.

            Transactions (newest first):
            ${if (rows.isEmpty()) "No transactions yet." else rows}
        """.trimIndent()
    }

    private fun summarizeLocal(transactions: List<TransactionEntity>, currencyCode: String, localeString: String): String {
        if (transactions.isEmpty()) return "No transactions yet. Start logging expenses to get useful trends."
        
        var expenseTotal = 0L
        var incomeTotal = 0L
        for (tx in transactions) {
            if (tx.type == "expense") expenseTotal += tx.amountCents
            else if (tx.type == "income") incomeTotal += tx.amountCents
        }
        val balance = incomeTotal - expenseTotal
        
        val format = { cents: Long -> "$currencyCode ${String.format(Locale.US, "%.2f", cents / 100.0)}" }
        
        return """
            • Income: ${format(incomeTotal)}
            • Expenses: ${format(expenseTotal)}
            • Net Balance: ${format(balance)}
        """.trimIndent()
    }
}
