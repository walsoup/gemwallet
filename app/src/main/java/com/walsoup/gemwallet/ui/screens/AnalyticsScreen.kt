package com.walsoup.gemwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.walsoup.gemwallet.data.database.CategoryEntity
import com.walsoup.gemwallet.data.database.TransactionEntity
import com.walsoup.gemwallet.ui.components.*
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily
import java.util.*
import java.text.SimpleDateFormat

@Composable
fun AnalyticsScreen(
    transactions: List<TransactionEntity>,
    categories: List<CategoryEntity>,
    currencyCode: String,
    localeString: String
) {
    val categoryMap = remember(categories) { categories.associateBy { it.id } }

    // Start of current month
    val currentMonthStart = remember {
        Calendar.getInstance().apply {
            set(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }.timeInMillis
    }

    // Income vs Expense current month
    val currentMonthIncome = remember(transactions, currentMonthStart) {
        transactions.filter { it.type == "income" && it.timestamp >= currentMonthStart }.sumOf { it.amountCents }
    }
    val currentMonthExpense = remember(transactions, currentMonthStart) {
        transactions.filter { it.type == "expense" && it.timestamp >= currentMonthStart }.sumOf { it.amountCents }
    }
    val savedCents = remember(currentMonthIncome, currentMonthExpense) {
        (currentMonthIncome - currentMonthExpense).coerceAtLeast(0L)
    }
    val savedPercentage = remember(currentMonthIncome, savedCents) {
        if (currentMonthIncome > 0) (savedCents.toFloat() / currentMonthIncome.toFloat() * 100f)
        else 0f
    }

    // Donut Chart data (Group expenses by category for current month)
    val donutSlices = remember(transactions, categories, currentMonthStart) {
        val categoryExpenses = transactions
            .filter { it.type == "expense" && it.timestamp >= currentMonthStart }
            .groupBy { it.categoryId }
            .mapValues { entry -> entry.value.sumOf { it.amountCents } }

        val colors = listOf(
            Color(0xFFff6b6b), Color(0xFF52dea2), Color(0xFF4a90e2),
            Color(0xFFf39c12), Color(0xFF9b59b6), Color(0xFF1abc9c),
            Color(0xFFe74c3c), Color(0xFF34495e), Color(0xFFd35400)
        )

        categoryExpenses.map { (catId, amtCents) ->
            val cat = categoryMap[catId]
            val index = categories.indexOfFirst { it.id == catId }.coerceAtLeast(0)
            DonutSlice(
                value = amtCents.toFloat() / 100f,
                color = colors[index % colors.size],
                label = cat?.name ?: "Misc",
                emoji = cat?.emoji ?: "🧩"
            )
        }.sortedByDescending { it.value }
    }

    // 6-month calculations
    val last6MonthsData = remember(transactions) {
        val calendar = Calendar.getInstance()
        val list = mutableListOf<MonthData>()
        for (i in 5 downTo 0) {
            val cal = Calendar.getInstance().apply {
                add(Calendar.MONTH, -i)
                set(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
            }
            val start = cal.timeInMillis
            val end = cal.apply { add(Calendar.MONTH, 1) }.timeInMillis
            val label = SimpleDateFormat("MMM", Locale.US).format(cal.time)

            val monthIncome = transactions.filter { it.type == "income" && it.timestamp in start until end }.sumOf { it.amountCents }
            val monthExpense = transactions.filter { it.type == "expense" && it.timestamp in start until end }.sumOf { it.amountCents }

            list.add(
                MonthData(
                    label = label,
                    income = monthIncome.toFloat() / 100f,
                    expense = monthExpense.toFloat() / 100f
                )
            )
        }
        list
    }

    // Top Movers
    val topMovers = remember(transactions, currentMonthStart, categoryMap) {
        val categoryExpenses = transactions
            .filter { it.type == "expense" && it.timestamp >= currentMonthStart }
            .groupBy { it.categoryId }
            .mapValues { entry ->
                val total = entry.value.sumOf { it.amountCents }
                val count = entry.value.size
                Pair(total, count)
            }

        // Previous month bounds
        val prevStart = Calendar.getInstance().apply {
            add(Calendar.MONTH, -1)
            set(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }.timeInMillis
        val prevEnd = currentMonthStart

        val previousExpenses = transactions
            .filter { it.type == "expense" && it.timestamp in prevStart until prevEnd }
            .groupBy { it.categoryId }
            .mapValues { entry -> entry.value.sumOf { it.amountCents } }

        categoryExpenses.map { (catId, pair) ->
            val cat = categoryMap[catId]
            val prevTotal = previousExpenses[catId] ?: 0L
            val percentChange = if (prevTotal > 0L) {
                ((pair.first - prevTotal).toFloat() / prevTotal.toFloat() * 100f).toInt()
            } else {
                if (pair.first > 0L) 100 else 0
            }

            TopMoverItem(
                categoryId = catId,
                name = cat?.name ?: "Misc",
                emoji = cat?.emoji ?: "🧩",
                totalCents = pair.first,
                txCount = pair.second,
                percentageChange = percentChange
            )
        }.sortedByDescending { it.totalCents }.take(3)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Safe Area Padding at Top (since we purged the top app bar!)
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }

        // Percentage Saved Insight Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                ),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.surfaceContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.tertiary
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                "INSIGHT",
                                fontFamily = SpaceGroteskFamily,
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Column {
                        Text(
                            text = "${String.format(Locale.US, "%.1f", savedPercentage)}% Saved",
                            fontFamily = SpaceGroteskFamily,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "You've saved ${formatCurrency(savedCents, currencyCode, localeString)} this month based on your recorded cash moves.",
                            fontFamily = BeVietnamProFamily,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 22.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }

        // Monthly Spending Bar Chart
        item {
            Text(
                "Monthly Spending",
                fontFamily = SpaceGroteskFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp)
            ) {
                SimpleBarChart(
                    items = last6MonthsData.map { BarChartItem(it.expense, it.label) },
                    primaryColor = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }

        // Category Breakdown Donut Chart
        item {
            Text(
                "Category Breakdown",
                fontFamily = SpaceGroteskFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp)
            ) {
                Box(modifier = Modifier.padding(16.dp)) {
                    SimpleDonutChart(slices = donutSlices)
                }
            }
        }

        // Income vs Expense Line Chart
        item {
            Text(
                "Income vs. Expense",
                fontFamily = SpaceGroteskFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp)
            ) {
                SimpleLineChart(
                    incomeItems = last6MonthsData.map { LineChartItem(it.income, it.label) },
                    expenseItems = last6MonthsData.map { LineChartItem(it.expense, it.label) },
                    incomeColor = MaterialTheme.colorScheme.tertiary,
                    expenseColor = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }

        // Top Movers Section
        item {
            Text(
                "Top Movers",
                fontFamily = SpaceGroteskFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(
                    modifier = Modifier.padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (topMovers.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No expense data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        topMovers.forEach { mover ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.surfaceContainer),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(mover.emoji, fontSize = 22.sp)
                                    }

                                    Column {
                                        Text(
                                            mover.name,
                                            fontFamily = SpaceGroteskFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp
                                        )
                                        Text(
                                            "${mover.txCount} transactions",
                                            fontFamily = BeVietnamProFamily,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "-${formatCurrency(mover.totalCents, currencyCode, localeString)}",
                                        fontFamily = SpaceGroteskFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                    
                                    val isUp = mover.percentageChange >= 0
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = if (isUp) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                            contentDescription = null,
                                            tint = if (isUp) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            text = "${Math.abs(mover.percentageChange)}%",
                                            fontFamily = BeVietnamProFamily,
                                            fontSize = 13.sp,
                                            color = if (isUp) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Bottom spacer
        item {
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

data class MonthData(
    val label: String,
    val income: Float,
    val expense: Float
)

data class TopMoverItem(
    val categoryId: String,
    val name: String,
    val emoji: String,
    val totalCents: Long,
    val txCount: Int,
    val percentageChange: Int
)
