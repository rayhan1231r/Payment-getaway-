package com.paynotify.receiver.ui.screens

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.ui.viewmodel.MainViewModel

@Composable
fun HomeScreen(viewModel: MainViewModel, onNavigateToHistory: () -> Unit) {
    val context = LocalContext.current
    val total by viewModel.totalCount.collectAsState()
    val synced by viewModel.syncedCount.collectAsState()
    val pending by viewModel.pendingCount.collectAsState()
    val duplicates by viewModel.duplicateCount.collectAsState()
    val failures by viewModel.failureCount.collectAsState()

    val bkashOn by viewModel.bkashEnabled.collectAsState()
    val nagadOn by viewModel.nagadEnabled.collectAsState()
    val rocketOn by viewModel.rocketEnabled.collectAsState()
    val upayOn by viewModel.upayEnabled.collectAsState()

    var isNotificationAccessGranted by remember { mutableStateOf(viewModel.isNotificationAccessGranted()) }

    LaunchedEffect(Unit) {
        viewModel.refreshStats()
        isNotificationAccessGranted = viewModel.isNotificationAccessGranted()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Status Alert / Permission Banner
        if (!isNotificationAccessGranted) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFDC2626)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Notification Access Required",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF991B1B)
                        )
                        Text(
                            text = "PayNotify needs permission to listen for payment SMS notifications.",
                            fontSize = 12.sp,
                            color = Color(0xFFB91C1C)
                        )
                    }
                    Button(
                        onClick = {
                            context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                    ) {
                        Text("Grant", fontSize = 12.sp)
                    }
                }
            }
        } else {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF059669)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Listener Active & Background Monitoring",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF065F46)
                        )
                        Text(
                            text = "Device ID: ${viewModel.deviceId}",
                            fontSize = 11.sp,
                            color = Color(0xFF047857)
                        )
                    }
                }
            }
        }

        // Metrics Grid
        Text(
            text = "Ingestion Overview",
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Total Captured",
                value = "$total",
                icon = Icons.Default.Notifications,
                color = Color(0xFF2563EB)
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Firebase Synced",
                value = "$synced",
                icon = Icons.Default.CloudDone,
                color = Color(0xFF059669)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Pending Queue",
                value = "$pending",
                icon = Icons.Default.Sync,
                color = Color(0xFFD97706)
            )
            MetricCard(
                modifier = Modifier.weight(1f),
                title = "Duplicates Blocked",
                value = "$duplicates",
                icon = Icons.Default.Block,
                color = Color(0xFF7C3AED)
            )
        }

        // Provider Filters
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Supported Payment Providers",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp
                )
                Text(
                    text = "Only notifications from enabled providers will be captured and uploaded.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                ProviderToggleRow(
                    provider = PaymentProvider.BKASH,
                    enabled = bkashOn,
                    badgeColor = Color(0xFFE2136E),
                    onToggle = { viewModel.toggleProvider(PaymentProvider.BKASH, it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                ProviderToggleRow(
                    provider = PaymentProvider.NAGAD,
                    enabled = nagadOn,
                    badgeColor = Color(0xFFF7941D),
                    onToggle = { viewModel.toggleProvider(PaymentProvider.NAGAD, it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                ProviderToggleRow(
                    provider = PaymentProvider.ROCKET,
                    enabled = rocketOn,
                    badgeColor = Color(0xFF8C1D82),
                    onToggle = { viewModel.toggleProvider(PaymentProvider.ROCKET, it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                ProviderToggleRow(
                    provider = PaymentProvider.UPAY,
                    enabled = upayOn,
                    badgeColor = Color(0xFF005BAC),
                    onToggle = { viewModel.toggleProvider(PaymentProvider.UPAY, it) }
                )
            }
        }

        // Action Buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = { viewModel.triggerSyncNow() },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Retry Sync")
            }

            Button(
                onClick = onNavigateToHistory,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.ReceiptLong, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("View History")
            }
        }
    }
}

@Composable
fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    color: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = title,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                color = color
            )
        }
    }
}

@Composable
fun ProviderToggleRow(
    provider: PaymentProvider,
    enabled: Boolean,
    badgeColor: Color,
    onToggle: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(badgeColor)
            )
            Column {
                Text(
                    text = provider.displayName,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp
                )
                Text(
                    text = "ID: ${provider.id} | Parsers Active",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            }
        }
        Switch(
            checked = enabled,
            onCheckedChange = onToggle
        )
    }
}
