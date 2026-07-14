package com.walsoup.gemwallet.utils

import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import java.text.SimpleDateFormat
import java.util.*

fun exportTransactionsCsv(
    transactions: List<TransactionEntity>,
    categories: List<CategoryEntity>,
    includeNotes: Boolean
): String {
    val categoryMap = categories.associateBy { it.id }
    val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
    
    val sb = java.lang.StringBuilder()
    sb.append("ID,Date,Amount,Type,Category,Notes\n")

    transactions.forEach { tx ->
        val cat = categoryMap[tx.categoryId]
        val catName = cat?.name ?: "Misc"
        val dateStr = dateFormat.format(Date(tx.timestamp))
        val amount = tx.amountCents.toDouble() / 100.0

        val notes = if (includeNotes) {
            val noteText = tx.note ?: ""
            // Escape double quotes and wrap in quotes if commas/quotes exist
            if (noteText.contains(",") || noteText.contains("\"") || noteText.contains("\n")) {
                "\"" + noteText.replace("\"", "\"\"") + "\""
            } else {
                noteText
            }
        } else {
            ""
        }

        sb.append("${tx.id},$dateStr,${String.format(Locale.US, "%.2f", amount)},${tx.type},$catName,$notes\n")
    }

    return sb.toString()
}
