package com.walsoup.gemwallet.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.walsoup.gemwallet.ui.theme.BeVietnamProFamily

data class NavTab(
    val id: String,
    val label: String,
    val activeIcon: ImageVector,
    val inactiveIcon: ImageVector
)

@Composable
fun FloatingBottomNav(
    activeTab: String,
    onTabSelected: (String) -> Unit,
    aiFeaturesEnabled: Boolean,
    modifier: Modifier = Modifier
) {
    val tabs = remember(aiFeaturesEnabled) {
        val list = mutableListOf(
            NavTab("home", "Home", Icons.Filled.Home, Icons.Outlined.Home),
            NavTab("analytics", "Insights", Icons.Filled.PieChart, Icons.Outlined.PieChart)
        )
        if (aiFeaturesEnabled) {
            list.add(NavTab("chat", "Chat", Icons.Filled.Chat, Icons.Outlined.Chat))
        }
        list.add(NavTab("planning", "Plan", Icons.Filled.Flag, Icons.Outlined.Flag))
        list.add(NavTab("settings", "Settings", Icons.Filled.Settings, Icons.Outlined.Settings))
        list
    }

    val activeIndex = remember(activeTab, tabs) {
        tabs.indexOfFirst { it.id == activeTab }.coerceAtLeast(0)
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp)
            .shadow(
                elevation = 16.dp,
                shape = RoundedCornerShape(36.dp),
                clip = false,
                ambientColor = Color.Black.copy(alpha = 0.5f),
                spotColor = Color.Black.copy(alpha = 0.5f)
            )
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                        MaterialTheme.colorScheme.surface.copy(alpha = 0.90f)
                    )
                ),
                shape = RoundedCornerShape(36.dp)
            )
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                shape = RoundedCornerShape(36.dp)
            )
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        val containerWidth = maxWidth
        val tabCount = tabs.size
        val tabWidth = containerWidth / tabCount

        // Sliding background pill indicator
        val indicatorOffset by animateDpAsState(
            targetValue = tabWidth * activeIndex,
            animationSpec = spring(
                dampingRatio = 0.8f,
                stiffness = 180f
            ),
            label = "NavIndicatorOffset"
        )

        Box(
            modifier = Modifier
                .offset(x = indicatorOffset)
                .width(tabWidth)
                .fillMaxHeight()
                .padding(4.dp)
                .background(
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f),
                    shape = RoundedCornerShape(28.dp)
                )
        )

        // Navigation Items
        Row(
            modifier = Modifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEach { tab ->
                val isSelected = tab.id == activeTab
                
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .bouncyClickable(
                            scaleTo = 0.90f,
                            onClick = { onTabSelected(tab.id) }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxHeight()
                    ) {
                        Icon(
                            imageVector = if (isSelected) tab.activeIcon else tab.inactiveIcon,
                            contentDescription = tab.label,
                            tint = if (isSelected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            modifier = Modifier.size(24.dp)
                        )
                        
                        Spacer(modifier = Modifier.height(4.dp))
                        
                        Text(
                            text = tab.label,
                            fontFamily = BeVietnamProFamily,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }
                }
            }
        }
    }
}
