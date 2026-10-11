package com.paynotify.receiver.ui.screens

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paynotify.receiver.ui.viewmodel.MainViewModel

@Composable
fun SettingsScreen(viewModel: MainViewModel, onNavigateToDiagnostics: () -> Unit) {
    val context = LocalContext.current
    var isNotificationGranted by remember { mutableStateOf(viewModel.isNotificationAccessGranted()) }

    LaunchedEffect(Unit) {
        isNotificationGranted = viewModel.isNotificationAccessGranted()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Permissions Section
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "System Permissions",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )

                SettingsItem(
                    title = "Notification Access",
                    subtitle = if (isNotificationGranted) "Granted (Active)" else "Required to capture SMS alerts",
                    icon = Icons.Default.NotificationsActive,
                    iconTint = if (isNotificationGranted) Color(0xFF059669) else Color(0xFFDC2626),
                    trailingAction = {
                        TextButton(onClick = {
                            context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                        }) {
                            Text(if (isNotificationGranted) "Manage" else "Enable")
                        }
                    }
                )

                HorizontalDivider()

                SettingsItem(
                    title = "Battery Optimization",
                    subtitle = "Disable optimization to avoid background sleep",
                    icon = Icons.Default.BatteryChargingFull,
                    iconTint = Color(0xFFD97706),
                    trailingAction = {
                        TextButton(onClick = {
                            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                            context.startActivity(intent)
                        }) {
                            Text("Exempt")
                        }
                    }
                )
            }
        }

        // Firebase & Device Section
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Cloud Ingestion & Device",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )

                SettingsItem(
                    title = "Firebase Realtime DB",
                    subtitle = "Structure: /notificationTransactions/{recordId}",
                    icon = Icons.Default.CloudQueue,
                    iconTint = Color(0xFF0284C7)
                )

                HorizontalDivider()

                SettingsItem(
                    title = "Registered Device ID",
                    subtitle = viewModel.deviceId,
                    icon = Icons.Default.Smartphone,
                    iconTint = Color(0xFF64748B)
                )

                HorizontalDivider()

                Button(
                    onClick = { viewModel.triggerSyncNow() },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Retry Pending Uploads Now")
                }
            }
        }

        // Diagnostics & Privacy
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Diagnostics & Security Policy",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )

                SettingsItem(
                    title = "System Diagnostics",
                    subtitle = "Inspect parser tests, drop rate, and rules status",
                    icon = Icons.Default.BugReport,
                    iconTint = Color(0xFF7C3AED),
                    trailingAction = {
                        IconButton(onClick = onNavigateToDiagnostics) {
                            Icon(Icons.Default.ChevronRight, contentDescription = null)
                        }
                    }
                )

                HorizontalDivider()

                SettingsItem(
                    title = "Strict Data Minimization",
                    subtitle = "Raw SMS bodies are never uploaded to Firebase; only parsed financial metadata is transmitted.",
                    icon = Icons.Default.Security,
                    iconTint = Color(0xFF059669)
                )

                HorizontalDivider()

                SettingsItem(
                    title = "Anti-Fraud Architecture",
                    subtitle = "Transactions are strictly tagged as 'unverified'. Only backend reconciliation confers payment clearance.",
                    icon = Icons.Default.VerifiedUser,
                    iconTint = Color(0xFF2563EB)
                )
            }
        }

        // About Footer
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "PayNotify Receiver v1.0.0 (Build 1)",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
            Text(
                text = "Designed for bKash, Nagad, Rocket, Upay • Native Android Kotlin",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
            )
        }
    }
}

@Composable
fun SettingsItem(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconTint: Color = MaterialTheme.colorScheme.primary,
    trailingAction: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(24.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp
            )
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        trailingAction?.invoke()
    }
}
