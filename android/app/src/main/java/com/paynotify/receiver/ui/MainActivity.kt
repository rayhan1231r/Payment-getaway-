package com.paynotify.receiver.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.paynotify.receiver.ui.screens.DiagnosticsScreen
import com.paynotify.receiver.ui.screens.HistoryScreen
import com.paynotify.receiver.ui.screens.HomeScreen
import com.paynotify.receiver.ui.screens.SettingsScreen
import com.paynotify.receiver.ui.theme.PayNotifyReceiverTheme
import com.paynotify.receiver.ui.viewmodel.MainViewModel

enum class AppScreen(val title: String, val icon: ImageVector) {
    HOME("Overview", Icons.Default.Home),
    HISTORY("Records", Icons.Default.ReceiptLong),
    SETTINGS("Settings", Icons.Default.Settings),
    DIAGNOSTICS("Diagnostics", Icons.Default.Settings)
}

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            PayNotifyReceiverTheme {
                var currentScreen by remember { mutableStateOf(AppScreen.HOME) }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        CenterAlignedTopAppBar(
                            title = {
                                Text(
                                    text = if (currentScreen == AppScreen.DIAGNOSTICS) "Diagnostics" else "PayNotify Receiver",
                                    style = MaterialTheme.typography.titleMedium
                                )
                            },
                            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        )
                    },
                    bottomBar = {
                        if (currentScreen != AppScreen.DIAGNOSTICS) {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface
                            ) {
                                NavigationBarItem(
                                    selected = currentScreen == AppScreen.HOME,
                                    onClick = { currentScreen = AppScreen.HOME },
                                    icon = { Icon(AppScreen.HOME.icon, contentDescription = AppScreen.HOME.title) },
                                    label = { Text(AppScreen.HOME.title) }
                                )
                                NavigationBarItem(
                                    selected = currentScreen == AppScreen.HISTORY,
                                    onClick = { currentScreen = AppScreen.HISTORY },
                                    icon = { Icon(AppScreen.HISTORY.icon, contentDescription = AppScreen.HISTORY.title) },
                                    label = { Text(AppScreen.HISTORY.title) }
                                )
                                NavigationBarItem(
                                    selected = currentScreen == AppScreen.SETTINGS,
                                    onClick = { currentScreen = AppScreen.SETTINGS },
                                    icon = { Icon(AppScreen.SETTINGS.icon, contentDescription = AppScreen.SETTINGS.title) },
                                    label = { Text(AppScreen.SETTINGS.title) }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Surface(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        when (currentScreen) {
                            AppScreen.HOME -> HomeScreen(
                                viewModel = viewModel,
                                onNavigateToHistory = { currentScreen = AppScreen.HISTORY }
                            )
                            AppScreen.HISTORY -> HistoryScreen(viewModel = viewModel)
                            AppScreen.SETTINGS -> SettingsScreen(
                                viewModel = viewModel,
                                onNavigateToDiagnostics = { currentScreen = AppScreen.DIAGNOSTICS }
                            )
                            AppScreen.DIAGNOSTICS -> DiagnosticsScreen(
                                viewModel = viewModel,
                                onBack = { currentScreen = AppScreen.SETTINGS }
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.refreshStats()
    }
}
