package com.walsoup.gemwallet

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricManager
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.walsoup.gemwallet.ai.GeminiService
import com.walsoup.gemwallet.ai.HuggingFaceService
import com.walsoup.gemwallet.ai.NlpService
import com.walsoup.gemwallet.data.database.*
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.screens.*
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.GemWalletTheme
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import com.walsoup.gemwallet.utils.exportTransactionsCsv
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executor
import java.util.Calendar
import java.util.Date
import java.util.UUID

class MainActivity : FragmentActivity() {

    private lateinit var database: AppDatabase
    private lateinit var settingsManager: SettingsManager
    private lateinit var nlpService: NlpService
    private lateinit var executor: Executor
    private lateinit var appScope: CoroutineScope

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Services & Databases
        database = AppDatabase.getDatabase(this, lifecycleScope)
        settingsManager = SettingsManager(this)
        nlpService = NlpService(GeminiService(), HuggingFaceService())
        executor = ContextCompat.getMainExecutor(this)
        appScope = (application as MainApplication).applicationScope

        setContent {
            val settingsState by settingsManager.settingsState.collectAsStateWithLifecycle()
            
            // Database Flows collected as state
            val transactions by database.transactionDao().getAllTransactions().collectAsStateWithLifecycle(initialValue = emptyList())
            val categories by database.categoryDao().getAllCategories().collectAsStateWithLifecycle(initialValue = emptyList())
            val goals by database.goalDao().getAllGoals().collectAsStateWithLifecycle(initialValue = emptyList())
            val events by database.recurringEventDao().getAllEvents().collectAsStateWithLifecycle(initialValue = emptyList())

            val balanceCents = remember(transactions) {
                transactions.sumOf { if (it.type == "income") it.amountCents else -it.amountCents }
            }

            var activeTab by remember { mutableStateOf("home") }
            var isUnlocked by remember(settingsState.isLoaded) {
                mutableStateOf(settingsState.isLoaded && !settingsState.biometricAuthEnabled && !settingsState.passcodeEnabled)
            }

            // Launch biometrics prompt if enabled on startup
            LaunchedEffect(settingsState.isLoaded, settingsState.biometricAuthEnabled) {
                if (settingsState.isLoaded && settingsState.biometricAuthEnabled && !isUnlocked) {
                    showBiometricPrompt {
                        isUnlocked = true
                    }
                }
            }

            // Background worker to check and apply recurring events every 60 seconds
            LaunchedEffect(transactions.isNotEmpty()) {
                while (true) {
                    delay(60000)
                    try {
                        applyDueRecurringEvents()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }

            GemWalletTheme(
                themePreference = settingsState.themePreference,
                oledTrueBlackEnabled = settingsState.oledTrueBlackEnabled,
                highContrastEnabled = settingsState.highContrastEnabled,
                primaryColorHex = settingsState.themePrimary,
                secondaryColorHex = settingsState.themeSecondary
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (!settingsState.hasCompletedOnboarding) {
                        // Onboarding flow
                        OnboardingScreen(
                            onComplete = { enableAi ->
                                settingsManager.setAiFeaturesEnabled(enableAi)
                                settingsManager.setVoiceAssistantEnabled(enableAi)
                                settingsManager.setHasCompletedOnboarding(true)
                                
                                 // Genesis Transaction of Opening Balance
                                 appScope.launch {
                                     try {
                                         database.transactionDao().insertTransaction(
                                             TransactionEntity(
                                                 id = "genesis-${UUID.randomUUID()}",
                                                 amountCents = 0,
                                                 type = "income",
                                                 timestamp = System.currentTimeMillis(),
                                                 categoryId = "income-custom",
                                                 note = "Opening balance"
                                             )
                                         )
                                     } catch (e: Exception) {
                                         withContext(Dispatchers.Main) {
                                             Toast.makeText(this@MainActivity, "Failed to insert opening balance: ${e.message}", Toast.LENGTH_LONG).show()
                                         }
                                     }
                                 }
                            }
                        )
                    } else if (!isUnlocked) {
                        // Authentication gate
                        PasscodeGateScreen(
                            passcodePinHash = settingsState.passcodePinHash,
                            biometricsEnabled = settingsState.biometricAuthEnabled,
                            onSuccess = { isUnlocked = true },
                            onRequestBiometrics = {
                                showBiometricPrompt {
                                    isUnlocked = true
                                }
                            }
                        )
                    } else {
                        // Main Scaffold Layout with Tabs
                        Scaffold(
                            bottomBar = {
                                NavigationBar(
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                                ) {
                                    // 1. Home
                                    NavigationBarItem(
                                        selected = activeTab == "home",
                                        onClick = { activeTab = "home" },
                                        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                                        label = { Text("Home", fontFamily = BeVietnamProFamily) }
                                    )
                                    // 2. Insights
                                    NavigationBarItem(
                                        selected = activeTab == "analytics",
                                        onClick = { activeTab = "analytics" },
                                        icon = { Icon(Icons.Default.PieChart, contentDescription = "Insights") },
                                        label = { Text("Insights", fontFamily = BeVietnamProFamily) }
                                    )
                                    // 3. Chat
                                    if (settingsState.aiFeaturesEnabled) {
                                        NavigationBarItem(
                                            selected = activeTab == "chat",
                                            onClick = { activeTab = "chat" },
                                            icon = { Icon(Icons.Default.Chat, contentDescription = "Chat") },
                                            label = { Text("Chat", fontFamily = BeVietnamProFamily) }
                                        )
                                    }
                                    // 4. Plan
                                    NavigationBarItem(
                                        selected = activeTab == "planning",
                                        onClick = { activeTab = "planning" },
                                        icon = { Icon(Icons.Default.Flag, contentDescription = "Plan") },
                                        label = { Text("Plan", fontFamily = BeVietnamProFamily) }
                                    )
                                    // 5. Settings
                                    NavigationBarItem(
                                        selected = activeTab == "settings",
                                        onClick = { activeTab = "settings" },
                                        icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                                        label = { Text("Settings", fontFamily = BeVietnamProFamily) }
                                    )
                                }
                            }
                        ) { innerPadding ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(innerPadding)
                            ) {
                                when (activeTab) {
                                    "home" -> HomeScreen(
                                        transactions = transactions,
                                        categories = categories,
                                        goals = goals,
                                        balanceCents = balanceCents,
                                        currencyCode = settingsState.currencyCode,
                                        localeString = settingsState.language,
                                        customGreetingName = settingsState.customGreetingName,
                                        onAddTransaction = { amount, catId, type, note ->
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().insertTransaction(
                                                        TransactionEntity(
                                                            id = UUID.randomUUID().toString(),
                                                            amountCents = amount,
                                                            type = type,
                                                            timestamp = System.currentTimeMillis(),
                                                            categoryId = catId,
                                                            note = note
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add transaction: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onDeleteTransaction = { id ->
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().deleteTransactionById(id)
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to delete transaction: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onUpdateTransaction = { id, amount, catId, type, note ->
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().updateTransaction(
                                                        TransactionEntity(
                                                            id = id,
                                                            amountCents = amount,
                                                            type = type,
                                                            timestamp = System.currentTimeMillis(),
                                                            categoryId = catId,
                                                            note = note
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to update transaction: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        }
                                    )
                                    "analytics" -> AnalyticsScreen(
                                        transactions = transactions,
                                        categories = categories,
                                        currencyCode = settingsState.currencyCode,
                                        localeString = settingsState.language
                                    )
                                    "chat" -> ChatScreen(
                                        transactions = transactions,
                                        categories = categories,
                                        settingsState = settingsState,
                                        settingsManager = settingsManager,
                                        nlpService = nlpService,
                                        onAddExpense = { amount, catId, note ->
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().insertTransaction(
                                                        TransactionEntity(
                                                            id = UUID.randomUUID().toString(),
                                                            amountCents = amount,
                                                            type = "expense",
                                                            timestamp = System.currentTimeMillis(),
                                                            categoryId = catId,
                                                            note = note
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add expense: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onAddIncome = { amount, catId, note ->
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().insertTransaction(
                                                        TransactionEntity(
                                                            id = UUID.randomUUID().toString(),
                                                            amountCents = amount,
                                                            type = "income",
                                                            timestamp = System.currentTimeMillis(),
                                                            categoryId = catId,
                                                            note = note
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add income: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                                            appScope.launch {
                                                try {
                                                    database.recurringEventDao().insertEvent(
                                                        RecurringEventEntity(
                                                            id = "recurring-${UUID.randomUUID()}",
                                                            name = name,
                                                            amountCents = amount,
                                                            type = type,
                                                            categoryId = catId,
                                                            interval = interval,
                                                            nextRun = startDate
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add recurring event: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onAddGoal = { name, target, dueDate ->
                                            appScope.launch {
                                                try {
                                                    database.goalDao().insertGoal(
                                                        GoalEntity(
                                                            id = "goal-${UUID.randomUUID()}",
                                                            name = name,
                                                            targetCents = target,
                                                            dueDate = dueDate
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add goal: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        }
                                    )
                                    "planning" -> PlanningScreen(
                                        goals = goals,
                                        events = events,
                                        categories = categories,
                                        currencyCode = settingsState.currencyCode,
                                        localeString = settingsState.language,
                                        onAddGoal = { name, target ->
                                            appScope.launch {
                                                try {
                                                    database.goalDao().insertGoal(
                                                        GoalEntity(
                                                            id = "goal-${UUID.randomUUID()}",
                                                            name = name,
                                                            targetCents = target
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add goal: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                                            appScope.launch {
                                                try {
                                                    database.recurringEventDao().insertEvent(
                                                        RecurringEventEntity(
                                                            id = "recurring-${UUID.randomUUID()}",
                                                            name = name,
                                                            amountCents = amount,
                                                            type = type,
                                                            categoryId = catId,
                                                            interval = interval,
                                                            nextRun = startDate
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add recurring event: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onToggleRecurring = { id, enabled ->
                                            appScope.launch {
                                                try {
                                                    val existing = database.recurringEventDao().getAllEventsSync().find { it.id == id }
                                                    existing?.let {
                                                        database.recurringEventDao().updateEvent(it.copy(enabled = enabled))
                                                    }
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to toggle recurring: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        }
                                    )
                                    "settings" -> SettingsScreen(
                                        settingsState = settingsState,
                                        settingsManager = settingsManager,
                                        categories = categories,
                                        onAddCustomCategory = { name, emoji ->
                                            appScope.launch {
                                                try {
                                                    database.categoryDao().insertCategory(
                                                        CategoryEntity(
                                                            id = "custom-${UUID.randomUUID()}",
                                                            name = name,
                                                            emoji = emoji,
                                                            kind = "expense"
                                                        )
                                                    )
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to add category: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onClearAllData = {
                                            appScope.launch {
                                                try {
                                                    database.transactionDao().deleteAllTransactions()
                                                    database.goalDao().deleteAllGoals()
                                                    database.recurringEventDao().deleteAllEvents()
                                                    // Reset preferences
                                                    settingsManager.clearAllData()
                                                    // Relaunch app or restart main screen
                                                    withContext(Dispatchers.Main) {
                                                        isUnlocked = true
                                                        activeTab = "home"
                                                    }
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        Toast.makeText(this@MainActivity, "Failed to clear data: ${e.message}", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            }
                                        },
                                        onExportCsv = {
                                            exportTransactionsCsv(transactions, categories, settingsState.includeNotesInExport)
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun showBiometricPrompt(onSuccess: () -> Unit) {
        val biometricManager = BiometricManager.from(this)
        val canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(this, "Biometric authentication is not available or not set up.", Toast.LENGTH_LONG).show()
            return
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock GemWallet")
            .setSubtitle("Use your device biometrics to unlock")
            .setNegativeButtonText("Use Passcode PIN")
            .build()

        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }
            })

        biometricPrompt.authenticate(promptInfo)
    }

    private suspend fun applyDueRecurringEvents() {
        try {
            withContext(Dispatchers.IO) {
                val now = System.currentTimeMillis()
                val enabledEvents = database.recurringEventDao().getEnabledEventsSync()
                
                for (event in enabledEvents) {
                    if (event.nextRun <= now) {
                        var currentNextRun = event.nextRun
                        
                        // Insert all skipped occurrences
                        while (currentNextRun <= now) {
                            database.transactionDao().insertTransaction(
                                TransactionEntity(
                                    id = UUID.randomUUID().toString(),
                                    amountCents = event.amountCents,
                                    type = event.type,
                                    timestamp = currentNextRun,
                                    categoryId = event.categoryId,
                                    note = "${event.name} (recurring)"
                                )
                            )
                            // Add interval
                            currentNextRun = addInterval(currentNextRun, event.interval)
                        }

                        // Update next run time in DB
                        database.recurringEventDao().updateEvent(event.copy(nextRun = currentNextRun))
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun addInterval(base: Long, interval: String): Long {
        val calendar = Calendar.getInstance().apply { timeInMillis = base }
        if (interval == "weekly") {
            calendar.add(Calendar.DAY_OF_YEAR, 7)
        } else {
            calendar.add(Calendar.MONTH, 1)
        }
        return calendar.timeInMillis
    }
}
