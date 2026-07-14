package com.walsoup.gemwallet

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Services & Databases
        database = AppDatabase.getDatabase(this, lifecycleScope)
        settingsManager = SettingsManager(this)
        nlpService = NlpService(GeminiService(), HuggingFaceService())
        executor = ContextCompat.getMainExecutor(this)

        setContent {
            val settingsState by settingsManager.settingsState.collectAsState()
            
            // Database Flows collected as state
            val transactions by database.transactionDao().getAllTransactions().collectAsState(initial = emptyList())
            val categories by database.categoryDao().getAllCategories().collectAsState(initial = emptyList())
            val goals by database.goalDao().getAllGoals().collectAsState(initial = emptyList())
            val events by database.recurringEventDao().getAllEvents().collectAsState(initial = emptyList())

            val balanceCents = remember(transactions) {
                transactions.sumOf { if (it.type == "income") it.amountCents else -it.amountCents }
            }

            var activeTab by remember { mutableStateOf("home") }
            var isUnlocked by remember {
                mutableStateOf(!settingsState.biometricAuthEnabled && !settingsState.passcodeEnabled)
            }

            // Launch biometrics prompt if enabled on startup
            LaunchedEffect(settingsState.biometricAuthEnabled) {
                if (settingsState.biometricAuthEnabled && !isUnlocked) {
                    showBiometricPrompt {
                        isUnlocked = true
                    }
                }
            }

            // Background worker to check and apply recurring events every 60 seconds
            LaunchedEffect(transactions.isNotEmpty()) {
                while (true) {
                    delay(60000)
                    applyDueRecurringEvents()
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
                                lifecycleScope.launch(Dispatchers.IO) {
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
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            }
                                        },
                                        onDeleteTransaction = { id ->
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                database.transactionDao().deleteTransactionById(id)
                                            }
                                        },
                                        onUpdateTransaction = { id, amount, catId, type, note ->
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            }
                                        },
                                        onAddIncome = { amount, catId, note ->
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            }
                                        },
                                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            }
                                        },
                                        onAddGoal = { name, target, dueDate ->
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                database.goalDao().insertGoal(
                                                    GoalEntity(
                                                        id = "goal-${UUID.randomUUID()}",
                                                        name = name,
                                                        targetCents = target,
                                                        dueDate = dueDate
                                                    )
                                                )
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
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                database.goalDao().insertGoal(
                                                    GoalEntity(
                                                        id = "goal-${UUID.randomUUID()}",
                                                        name = name,
                                                        targetCents = target
                                                    )
                                                )
                                            }
                                        },
                                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                                            lifecycleScope.launch(Dispatchers.IO) {
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
                                            }
                                        },
                                        onToggleRecurring = { id, enabled ->
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                val existing = database.recurringEventDao().getAllEventsSync().find { it.id == id }
                                                existing?.let {
                                                    database.recurringEventDao().updateEvent(it.copy(enabled = enabled))
                                                }
                                            }
                                        }
                                    )
                                    "settings" -> SettingsScreen(
                                        settingsState = settingsState,
                                        settingsManager = settingsManager,
                                        categories = categories,
                                        onAddCustomCategory = { name, emoji ->
                                            lifecycleScope.launch(Dispatchers.IO) {
                                                database.categoryDao().insertCategory(
                                                    CategoryEntity(
                                                        id = "custom-${UUID.randomUUID()}",
                                                        name = name,
                                                        emoji = emoji,
                                                        kind = "expense"
                                                    )
                                                )
                                            }
                                        },
                                        onClearAllData = {
                                            lifecycleScope.launch(Dispatchers.IO) {
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
