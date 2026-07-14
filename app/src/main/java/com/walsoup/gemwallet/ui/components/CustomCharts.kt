package com.walsoup.gemwallet.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import java.util.Locale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily
import com.walsoup.gemwallet.ui.theme.SpaceGroteskFamily

// 1. Bar Chart Data Class
data class BarChartItem(
    val value: Float,
    val label: String
)

@Composable
fun SimpleBarChart(
    items: List<BarChartItem>,
    primaryColor: Color,
    modifier: Modifier = Modifier,
    height: Int = 180
) {
    if (items.isEmpty()) {
        Box(modifier = modifier.height(height.dp), contentAlignment = Alignment.Center) {
            Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val maxValue = remember(items) { items.maxOf { it.value }.coerceAtLeast(1f) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(height.dp)
            .padding(top = 16.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        items.forEach { item ->
            val fraction = item.value / maxValue
            val animatedHeightFraction by animateFloatAsState(
                targetValue = fraction,
                animationSpec = tween(durationMillis = 600)
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom,
                modifier = Modifier.weight(1f)
            ) {
                // The Bar
                Box(
                    modifier = Modifier
                        .width(22.dp)
                        .fillMaxHeight(0.85f * animatedHeightFraction)
                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                        .background(primaryColor)
                )
                Spacer(modifier = Modifier.height(8.dp))
                // Label
                Text(
                    text = item.label,
                    fontFamily = BeVietnamProFamily,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// 2. Donut Chart Slice
data class DonutSlice(
    val value: Float,
    val color: Color,
    val label: String,
    val emoji: String
)

@Composable
fun SimpleDonutChart(
    slices: List<DonutSlice>,
    modifier: Modifier = Modifier,
    size: Int = 140
) {
    if (slices.isEmpty()) {
        Box(modifier = modifier.size(size.dp), contentAlignment = Alignment.Center) {
            Text("No data", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val total = remember(slices) { slices.sumOf { it.value.toDouble() }.toFloat() }
    val animatedScale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 800)
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceAround
    ) {
        // Draw Donut Ring
        Box(
            modifier = Modifier.size(size.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val strokeWidth = 24.dp.toPx()
                val radius = (size.dp.toPx() - strokeWidth) / 2
                val arcSize = Size(radius * 2, radius * 2)
                val offset = Offset(strokeWidth / 2, strokeWidth / 2)

                var startAngle = -90f
                slices.forEach { slice ->
                    val sweepAngle = (slice.value / total) * 360f * animatedScale
                    drawArc(
                        color = slice.color,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = false,
                        topLeft = offset,
                        size = arcSize,
                        style = Stroke(width = strokeWidth)
                    )
                    startAngle += sweepAngle
                }
            }
            // Inner center text
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Expenses",
                    fontFamily = SpaceGroteskFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Legend
        Column(
            modifier = Modifier.padding(start = 16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            slices.take(4).forEach { slice ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(slice.color)
                    )
                    Text(
                        text = "${slice.emoji} ${slice.label} (${String.format(Locale.US, "%.0f%%", (slice.value / total) * 100)})",
                        fontFamily = BeVietnamProFamily,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

// 3. Line Chart Item
data class LineChartItem(
    val value: Float,
    val label: String
)

@Composable
fun SimpleLineChart(
    incomeItems: List<LineChartItem>,
    expenseItems: List<LineChartItem>,
    incomeColor: Color,
    expenseColor: Color,
    modifier: Modifier = Modifier,
    height: Int = 180
) {
    val itemsCount = incomeItems.size
    if (itemsCount == 0) {
        Box(modifier = modifier.height(height.dp), contentAlignment = Alignment.Center) {
            Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    val maxVal = remember(incomeItems, expenseItems) {
        val maxIncome = incomeItems.maxOfOrNull { it.value } ?: 0f
        val maxExpense = expenseItems.maxOfOrNull { it.value } ?: 0f
        maxOf(maxIncome, maxExpense, 1f)
    }

    val animatedProgress by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 800)
    )

    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height.dp)
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            val width = size.width
            val graphHeight = size.height
            val spacingX = width / (itemsCount - 1).coerceAtLeast(1)

            val incomePoints = incomeItems.mapIndexed { idx, item ->
                Offset(idx * spacingX, graphHeight - (item.value / maxVal) * graphHeight * animatedProgress)
            }

            val expensePoints = expenseItems.mapIndexed { idx, item ->
                Offset(idx * spacingX, graphHeight - (item.value / maxVal) * graphHeight * animatedProgress)
            }

            // Helper to draw connection lines
            fun drawLinePath(points: List<Offset>, color: Color) {
                if (points.size < 2) return
                val path = Path().apply {
                    moveTo(points[0].x, points[0].y)
                    for (i in 1 until points.size) {
                        lineTo(points[i].x, points[i].y)
                    }
                }
                drawPath(
                    path = path,
                    color = color,
                    style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                )
                // Draw dots
                points.forEach { point ->
                    drawCircle(
                        color = color,
                        radius = 5.dp.toPx(),
                        center = point
                    )
                    drawCircle(
                        color = Color.White,
                        radius = 2.5.dp.toPx(),
                        center = point
                    )
                }
            }

            // Draw Lines
            drawLinePath(incomePoints, incomeColor)
            drawLinePath(expensePoints, expenseColor)
        }

        // X-Axis labels
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            incomeItems.forEach { item ->
                Text(
                    text = item.label,
                    fontFamily = BeVietnamProFamily,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
