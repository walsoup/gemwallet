package com.walsoup.gemwallet

import android.content.Context
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.work.*
import com.walsoup.gemwallet.ai.GeminiService
import com.walsoup.gemwallet.ai.HuggingFaceService
import com.walsoup.gemwallet.ai.NlpService
import com.walsoup.gemwallet.data.database.*
import androidx.room.withTransaction
import com.walsoup.gemwallet.data.preferences.SettingsManager
import com.walsoup.gemwallet.ui.screens.*
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.GemWalletTheme
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import com.walsoup.gemwallet.utils.exportTransactionsCsv
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import java.util.UUID
import java.util.Calendar
import java.util.concurrent.TimeUnit

// ========== ViewModel ==========

class MainViewModel(
    private val app: MainApplication,
    private val database: AppDatabase,
    private val settingsManager: SettingsManager,
    private val nlpService: NlpService
) : ViewModel() {

    val settingsState = settingsManager.settingsState
    val transactions = database.transactionDao().getAllTransactions()
    val categories = database.categoryDao().getAllCategories()
    val goals = database.goalDao().getAllGoals()
    val events = database.recurringEventDao().getAllEvents()

    var activeTab by mutableStateOf("home")
        private set
    var isUnlocked by mutableStateOf(false)
        private set

    // Toast helper – no more 12 copy-pasted try/catch blocks
    private fun safeDbCall(block: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                block()
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(app, "Error: ${e.localizedMessage ?: "unknown"}",
                        Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    fun setTab(tab: String) { activeTab = tab }
    fun unlock() { isUnlocked = true }

    // ---------- Transactions ----------

    fun addTransaction(amountCents: Long, categoryId: String, type: String, note: String) {
        safeDbCall {
            database.transactionDao().insertTransaction(
                TransactionEntity(
                    id = UUID.randomUUID().toString(),
                    amountCents = amountCents,
                    type = type,
                    timestamp = System.currentTimeMillis(),
                    categoryId = categoryId,
                    note = note
                )
            )
        }
    }

    fun deleteTransaction(id: String) {
        safeDbCall { database.transactionDao().deleteTransactionById(id) }
    }

    fun updateTransaction(id: String, amountCents: Long, categoryId: String, type: String, note: String, originalTimestamp: Long? = null) {
        safeDbCall {
            database.transactionDao().updateTransaction(
                TransactionEntity(
                    id = id,
                    amountCents = amountCents,
                    type = type,
                    timestamp = originalTimestamp ?: System.currentTimeMillis(), // keep original if provided
                    categoryId = categoryId,
                    note = note
                )
            )
        }
    }

    // ---------- Recurring Events ----------

    fun addRecurringEvent(name: String, amountCents: Long, type: String, categoryId: String, interval: String, startDate: Long = System.currentTimeMillis()) {
        safeDbCall {
            database.recurringEventDao().insertEvent(
                RecurringEventEntity(
                    id = "recurring-${UUID.randomUUID()}",
                    name = name,
                    amountCents = amountCents,
                    type = type,
                    categoryId = categoryId,
                    interval = interval,
                    nextRun = startDate
                )
            )
        }
    }

    fun toggleRecurring(id: String, enabled: Boolean) {
        safeDbCall {
            val existing = database.recurringEventDao().getAllEventsSync().find { it.id == id }
            existing?.let { database.recurringEventDao().updateEvent(it.copy(enabled = enabled)) }
        }
    }

    // ---------- Goals ----------

    fun addGoal(name: String, targetCents: Long, dueDate: Long? = null) {
        safeDbCall {
            database.goalDao().insertGoal(
                GoalEntity(
                    id = "goal-${UUID.randomUUID()}",
                    name = name,
                    targetCents = targetCents,
                    dueDate = dueDate
                )
            )
        }
    }

    // ---------- Categories ----------

    fun addCustomCategory(name: String, emoji: String) {
        safeDbCall {
            database.categoryDao().insertCategory(
                CategoryEntity(
                    id = "custom-${UUID.randomUUID()}",
                    name = name,
                    emoji = emoji,
                    kind = "expense"
                )
            )
        }
    }

    // ---------- Danger Zone ----------

    fun clearAllData() {
        safeDbCall {
            database.transactionDao().deleteAllTransactions()
            database.goalDao().deleteAllGoals()
            database.recurringEventDao().deleteAllEvents()
            settingsManager.clearAllData()
            withContext(Dispatchers.Main) {
                isUnlocked = true
                activeTab = "home"
            }
        }
    }
}

// ========== WORKER for Recurring Events (every 60 min instead of 60 sec – battery friendly) ==========

class RecurringEventsWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val db = AppDatabase.getDatabase(applicationContext, (applicationContext as MainApplication).applicationScope)
        return try {
            db.withTransaction {
                val now = System.currentTimeMillis()
                val enabledEvents = db.recurringEventDao().getEnabledEventsSync()

                for (event in enabledEvents) {
                    if (event.nextRun <= now) {
                        var currentNextRun = event.nextRun
                        var iterations = 0
                        val maxIterations = 12 // max 12 months/weeks catch-up

                        while (currentNextRun <= now && iterations < maxIterations) {
                            db.transactionDao().insertTransaction(
                                TransactionEntity(
                                    id = UUID.randomUUID().toString(),
                                    amountCents = event.amountCents,
                                    type = event.type,
                                    timestamp = currentNextRun,
                                    categoryId = event.categoryId,
                                    note = "${event.name} (recurring)"
                                )
                            )
                            currentNextRun = addRecurringInterval(currentNextRun, event.interval)
                            iterations++
                        }
                        db.recurringEventDao().updateEvent(event.copy(nextRun = currentNextRun))
                    }
                }
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun addRecurringInterval(base: Long, interval: String): Long {
        val cal = Calendar.getInstance().apply { timeInMillis = base }
        when (interval) {
            "daily" -> cal.add(Calendar.DAY_OF_YEAR, 1)
            "weekly" -> cal.add(Calendar.DAY_OF_YEAR, 7)
            "monthly" -> cal.add(Calendar.MONTH, 1)
            "yearly" -> cal.add(Calendar.YEAR, 1)
            else -> cal.add(Calendar.MONTH, 1) // fallback
        }
        return cal.timeInMillis
    }

    companion object {
        private const val WORK_NAME = "recurring_events"
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                .build()

            val request = PeriodicWorkRequestBuilder<RecurringEventsWorker>(
                60, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.LINEAR, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
    }
}

// ========== ACTIVITY (thin, just UI) ==========

class MainActivity : FragmentActivity() {

    private lateinit var viewModel: MainViewModel
    private lateinit var executor: java.util.concurrent.Executor

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as MainApplication
        val database = AppDatabase.getDatabase(this, app.applicationScope)
        val settingsManager = SettingsManager(this)
        val nlpService = NlpService(GeminiService(), HuggingFaceService())
        executor = ContextCompat.getMainExecutor(this)

        viewModel = ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return MainViewModel(app, database, settingsManager, nlpService) as T
                }
            }
        )[MainViewModel::class.java]

        // Schedule recurring worker only once
        RecurringEventsWorker.schedule(this)

        setContent {
            val settingsState by viewModel.settingsState.collectAsStateWithLifecycle()
            val transactions by viewModel.transactions.collectAsStateWithLifecycle(emptyList())
            val categories by viewModel.categories.collectAsStateWithLifecycle(emptyList())
            val goals by viewModel.goals.collectAsStateWithLifecycle(emptyList())
            val events by viewModel.events.collectAsStateWithLifecycle(emptyList())

            val balanceCents = remember(transactions) {
                transactions.sumOf { if (it.type == "income") it.amountCents else -it.amountCents }
            }

            // Biometric prompt on startup
            LaunchedEffect(settingsState.isLoaded, settingsState.biometricAuthEnabled) {
                if (settingsState.isLoaded && settingsState.biometricAuthEnabled && !viewModel.isUnlocked) {
                    showBiometricPrompt { viewModel.unlock() }
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
                        OnboardingScreen(
                            onComplete = { enableAi ->
                                settingsManager.setAiFeaturesEnabled(enableAi)
                                settingsManager.setVoiceAssistantEnabled(enableAi)
                                settingsManager.setHasCompletedOnboarding(true)
                            }
                        )
                    } else if (!viewModel.isUnlocked) {
                        PasscodeGateScreen(
                            biometricsEnabled = settingsState.biometricAuthEnabled,
                            onVerifyPin = { pin -> settingsManager.verifyPasscodePin(pin) },
                            onSuccess = { viewModel.unlock() },
                            onRequestBiometrics = {
                                showBiometricPrompt { viewModel.unlock() }
                            }
                        )
                    } else {
                        MainContent(
                            viewModel = viewModel,
                            settingsState = settingsState,
                            transactions = transactions,
                            categories = categories,
                            goals = goals,
                            events = events,
                            balanceCents = balanceCents,
                            onExportCsv = {
                                exportTransactionsCsv(transactions, categories, settingsState.includeNotesInExport)
                            }
                        )
                    }
                }
            }
        }
    }

    @Composable
    private fun MainContent(
        viewModel: MainViewModel,
        settingsState: com.walsoup.gemwallet.data.preferences.SettingsState,
        transactions: List<TransactionEntity>,
        categories: List<CategoryEntity>,
        goals: List<GoalEntity>,
        events: List<RecurringEventEntity>,
        balanceCents: Long,
        onExportCsv: () -> Unit
    ) {
        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                ) {
                    NavigationBarItem(
                        selected = viewModel.activeTab == "home",
                        onClick = { viewModel.setTab("home") },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                        label = { Text("Home", fontFamily = BeVietnamProFamily) }
                    )
                    NavigationBarItem(
                        selected = viewModel.activeTab == "analytics",
                        onClick = { viewModel.setTab("analytics") },
                        icon = { Icon(Icons.Default.PieChart, contentDescription = "Insights") },
                        label = { Text("Insights", fontFamily = BeVietnamProFamily) }
                    )
                    if (settingsState.aiFeaturesEnabled) {
                        NavigationBarItem(
                            selected = viewModel.activeTab == "chat",
                            onClick = { viewModel.setTab("chat") },
                            icon = { Icon(Icons.Default.Chat, contentDescription = "Chat") },
                            label = { Text("Chat", fontFamily = BeVietnamProFamily) }
                        )
                    }
                    NavigationBarItem(
                        selected = viewModel.activeTab == "planning",
                        onClick = { viewModel.setTab("planning") },
                        icon = { Icon(Icons.Default.Flag, contentDescription = "Plan") },
                        label = { Text("Plan", fontFamily = BeVietnamProFamily) }
                    )
                    NavigationBarItem(
                        selected = viewModel.activeTab == "settings",
                        onClick = { viewModel.setTab("settings") },
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
                when (viewModel.activeTab) {
                    "home" -> HomeScreen(
                        transactions = transactions,
                        categories = categories,
                        goals = goals,
                        balanceCents = balanceCents,
                        currencyCode = settingsState.currencyCode,
                        localeString = settingsState.language,
                        customGreetingName = settingsState.customGreetingName,
                        onAddTransaction = { amount, catId, type, note ->
                            viewModel.addTransaction(amount, catId, type, note)
                        },
                        onDeleteTransaction = { id -> viewModel.deleteTransaction(id) },
                        onUpdateTransaction = { id, amount, catId, type, note ->
                            viewModel.updateTransaction(id, amount, catId, type, note)
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
                        settingsManager = viewModel.settingsManager as SettingsManager, // exposed via public getter
                        nlpService = viewModel.nlpService as NlpService,
                        onAddExpense = { amount, catId, note ->
                            viewModel.addTransaction(amount, catId, "expense", note)
                        },
                        onAddIncome = { amount, catId, note ->
                            viewModel.addTransaction(amount, catId, "income", note)
                        },
                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                            viewModel.addRecurringEvent(name, amount, type, catId, interval, startDate)
                        },
                        onAddGoal = { name, target, dueDate ->
                            viewModel.addGoal(name, target, dueDate)
                        }
                    )
                    "planning" -> PlanningScreen(
                        goals = goals,
                        events = events,
                        categories = categories,
                        currencyCode = settingsState.currencyCode,
                        localeString = settingsState.language,
                        onAddGoal = { name, target ->
                            viewModel.addGoal(name, target)
                        },
                        onAddRecurring = { name, amount, type, interval, catId, startDate ->
                            viewModel.addRecurringEvent(name, amount, type, catId, interval, startDate)
                        },
                        onToggleRecurring = { id, enabled ->
                            viewModel.toggleRecurring(id, enabled)
                        }
                    )
                    "settings" -> SettingsScreen(
                        settingsState = settingsState,
                        settingsManager = viewModel.settingsManager as SettingsManager,
                        categories = categories,
                        onAddCustomCategory = { name, emoji ->
                            viewModel.addCustomCategory(name, emoji)
                        },
                        onClearAllData = { viewModel.clearAllData() },
                        onExportCsv = onExportCsv
                    )
                }
            }
        }
    }

    private fun showBiometricPrompt(onSuccess: () -> Unit) {
        val biometricManager = BiometricManager.from(this)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )
        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            val msg = when (canAuthenticate) {
                BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "Hardware unavailable"
                BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "No biometrics enrolled"
                BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "No biometric hardware"
                else -> "Biometric not available"
            }
            Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
            return
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock GemWallet")
            .setSubtitle("Use your fingerprint or face")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText("Use Passcode PIN")
            .build()

        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED &&
                        errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON
                    ) {
                        Toast.makeText(applicationContext,
                            "Biometric error: $errString", Toast.LENGTH_SHORT).show()
                    }
                }
            })

        biometricPrompt.authenticate(promptInfo)
    }
}
