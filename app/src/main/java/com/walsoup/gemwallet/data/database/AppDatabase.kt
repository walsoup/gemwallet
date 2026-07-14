package com.walsoup.gemwallet.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [CategoryEntity::class, TransactionEntity::class, GoalEntity::class, RecurringEventEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun categoryDao(): CategoryDao
    abstract fun transactionDao(): TransactionDao
    abstract fun goalDao(): GoalDao
    abstract fun recurringEventDao(): RecurringEventDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "gemwallet_database"
                )
                .addCallback(AppDatabaseCallback(scope))
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class AppDatabaseCallback(
        private val scope: CoroutineScope
    ) : RoomDatabase.Callback() {
        override fun onCreate(db: SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                scope.launch(Dispatchers.IO) {
                    populateDefaultCategories(database.categoryDao())
                }
            }
        }

        suspend fun populateDefaultCategories(categoryDao: CategoryDao) {
            val defaultCategories = listOf(
                CategoryEntity("expense-food", "Food", "🍔", "expense"),
                CategoryEntity("expense-coffee", "Coffee", "☕", "expense"),
                CategoryEntity("expense-transit", "Transit", "🚌", "expense"),
                CategoryEntity("expense-shopping", "Shopping", "🛍️", "expense"),
                CategoryEntity("expense-bills", "Bills", "🧾", "expense"),
                CategoryEntity("expense-entertainment", "Fun", "🎮", "expense"),
                CategoryEntity("expense-subscriptions", "Subs", "📺", "expense"),
                CategoryEntity("expense-savings", "Savings", "🏦", "system", isLocked = true),
                CategoryEntity("expense-misc", "Misc", "🤝", "system", isLocked = true),
                CategoryEntity("income-atm", "ATM", "🏧", "income"),
                CategoryEntity("income-paycheck", "Paycheck", "💼", "income"),
                CategoryEntity("income-gift", "Gift", "🎁", "income"),
                CategoryEntity("income-side-hustle", "Side Hustle", "💰", "income"),
                CategoryEntity("income-custom", "Custom", "✏️", "income")
            )
            categoryDao.insertCategories(defaultCategories)
        }
    }
}
