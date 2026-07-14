package com.walsoup.gemwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.GoalEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import com.walsoup.gemwallet.ui.components.AnimatedBalance
import com.walsoup.gemwallet.ui.components.ProgressRing
import com.walsoup.gemwallet.ui.components.formatCurrency
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    transactions: List<TransactionEntity>,
    categories: List<CategoryEntity>,
    goals: List<GoalEntity>,
    balanceCents: Long,
    currencyCode: String,
    localeString: String,
    customGreetingName: String,
    onAddTransaction: (amountCents: Long, categoryId: String, type: String, note: String?) -> Unit,
    onDeleteTransaction: (id: String) -> Unit,
    onUpdateTransaction: (id: String, amountCents: Long, categoryId: String, type: String, note: String?) -> Unit
) {
    val scrollState = rememberScrollState()

    // Greeting logic
    val now = Calendar.getInstance()
    val hour = now.get(Calendar.HOUR_OF_DAY)
    val greetingBase = when {
        hour in 0..11 -> "Good morning"
        hour in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }
    val greeting = if (customGreetingName.trim().isNotEmpty()) {
        "$greetingBase, ${customGreetingName.trim()}"
    } else {
        greetingBase
    }

    // Modal Visibility States
    var showAddModal by remember { mutableStateOf(false) }
    var addModalType by remember { mutableStateOf("expense") } // "income" or "expense"
    
    var selectedTransactionForDetail by remember { mutableStateOf<TransactionEntity?>(null) }
    var showDetailModal by remember { mutableStateOf(false) }

    // Search and filter state
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("All") }

    // Category dictionary for quick lookups
    val categoryMap = remember(categories) { categories.associateBy { it.id } }

    // Computed monthly spend
    val monthlySpendCents = remember(transactions) {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        val startOfMonth = calendar.timeInMillis

        transactions
            .filter { it.type == "expense" && it.timestamp >= startOfMonth }
            .sumOf { it.amountCents }
    }

    // Vacation / default savings goal
    val vacationGoal = remember(goals) {
        goals.find { it.name.lowercase().contains("vacation") } ?: goals.firstOrNull()
    }
    val vacationProgress = remember(vacationGoal) {
        if (vacationGoal == null || vacationGoal.targetCents <= 0) 0f
        else (vacationGoal.savedCents.toFloat() / vacationGoal.targetCents.toFloat()).coerceIn(0f, 1f)
    }

    // Filtered transaction list (first 10 items for performance/clean layout)
    val filteredTransactions = remember(transactions, searchQuery, selectedFilter, categoryMap) {
        transactions
            .filter { tx ->
                val category = categoryMap[tx.categoryId]
                val matchesSearch = if (searchQuery.trim().isEmpty()) true
                else {
                    (tx.note ?: "").lowercase().contains(searchQuery.lowercase()) ||
                    (category?.name ?: "").lowercase().contains(searchQuery.lowercase())
                }
                val matchesFilter = when (selectedFilter) {
                    "All" -> true
                    "Income" -> tx.type == "income"
                    else -> category?.name == selectedFilter
                }
                matchesSearch && matchesFilter
            }
            .take(10)
    }

    Scaffold(
        topBar = {
            // Elegant & prettier top bar (as requested: purge others, make this one prettier!)
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text = greeting,
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                ),
                modifier = Modifier.statusBarsPadding()
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Available cash hero section
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Available Cash",
                        fontFamily = BeVietnamProFamily,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    AnimatedBalance(
                        valueCents = balanceCents,
                        currencyCode = currencyCode,
                        localeString = localeString,
                        fontSize = 54.sp,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.displayLarge
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Button(
                            onClick = {
                                addModalType = "income"
                                showAddModal = true
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            shape = RoundedCornerShape(28.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        ) {
                            Icon(Icons.Default.ArrowUpward, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Add Funds", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.SemiBold)
                        }

                        Button(
                            onClick = {
                                addModalType = "expense"
                                showAddModal = true
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            shape = RoundedCornerShape(28.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        ) {
                            Icon(Icons.Default.ArrowDownward, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Spend Funds", fontFamily = BeVietnamProFamily, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }

            // Bento Grid: Monthly Spend & Savings Goals
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Monthly Spend Card
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(150.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                        ),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "Spent",
                                    fontFamily = BeVietnamProFamily,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        "Monthly",
                                        fontSize = 10.sp,
                                        fontFamily = BeVietnamProFamily,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = formatCurrency(monthlySpendCents, currencyCode, localeString),
                                    fontFamily = SpaceGroteskFamily,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = 0.65f, // Mock monthly target usage
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        }
                    }

                    // Savings Goal Card
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(150.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                        ),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                vacationGoal?.name ?: "Savings Goal",
                                fontFamily = BeVietnamProFamily,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column {
                                Text(
                                    text = formatCurrency(vacationGoal?.savedCents ?: 0L, currencyCode, localeString),
                                    fontFamily = SpaceGroteskFamily,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "/ ${formatCurrency(vacationGoal?.targetCents ?: 0L, currencyCode, localeString)}",
                                    fontFamily = SpaceGroteskFamily,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = vacationProgress,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = MaterialTheme.colorScheme.tertiary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // Search bar & filters
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search transactions...", fontFamily = BeVietnamProFamily) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear")
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f),
                            focusedBorderColor = MaterialTheme.colorScheme.primary
                        )
                    )

                    // Filter chips row
                    val filterOptions = listOf("All", "Food", "Income", "Transit")
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        filterOptions.forEach { filter ->
                            val isActive = selectedFilter == filter
                            FilterChip(
                                selected = isActive,
                                onClick = { selectedFilter = filter },
                                label = { Text(filter, fontFamily = BeVietnamProFamily) },
                                shape = RoundedCornerShape(16.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            )
                        }
                    }
                }
            }

            // Ledger List
            item {
                Text(
                    text = "Recent Moves",
                    fontFamily = SpaceGroteskFamily,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (filteredTransactions.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No transactions found.",
                            fontFamily = BeVietnamProFamily,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                itemsIndexed(filteredTransactions) { _, tx ->
                    val category = categoryMap[tx.categoryId]
                    val isIncome = tx.type == "income"

                    // Swipeable behavior can be done via drag or simply long press.
                    // Compose card with click to open detail and long press to delete/options, which is very robust.
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                selectedTransactionForDetail = tx
                                showDetailModal = true
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                // Emoji Icon Box
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (isIncome) MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f)
                                            else MaterialTheme.colorScheme.surfaceVariant
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = category?.emoji ?: "🧩",
                                        fontSize = 20.sp
                                    )
                                }

                                Column {
                                    Text(
                                        text = tx.note ?: category?.name ?: "Transaction",
                                        fontFamily = BeVietnamProFamily,
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = category?.name ?: "Misc",
                                        fontFamily = BeVietnamProFamily,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Text(
                                text = (if (isIncome) "+" else "-") + formatCurrency(tx.amountCents, currencyCode, localeString),
                                fontFamily = BeVietnamProFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = if (isIncome) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            // Bottom spacer for list comfort
            item {
                Spacer(modifier = Modifier.height(48.dp))
            }
        }
    }

    // Modal: Add/Spend Funds
    if (showAddModal) {
        AddTransactionModal(
            type = addModalType,
            categories = categories,
            currencyCode = currencyCode,
            onDismiss = { showAddModal = false },
            onSave = { amount, categoryId, note ->
                onAddTransaction(amount, categoryId, addModalType, note)
                showAddModal = false
            }
        )
    }

    // Modal: Transaction Detail
    if (showDetailModal && selectedTransactionForDetail != null) {
        val tx = selectedTransactionForDetail!!
        TransactionDetailModal(
            transaction = tx,
            category = categoryMap[tx.categoryId],
            currencyCode = currencyCode,
            localeString = localeString,
            categories = categories,
            onDismiss = { showDetailModal = false },
            onDelete = {
                onDeleteTransaction(tx.id)
                showDetailModal = false
            },
            onUpdate = { amount, categoryId, note, type ->
                onUpdateTransaction(tx.id, amount, categoryId, type, note)
                showDetailModal = false
            }
        )
    }
}

// ----------------------------------------------------
// Modals Support Composables
// ----------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionModal(
    type: String,
    categories: List<CategoryEntity>,
    currencyCode: String,
    onDismiss: () -> Unit,
    onSave: (amountCents: Long, categoryId: String, note: String?) -> Unit
) {
    var amountText by remember { mutableStateOf("") }
    var selectedCategoryId by remember {
        val first = categories.find { it.kind == type || it.kind == "system" }
        mutableStateOf(first?.id ?: "")
    }
    var noteText by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = if (type == "income") "Add Funds" else "Spend Funds",
                    fontFamily = SpaceGroteskFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // Amount text input
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount ($currencyCode)", fontFamily = BeVietnamProFamily) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                // Category scrollable chips row
                Text(
                    text = "Category",
                    fontFamily = BeVietnamProFamily,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories
                        .filter { it.kind == type || it.kind == "system" }
                        .forEach { cat ->
                            val isSelected = selectedCategoryId == cat.id
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedCategoryId = cat.id },
                                label = { Text("${cat.emoji} ${cat.name}", fontFamily = BeVietnamProFamily) },
                                shape = RoundedCornerShape(16.dp)
                            )
                        }
                }

                // Note input
                OutlinedTextField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    label = { Text("Note (optional)", fontFamily = BeVietnamProFamily) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", fontFamily = BeVietnamProFamily)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val parsed = amountText.toDoubleOrNull() ?: 0.0
                            if (parsed > 0.0 && selectedCategoryId.isNotEmpty()) {
                                onSave((parsed * 100).toLong(), selectedCategoryId, noteText.trim().ifEmpty { null })
                            }
                        },
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Save", fontFamily = BeVietnamProFamily)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDetailModal(
    transaction: TransactionEntity,
    category: CategoryEntity?,
    currencyCode: String,
    localeString: String,
    categories: List<CategoryEntity>,
    onDismiss: () -> Unit,
    onDelete: () -> Unit,
    onUpdate: (amountCents: Long, categoryId: String, note: String?, type: String) -> Unit
) {
    var isEditing by remember { mutableStateOf(false) }

    // Edit states
    var amountText by remember { mutableStateOf((transaction.amountCents / 100.0).toString()) }
    var selectedCategoryId by remember { mutableStateOf(transaction.categoryId) }
    var noteText by remember { mutableStateOf(transaction.note ?: "") }
    var txType by remember { mutableStateOf(transaction.type) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (!isEditing) {
                    // View details mode
                    Text(
                        text = "Transaction Details",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(category?.emoji ?: "🧩", fontSize = 24.sp)
                            Column {
                                Text(
                                    category?.name ?: "Misc",
                                    fontFamily = BeVietnamProFamily,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    SimpleDateFormat("MMMM d, yyyy - h:mm a", Locale.US).format(Date(transaction.timestamp)),
                                    fontFamily = BeVietnamProFamily,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Text(
                            text = (if (transaction.type == "income") "+" else "-") + formatCurrency(transaction.amountCents, currencyCode, localeString),
                            fontFamily = SpaceGroteskFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = if (transaction.type == "income") MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error
                        )
                    }

                    if (transaction.note?.trim()?.isNotEmpty() == true) {
                        Text(
                            text = "Note: ${transaction.note}",
                            fontFamily = BeVietnamProFamily,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onDelete,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Delete", fontFamily = BeVietnamProFamily)
                        }

                        Button(
                            onClick = { isEditing = true },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Edit", fontFamily = BeVietnamProFamily)
                        }
                    }
                } else {
                    // Edit transaction mode
                    Text(
                        text = "Edit Transaction",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    // Toggle type row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("expense", "income").forEach { type ->
                            val selected = txType == type
                            FilterChip(
                                selected = selected,
                                onClick = { txType = type },
                                label = { Text(type.replaceFirstChar { it.uppercase() }, fontFamily = BeVietnamProFamily) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it },
                        label = { Text("Amount ($currencyCode)", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Categories list
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories
                            .filter { it.kind == txType || it.kind == "system" }
                            .forEach { cat ->
                                val isSelected = selectedCategoryId == cat.id
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategoryId = cat.id },
                                    label = { Text("${cat.emoji} ${cat.name}", fontFamily = BeVietnamProFamily) },
                                    shape = RoundedCornerShape(16.dp)
                                )
                            }
                    }

                    OutlinedTextField(
                        value = noteText,
                        onValueChange = { noteText = it },
                        label = { Text("Note", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { isEditing = false }) {
                            Text("Back", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val parsed = amountText.toDoubleOrNull() ?: 0.0
                                if (parsed > 0.0 && selectedCategoryId.isNotEmpty()) {
                                    onUpdate((parsed * 100).toLong(), selectedCategoryId, noteText.trim().ifEmpty { null }, txType)
                                }
                            },
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("Save", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }
}
