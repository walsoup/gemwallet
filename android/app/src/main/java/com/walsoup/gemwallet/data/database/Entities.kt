package com.walsoup.gemwallet.data.database

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "categories",
    indices = [Index(value = ["kind"])]
)
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val emoji: String,
    val kind: String, // "expense", "income", "system"
    val isLocked: Boolean = false,
    val maxBudgetLimitCents: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "transactions",
    indices = [
        Index(value = ["timestamp"]),
        Index(value = ["categoryId"])
    ]
)
data class TransactionEntity(
    @PrimaryKey val id: String,
    val amountCents: Long,
    val type: String, // "expense", "income"
    val timestamp: Long,
    val categoryId: String,
    val note: String? = null,
    val isVoided: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "goals",
    indices = [Index(value = ["completed"])]
)
data class GoalEntity(
    @PrimaryKey val id: String,
    val name: String,
    val targetCents: Long,
    val savedCents: Long = 0,
    val dueDate: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val completed: Boolean = false,
    val enabled: Boolean = true
)

@Entity(
    tableName = "recurring_events",
    indices = [
        Index(value = ["nextRun"]),
        Index(value = ["enabled"])
    ]
)
data class RecurringEventEntity(
    @PrimaryKey val id: String,
    val name: String,
    val amountCents: Long,
    val type: String, // "expense", "income"
    val categoryId: String,
    val interval: String, // "weekly", "monthly"
    val nextRun: Long,
    val enabled: Boolean = true
)
