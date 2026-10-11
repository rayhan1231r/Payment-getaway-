package com.paynotify.receiver.service

import android.app.Notification
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import android.util.LruCache
import com.paynotify.receiver.data.local.AppDatabase
import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.TransactionRecord
import com.paynotify.receiver.data.remote.FirebaseRepository
import com.paynotify.receiver.parser.ProviderParserFactory
import com.paynotify.receiver.util.DeviceIdProvider
import com.paynotify.receiver.worker.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class PayNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var database: AppDatabase
    private lateinit var parserFactory: ProviderParserFactory
    private lateinit var firebaseRepo: FirebaseRepository
    private lateinit var deviceId: String

    // Deduplicate rapid repeat callbacks from Android system for the same notification event
    private val processedNotificationCache = LruCache<String, Long>(100)

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.getInstance(applicationContext)
        parserFactory = ProviderParserFactory(applicationContext)
        firebaseRepo = FirebaseRepository(applicationContext)
        deviceId = DeviceIdProvider.getOrCreateDeviceId(applicationContext)
        Log.i(TAG, "PayNotificationListenerService initialized for device: $deviceId")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return
        val postTime = sbn.postTime
        val notificationId = sbn.id

        // Cache key to avoid duplicate callback processing for identical notification post
        val eventKey = "${pkgName}_${notificationId}_$postTime"
        synchronized(processedNotificationCache) {
            if (processedNotificationCache.get(eventKey) != null) {
                return
            }
            processedNotificationCache.put(eventKey, postTime)
        }

        // Process in background coroutine without blocking OS notification pipeline
        serviceScope.launch {
            processNotification(sbn)
        }
    }

    private suspend fun processNotification(sbn: StatusBarNotification) {
        val extras = sbn.notification?.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        var text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        // Try getting expanded text or big text if standard text is truncated
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        if (!bigText.isNullOrBlank() && bigText.length > text.length) {
            text = bigText
        }

        // Also check inbox style text lines for bundled SMS
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            val joined = textLines.joinToString("\n") { it.toString() }
            if (joined.length > text.length) {
                text = joined
            }
        }

        if (text.isBlank()) return

        val pkgName = sbn.packageName
        val sender = title.ifBlank { null }

        // Attempt parse across configured providers
        val parseResult = parserFactory.parse(sender = sender, title = title, text = text)

        when (parseResult) {
            is ParseResult.Success -> {
                handleSuccessfulParse(parseResult, sbn, pkgName)
            }
            is ParseResult.Ignored -> {
                Log.d(TAG, "Notification ignored: ${parseResult.reason}")
            }
            is ParseResult.Failed -> {
                Log.w(TAG, "Notification parse failed: ${parseResult.error} | Raw: ${parseResult.rawSnippet}")
                incrementFailureCount()
            }
        }
    }

    private suspend fun handleSuccessfulParse(
        result: ParseResult.Success,
        sbn: StatusBarNotification,
        pkgName: String
    ) {
        val recordId = TransactionRecord.buildRecordId(result.provider, result.transactionId)

        // Local duplicate check
        if (database.transactionDao().exists(recordId)) {
            Log.i(TAG, "Duplicate transaction detected and ignored: $recordId")
            incrementDuplicateCount()
            return
        }

        val isSmsApp = isMessagingPackage(pkgName)
        val sourceType = if (isSmsApp) "sms_notification" else "app_notification"

        val record = TransactionRecord(
            recordId = recordId,
            paymentMethod = result.provider.id,
            transactionId = result.transactionId,
            amountPoisha = result.amountPoisha,
            currency = result.currency,
            transactionType = result.transactionType,
            notificationTimestamp = sbn.postTime,
            receivedAt = System.currentTimeMillis(),
            sourceType = sourceType,
            sourcePackage = pkgName,
            verificationStatus = "unverified", // ALWAYS UNVERIFIED
            deviceId = deviceId,
            syncStatus = "pending",
            sender = result.senderNumber ?: sbn.notification.extras.getString(Notification.EXTRA_TITLE),
            feePoisha = result.feePoisha,
            balancePoisha = result.balancePoisha
        )

        // Save locally to Room DB first
        val insertRow = database.transactionDao().insert(record)
        if (insertRow == -1L) {
            // Already existed (race condition)
            incrementDuplicateCount()
            return
        }

        // Attempt immediate Firebase Realtime Database upload
        val uploadResult = firebaseRepo.uploadTransaction(record)
        if (uploadResult.isSuccess) {
            database.transactionDao().updateSyncResult(
                recordId = record.recordId,
                status = "synced",
                error = null
            )
            Log.i(TAG, "Successfully synced transaction to Firebase: $recordId")
        } else {
            val error = uploadResult.exceptionOrNull()?.message ?: "Upload failed"
            Log.w(TAG, "Firebase sync failed for $recordId, queuing WorkManager retry: $error")
            database.transactionDao().updateSyncResult(
                recordId = record.recordId,
                status = "pending",
                error = error
            )
            SyncWorker.scheduleSync(applicationContext)
        }
    }

    private fun isMessagingPackage(pkgName: String): Boolean {
        val knownSmsPackages = listOf(
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            "com.android.mms",
            "com.oneplus.mms",
            "com.xiaomi.mms",
            "com.coloros.mms"
        )
        return knownSmsPackages.contains(pkgName) || pkgName.contains("messaging") || pkgName.contains("mms")
    }

    private fun incrementDuplicateCount() {
        val prefs = applicationContext.getSharedPreferences("paynotify_stats", MODE_PRIVATE)
        val current = prefs.getInt("stat_duplicates", 0)
        prefs.edit().putInt("stat_duplicates", current + 1).apply()
    }

    private fun incrementFailureCount() {
        val prefs = applicationContext.getSharedPreferences("paynotify_stats", MODE_PRIVATE)
        val current = prefs.getInt("stat_failures", 0)
        prefs.edit().putInt("stat_failures", current + 1).apply()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Safe dismissal handling without crashing
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "PayNotificationListenerService stopped")
    }

    companion object {
        private const val TAG = "PayNotifyService"
    }
}
