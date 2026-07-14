package com.walsoup.gemwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.GoalEntity
import com.walsoup.gemwallet.data.database.RecurringEventEntity
import com.walsoup.gemwallet.ui.components.ProgressRing
import com.walsoup.gemwallet.ui.components.formatCurrency
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanningScreen(
    goals: List<GoalEntity>,
    events: List<RecurringEventEntity>,
    categories: List<CategoryEntity>,
    currencyCode: String,
    localeString: String,
    onAddGoal: (name: String, targetCents: Long) -> Unit,
    onAddRecurring: (name: String, amountCents: Long, type: String, interval: String, categoryId: String, startDate: Long) -> Unit,
    onToggleRecurring: (id: String, enabled: Boolean) -> Unit
) {
    var showGoalModal by remember { mutableStateOf(false) }
    var showRecModal by remember { mutableStateOf(false) }

    val categoryMap = remember(categories) { categories.associateBy { it.id } }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp)
    ) {
        // Safe Area Padding
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }

        // Savings Goals Section
        item {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        "Savings Goals",
                        fontFamily = SpaceGroteskFamily,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    Button(
                        onClick = { showGoalModal = true },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "NEW",
                            fontFamily = BeVietnamProFamily,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (goals.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                    ) {
                        Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                            Text(
                                "No savings goals created.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontFamily = BeVietnamProFamily
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        goals.forEach { goal ->
                            val progress = if (goal.targetCents > 0) {
                                (goal.savedCents.toFloat() / goal.targetCents.toFloat()).coerceIn(0f, 1f)
                            } else 0f

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(48.dp)
                                                    .clip(RoundedCornerShape(12.dp))
                                                    .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Info,
                                                    contentDescription = null,
                                                    tint = MaterialTheme.colorScheme.primary
                                                )
                                            }
                                            Column {
                                                Text(
                                                    goal.name,
                                                    fontFamily = SpaceGroteskFamily,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp,
                                                    color = MaterialTheme.colorScheme.onSurface
                                                )
                                                Text(
                                                    "Goal",
                                                    fontFamily = BeVietnamProFamily,
                                                    fontSize = 13.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                formatCurrency(goal.savedCents, currencyCode, localeString),
                                                fontFamily = SpaceGroteskFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 18.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Text(
                                                "of " + formatCurrency(goal.targetCents, currencyCode, localeString),
                                                fontFamily = BeVietnamProFamily,
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    LinearProgressIndicator(
                                        progress = progress,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        color = MaterialTheme.colorScheme.primaryContainer,
                                        trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
                                    )

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "${(progress * 100).toInt()}% funded",
                                            fontFamily = BeVietnamProFamily,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Text(
                                            text = if (goal.dueDate != null) {
                                                "Est: " + SimpleDateFormat("MM/dd/yyyy", Locale.US).format(Date(goal.dueDate))
                                            } else "No deadline",
                                            fontFamily = BeVietnamProFamily,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Recurring Events Section
        item {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        "Recurring Events",
                        fontFamily = SpaceGroteskFamily,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    Button(
                        onClick = { showRecModal = true },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "NEW",
                            fontFamily = BeVietnamProFamily,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (events.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                    ) {
                        Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                            Text(
                                "No recurring events.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontFamily = BeVietnamProFamily
                            )
                        }
                    }
                } else {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            events.forEach { event ->
                                val isIncome = event.type == "income"
                                val category = categoryMap[event.categoryId]

                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(40.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(category?.emoji ?: "🧩", fontSize = 18.sp)
                                            }
                                            Column {
                                                Text(
                                                    event.name,
                                                    fontFamily = SpaceGroteskFamily,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp
                                                )
                                                Text(
                                                    if (event.interval == "monthly") "Monthly" else "Weekly",
                                                    fontFamily = BeVietnamProFamily,
                                                    fontSize = 13.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            Text(
                                                text = (if (isIncome) "+" else "-") + formatCurrency(event.amountCents, currencyCode, localeString),
                                                fontFamily = SpaceGroteskFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp,
                                                color = if (isIncome) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurface
                                            )

                                            Switch(
                                                checked = event.enabled,
                                                onCheckedChange = { onToggleRecurring(event.id, it) }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Bottom space padding
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }
    }

    // Modal Dialog: New Goal
    if (showGoalModal) {
        var goalName by remember { mutableStateOf("") }
        var goalTarget by remember { mutableStateOf("") }

        Dialog(onDismissRequest = { showGoalModal = false }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "New Savings Goal",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    OutlinedTextField(
                        value = goalName,
                        onValueChange = { goalName = it },
                        label = { Text("Name", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("e.g. Vacation, Emergency fund...", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = goalTarget,
                        onValueChange = { goalTarget = it },
                        label = { Text("Target Amount", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("$0.00", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showGoalModal = false }) {
                            Text("Cancel", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val target = goalTarget.toDoubleOrNull() ?: 0.0
                                if (goalName.trim().isNotEmpty() && target > 0.0) {
                                    onAddGoal(goalName.trim(), (target * 100).toLong())
                                    showGoalModal = false
                                }
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Create", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }

    // Modal Dialog: New Recurring
    if (showRecModal) {
        var recName by remember { mutableStateOf("") }
        var recAmount by remember { mutableStateOf("") }
        var recType by remember { mutableStateOf("expense") } // "income" or "expense"
        var recInterval by remember { mutableStateOf("monthly") } // "weekly" or "monthly"
        var selectedCategoryId by remember {
            val first = categories.find { it.kind == recType || it.kind == "system" }
            mutableStateOf(first?.id ?: "")
        }

        Dialog(onDismissRequest = { showRecModal = false }) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "New Recurring Event",
                        fontFamily = SpaceGroteskFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )

                    OutlinedTextField(
                        value = recName,
                        onValueChange = { recName = it },
                        label = { Text("Name", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("e.g. Rent, Gym membership...", fontFamily = BeVietnamProFamily) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = recAmount,
                        onValueChange = { recAmount = it },
                        label = { Text("Amount", fontFamily = BeVietnamProFamily) },
                        placeholder = { Text("$0.00", fontFamily = BeVietnamProFamily) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Type Choice
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("expense", "income").forEach { type ->
                            val active = recType == type
                            FilterChip(
                                selected = active,
                                onClick = {
                                    recType = type
                                    val cat = categories.find { it.kind == type || it.kind == "system" }
                                    selectedCategoryId = cat?.id ?: ""
                                },
                                label = { Text(type.replaceFirstChar { it.uppercase() }, fontFamily = BeVietnamProFamily) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Categories List Scroll
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories
                            .filter { it.kind == recType || it.kind == "system" }
                            .forEach { cat ->
                                val active = selectedCategoryId == cat.id
                                FilterChip(
                                    selected = active,
                                    onClick = { selectedCategoryId = cat.id },
                                    label = { Text("${cat.emoji} ${cat.name}", fontFamily = BeVietnamProFamily) }
                                )
                            }
                    }

                    // Interval Choice
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("weekly", "monthly").forEach { interval ->
                            val active = recInterval == interval
                            FilterChip(
                                selected = active,
                                onClick = { recInterval = interval },
                                label = { Text(interval.replaceFirstChar { it.uppercase() }, fontFamily = BeVietnamProFamily) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showRecModal = false }) {
                            Text("Cancel", fontFamily = BeVietnamProFamily)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val amt = recAmount.toDoubleOrNull() ?: 0.0
                                if (recName.trim().isNotEmpty() && amt > 0.0 && selectedCategoryId.isNotEmpty()) {
                                    onAddRecurring(
                                        recName.trim(),
                                        (amt * 100).toLong(),
                                        recType,
                                        recInterval,
                                        selectedCategoryId,
                                        System.currentTimeMillis()
                                    )
                                    showRecModal = false
                                }
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Create", fontFamily = BeVietnamProFamily)
                        }
                    }
                }
            }
        }
    }
}
