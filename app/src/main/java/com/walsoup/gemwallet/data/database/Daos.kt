package com.walsoup.gemwallet.data.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY kind ASC, name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories")
    suspend fun getAllCategoriesSync(): List<CategoryEntity>

    @Query("SELECT * FROM categories WHERE id = :id")
    suspend fun getCategoryById(id: String): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Delete
    suspend fun deleteCategory(category: CategoryEntity)

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun deleteCategoryById(id: String)

    @Transaction
    suspend fun deleteCategoryAndRemapTransactions(categoryId: String, fallbackCategoryId: String) {
        // Remap transactions
        remapTransactionsCategory(categoryId, fallbackCategoryId)
        // Delete category
        deleteCategoryById(categoryId)
    }

    @Query("UPDATE transactions SET categoryId = :newCategoryId WHERE categoryId = :oldCategoryId")
    suspend fun remapTransactionsCategory(oldCategoryId: String, newCategoryId: String)
}

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY timestamp DESC")
    fun getAllTransactions(): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions ORDER BY timestamp DESC")
    suspend fun getAllTransactionsSync(): List<TransactionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity)

    @Update
    suspend fun updateTransaction(transaction: TransactionEntity)

    @Delete
    suspend fun deleteTransaction(transaction: TransactionEntity)

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun deleteTransactionById(id: String)

    @Query("DELETE FROM transactions")
    suspend fun deleteAllTransactions()
}

@Dao
interface GoalDao {
    @Query("SELECT * FROM goals ORDER BY createdAt DESC")
    fun getAllGoals(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals ORDER BY createdAt DESC")
    suspend fun getAllGoalsSync(): List<GoalEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGoal(goal: GoalEntity)

    @Update
    suspend fun updateGoal(goal: GoalEntity)

    @Query("DELETE FROM goals WHERE id = :id")
    suspend fun deleteGoalById(id: String)

    @Query("DELETE FROM goals")
    suspend fun deleteAllGoals()
}

@Dao
interface RecurringEventDao {
    @Query("SELECT * FROM recurring_events ORDER BY id DESC")
    fun getAllEvents(): Flow<List<RecurringEventEntity>>

    @Query("SELECT * FROM recurring_events ORDER BY id DESC")
    suspend fun getAllEventsSync(): List<RecurringEventEntity>

    @Query("SELECT * FROM recurring_events WHERE enabled = 1")
    suspend fun getEnabledEventsSync(): List<RecurringEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: RecurringEventEntity)

    @Update
    suspend fun updateEvent(event: RecurringEventEntity)

    @Query("DELETE FROM recurring_events WHERE id = :id")
    suspend fun deleteEventById(id: String)

    @Query("DELETE FROM recurring_events")
    suspend fun deleteAllEvents()
}
