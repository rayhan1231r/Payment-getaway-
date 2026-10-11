package com.paynotify.receiver.ui.viewmodel

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paynotify.receiver.data.local.AppDatabase
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.data.model.TransactionRecord
import com.paynotify.receiver.data.remote.FirebaseRepository
import com.paynotify.receiver.parser.ProviderParserFactory
import com.paynotify.receiver.service.PayNotificationListenerService
import com.paynotify.receiver.util.DeviceIdProvider
import com.paynotify.receiver.worker.SyncWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val db = AppDatabase.getInstance(application)
    private val parserFactory = ProviderParserFactory(application)
    private val firebaseRepo = FirebaseRepository(application)

    val deviceId = DeviceIdProvider.getOrCreateDeviceId(application)

    val totalCount = db.transactionDao().countTotal()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val syncedCount = db.transactionDao().countSynced()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val pendingCount = db.transactionDao().countPending()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    private val _duplicateCount = MutableStateFlow(getStoredStat("stat_duplicates"))
    val duplicateCount: StateFlow<Int> = _duplicateCount

    private val _failureCount = MutableStateFlow(getStoredStat("stat_failures"))
    val failureCount: StateFlow<Int> = _failureCount

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery

    private val _selectedProviderFilter = MutableStateFlow<PaymentProvider?>(null)
    val selectedProviderFilter: StateFlow<PaymentProvider?> = _selectedProviderFilter

    val allTransactions: StateFlow<List<TransactionRecord>> =
        _searchQuery.flatMapLatest { query ->
            if (query.isBlank()) {
                db.transactionDao().getAllTransactions()
            } else {
                db.transactionDao().searchTransactions(query)
            }
        }.combine(_selectedProviderFilter) { list, filter ->
            if (filter == null) list else list.filter { it.paymentMethod == filter.id }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Provider switch states
    val bkashEnabled = MutableStateFlow(parserFactory.isProviderEnabled(PaymentProvider.BKASH))
    val nagadEnabled = MutableStateFlow(parserFactory.isProviderEnabled(PaymentProvider.NAGAD))
    val rocketEnabled = MutableStateFlow(parserFactory.isProviderEnabled(PaymentProvider.ROCKET))
    val upayEnabled = MutableStateFlow(parserFactory.isProviderEnabled(PaymentProvider.UPAY))

    fun isNotificationAccessGranted(): Boolean {
        val app = getApplication<Application>()
        val packageNames = NotificationManagerCompat.getEnabledListenerPackages(app)
        return packageNames.contains(app.packageName)
    }

    fun isFirebaseConnected(): Boolean = firebaseRepo.isConnected()

    fun toggleProvider(provider: PaymentProvider, enabled: Boolean) {
        parserFactory.setProviderEnabled(provider, enabled)
        when (provider) {
            PaymentProvider.BKASH -> bkashEnabled.value = enabled
            PaymentProvider.NAGAD -> nagadEnabled.value = enabled
            PaymentProvider.ROCKET -> rocketEnabled.value = enabled
            PaymentProvider.UPAY -> upayEnabled.value = enabled
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setProviderFilter(provider: PaymentProvider?) {
        _selectedProviderFilter.value = provider
    }

    fun triggerSyncNow() {
        SyncWorker.scheduleSync(getApplication())
    }

    fun refreshStats() {
        _duplicateCount.value = getStoredStat("stat_duplicates")
        _failureCount.value = getStoredStat("stat_failures")
    }

    private fun getStoredStat(key: String): Int {
        val prefs = getApplication<Application>().getSharedPreferences("paynotify_stats", Context.MODE_PRIVATE)
        return prefs.getInt(key, 0)
    }
}
