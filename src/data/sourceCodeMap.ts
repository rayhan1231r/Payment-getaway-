export const SOURCE_CODE_MAP: Record<string, string> = {
  "android/app/src/main/java/com/paynotify/receiver/service/PayNotificationListenerService.kt": `package com.paynotify.receiver.service

import android.app.Notification
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
        Log.i(TAG, "PayNotificationListenerService initialized for device: \$deviceId")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return
        val postTime = sbn.postTime
        val notificationId = sbn.id

        val eventKey = "\${pkgName}_\${notificationId}_\$postTime"
        synchronized(processedNotificationCache) {
            if (processedNotificationCache.get(eventKey) != null) {
                return
            }
            processedNotificationCache.put(eventKey, postTime)
        }

        serviceScope.launch {
            processNotification(sbn)
        }
    }

    private suspend fun processNotification(sbn: StatusBarNotification) {
        val extras = sbn.notification?.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        var text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        if (!bigText.isNullOrBlank() && bigText.length > text.length) {
            text = bigText
        }

        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            val joined = textLines.joinToString("\\n") { it.toString() }
            if (joined.length > text.length) {
                text = joined
            }
        }

        if (text.isBlank()) return

        val pkgName = sbn.packageName
        val sender = title.ifBlank { null }

        val parseResult = parserFactory.parse(sender = sender, title = title, text = text)

        when (parseResult) {
            is ParseResult.Success -> handleSuccessfulParse(parseResult, sbn, pkgName)
            is ParseResult.Ignored -> Log.d(TAG, "Notification ignored: \${parseResult.reason}")
            is ParseResult.Failed -> Log.w(TAG, "Notification parse failed: \${parseResult.error}")
        }
    }

    private suspend fun handleSuccessfulParse(
        result: ParseResult.Success,
        sbn: StatusBarNotification,
        pkgName: String
    ) {
        val recordId = TransactionRecord.buildRecordId(result.provider, result.transactionId)

        if (database.transactionDao().exists(recordId)) {
            Log.i(TAG, "Duplicate transaction detected and ignored: \$recordId")
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

        val insertRow = database.transactionDao().insert(record)
        if (insertRow == -1L) return

        val uploadResult = firebaseRepo.uploadTransaction(record)
        if (uploadResult.isSuccess) {
            database.transactionDao().updateSyncResult(record.recordId, "synced", null)
        } else {
            val error = uploadResult.exceptionOrNull()?.message ?: "Upload failed"
            database.transactionDao().updateSyncResult(record.recordId, "pending", error)
            SyncWorker.scheduleSync(applicationContext)
        }
    }

    private fun isMessagingPackage(pkgName: String): Boolean {
        return pkgName.contains("messaging") || pkgName.contains("mms")
    }

    companion object {
        private const val TAG = "PayNotifyService"
    }
}`,

  "android/app/src/main/java/com/paynotify/receiver/parser/BkashParser.kt": `package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class BkashParser : NotificationParser {
    override val provider: PaymentProvider = PaymentProvider.BKASH

    private val promoKeywords = listOf("offer", "cashback offer", "recharge", "bonus", "discount", "survey", "win")
    private val securityKeywords = listOf("verification code", "security code", "otp", "pin", "login detected")

    private val trxIdPattern = Pattern.compile("(?:TrxID|Trx\\\\s*ID|trxid|TRXID)\\\\s*[:\\\\s]\\\\s*([A-Za-z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val receivedAmountPattern = Pattern.compile("(?:received(?:\\\\s+deposit\\\\s+of)?|Cash\\\\s+In|Payment)\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val feePattern = Pattern.compile("Fee\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val balancePattern = Pattern.compile("Balance\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val senderPattern = Pattern.compile("(?:from|to)\\\\s+([0-9+]{11,14})", Pattern.CASE_INSENSITIVE)

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        return s.contains("bkash") || s == "16247" || text.lowercase().contains("trxid") || text.lowercase().contains("bkash")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        for (kw in securityKeywords) {
            if (lower.contains(kw)) return ParseResult.Ignored("Ignored security / OTP alert (\$kw)")
        }

        if (!trxIdPattern.matcher(cleanText).find()) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) return ParseResult.Ignored("Ignored promotional message (\$kw)")
            }
            return ParseResult.Failed("Missing bKash TrxID in notification message", rawSnippet = cleanText)
        }

        val trxMatcher = trxIdPattern.matcher(cleanText)
        if (!trxMatcher.find()) return ParseResult.Failed("Unable to extract valid bKash TrxID", rawSnippet = cleanText)
        val rawTrxId = trxMatcher.group(1)?.trim()?.uppercase() ?: return ParseResult.Failed("Missing TrxID")

        val amountMatcher = receivedAmountPattern.matcher(cleanText)
        if (!amountMatcher.find()) return ParseResult.Failed("Transaction amount could not be parsed", rawSnippet = cleanText)
        val rawAmount = amountMatcher.group(1)?.trim() ?: ""
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount) ?: return ParseResult.Failed("Invalid amount: \$rawAmount")

        val feeMatcher = feePattern.matcher(cleanText)
        val feePoisha = if (feeMatcher.find()) CurrencyUtils.parseAmountToPoisha(feeMatcher.group(1) ?: "0") ?: 0L else 0L

        val balanceMatcher = balancePattern.matcher(cleanText)
        val balancePoisha = if (balanceMatcher.find()) CurrencyUtils.parseAmountToPoisha(balanceMatcher.group(1) ?: "") else null

        val senderMatcher = senderPattern.matcher(cleanText)
        val senderNumber = if (senderMatcher.find()) senderMatcher.group(1)?.trim() else null

        val type = when {
            lower.contains("cash in") -> "cash_in"
            lower.contains("deposit") -> "deposit"
            lower.contains("payment") -> "payment"
            else -> "received"
        }

        return ParseResult.Success(provider, rawTrxId, amountPoisha, "BDT", type, feePoisha, balancePoisha, senderNumber)
    }
}`,

  "android/app/src/main/java/com/paynotify/receiver/parser/NagadParser.kt": `package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class NagadParser : NotificationParser {
    override val provider: PaymentProvider = PaymentProvider.NAGAD
    private val promoKeywords = listOf("cashback", "offer", "discount", "recharge", "bonus", "reward")
    private val securityKeywords = listOf("otp", "pin", "verification", "security code", "login")

    private val txnIdPattern = Pattern.compile("(?:TxnID|Txn\\\\s*ID|TrxID|Trx\\\\s*ID)\\\\s*[:\\\\s]\\\\s*([A-Za-z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val amountPattern = Pattern.compile("(?:Amount\\\\s*:\\\\s*(?:Tk|BDT|৳)?\\\\.?\\\\s*|Received\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*|Cash\\\\s+In\\\\s*:\\\\s*(?:Amount\\\\s*:\\\\s*)?(?:Tk|BDT|৳)?\\\\.?\\\\s*)([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val feePattern = Pattern.compile("Fee\\\\s*:\\\\s*(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val balancePattern = Pattern.compile("Balance\\\\s*:\\\\s*(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val senderPattern = Pattern.compile("(?:Sender|from)\\\\s*:\\\\s*([0-9+]{11,14})", Pattern.CASE_INSENSITIVE)

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        return s.contains("nagad") || s == "16167" || text.lowercase().contains("nagad")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        for (kw in securityKeywords) {
            if (lower.contains(kw)) return ParseResult.Ignored("Ignored security / OTP alert (\$kw)")
        }

        if (!txnIdPattern.matcher(cleanText).find()) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) return ParseResult.Ignored("Ignored promotional message (\$kw)")
            }
            return ParseResult.Failed("Missing Nagad TxnID in message", rawSnippet = cleanText)
        }

        val txnMatcher = txnIdPattern.matcher(cleanText)
        if (!txnMatcher.find()) return ParseResult.Failed("Unable to extract Nagad TxnID", rawSnippet = cleanText)
        val rawTxnId = txnMatcher.group(1)?.trim()?.uppercase() ?: return ParseResult.Failed("Missing TxnID")

        val amountMatcher = amountPattern.matcher(cleanText)
        if (!amountMatcher.find()) return ParseResult.Failed("Could not parse Nagad amount", rawSnippet = cleanText)
        val rawAmount = amountMatcher.group(1)?.trim() ?: ""
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount) ?: return ParseResult.Failed("Invalid amount: \$rawAmount")

        val feeMatcher = feePattern.matcher(cleanText)
        val feePoisha = if (feeMatcher.find()) CurrencyUtils.parseAmountToPoisha(feeMatcher.group(1) ?: "0") ?: 0L else 0L

        val balanceMatcher = balancePattern.matcher(cleanText)
        val balancePoisha = if (balanceMatcher.find()) CurrencyUtils.parseAmountToPoisha(balanceMatcher.group(1) ?: "") else null

        val senderMatcher = senderPattern.matcher(cleanText)
        val senderNumber = if (senderMatcher.find()) senderMatcher.group(1)?.trim() else null

        val type = when {
            lower.contains("cash in") -> "cash_in"
            lower.contains("money received") || lower.contains("received") -> "received"
            else -> "payment"
        }

        return ParseResult.Success(provider, rawTxnId, amountPoisha, "BDT", type, feePoisha, balancePoisha, senderNumber)
    }
}`,

  "android/app/src/main/java/com/paynotify/receiver/parser/RocketParser.kt": `package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class RocketParser : NotificationParser {
    override val provider: PaymentProvider = PaymentProvider.ROCKET
    private val promoKeywords = listOf("offer", "cashback", "discount", "recharge", "bonus", "reward")
    private val securityKeywords = listOf("security code", "otp", "pin", "verification", "password")

    private val txnIdPattern = Pattern.compile("(?:TxnId|TxnID|Txn\\\\s*ID|TrxId|TrxID)\\\\s*[:\\\\s]\\\\s*([0-9A-Za-z]{6,16})", Pattern.CASE_INSENSITIVE)
    private val amountPattern = Pattern.compile("(?:Tk\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)\\\\s*(?:received|credited)|credited\\\\s+with\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)|(?:Money\\\\s+)?received.*?Tk\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?))", Pattern.CASE_INSENSITIVE)
    private val feePattern = Pattern.compile("Fee\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val balancePattern = Pattern.compile("Balance\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val senderPattern = Pattern.compile("(?:from)\\\\s+([0-9]{11,12})", Pattern.CASE_INSENSITIVE)

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        return s.contains("rocket") || s == "16216" || s.contains("dbbl") || text.lowercase().contains("rocket") || text.lowercase().contains("dbbl")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        for (kw in securityKeywords) {
            if (lower.contains(kw)) return ParseResult.Ignored("Ignored security / OTP alert (\$kw)")
        }

        if (!txnIdPattern.matcher(cleanText).find()) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) return ParseResult.Ignored("Ignored promotional message (\$kw)")
            }
            return ParseResult.Failed("Missing Rocket TxnId in message", rawSnippet = cleanText)
        }

        val txnMatcher = txnIdPattern.matcher(cleanText)
        if (!txnMatcher.find()) return ParseResult.Failed("Unable to extract Rocket TxnId", rawSnippet = cleanText)
        val rawTxnId = txnMatcher.group(1)?.trim()?.uppercase() ?: return ParseResult.Failed("Missing TxnId")

        val amountMatcher = amountPattern.matcher(cleanText)
        var rawAmount: String? = null
        if (amountMatcher.find()) {
            rawAmount = amountMatcher.group(1) ?: amountMatcher.group(2) ?: amountMatcher.group(3)
        }
        if (rawAmount.isNullOrEmpty()) return ParseResult.Failed("Could not parse Rocket amount", rawSnippet = cleanText)
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount) ?: return ParseResult.Failed("Invalid amount: \$rawAmount")

        val feeMatcher = feePattern.matcher(cleanText)
        val feePoisha = if (feeMatcher.find()) CurrencyUtils.parseAmountToPoisha(feeMatcher.group(1) ?: "0") ?: 0L else 0L

        val balanceMatcher = balancePattern.matcher(cleanText)
        val balancePoisha = if (balanceMatcher.find()) CurrencyUtils.parseAmountToPoisha(balanceMatcher.group(1) ?: "") else null

        val senderMatcher = senderPattern.matcher(cleanText)
        val senderNumber = if (senderMatcher.find()) senderMatcher.group(1)?.trim() else null

        val type = if (lower.contains("credited") || lower.contains("received")) "received" else "payment"
        return ParseResult.Success(provider, rawTxnId, amountPoisha, "BDT", type, feePoisha, balancePoisha, senderNumber)
    }
}`,

  "android/app/src/main/java/com/paynotify/receiver/parser/UpayParser.kt": `package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class UpayParser : NotificationParser {
    override val provider: PaymentProvider = PaymentProvider.UPAY
    private val promoKeywords = listOf("offer", "cashback", "bonus", "discount", "recharge", "reward")
    private val securityKeywords = listOf("verification", "otp", "pin", "security code", "login")

    private val txnIdPattern = Pattern.compile("(?:TxnID|Txn\\\\s*ID|TrxID|Trx\\\\s*ID)\\\\s*[:\\\\s]\\\\s*([A-Za-z0-9]{6,16})", Pattern.CASE_INSENSITIVE)
    private val amountPattern = Pattern.compile("(?:(?:Money\\\\s+)?received\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*|Amount\\\\s*:\\\\s*(?:Tk|BDT|৳)?\\\\.?\\\\s*|Cash\\\\s+In(?:\\\\s*:\\\\s*(?:Amount\\\\s*:\\\\s*)?)?(?:Tk|BDT|৳)?\\\\.?\\\\s*)([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val feePattern = Pattern.compile("Fee\\\\s+(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val balancePattern = Pattern.compile("(?:Available\\\\s+)?Balance\\\\s*:\\\\s*(?:Tk|BDT|৳)?\\\\.?\\\\s*([0-9,]+(?:\\\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE)
    private val senderPattern = Pattern.compile("(?:from)\\\\s+([0-9+]{11,14})", Pattern.CASE_INSENSITIVE)

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        return s.contains("upay") || s == "16268" || text.lowercase().contains("upay")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        for (kw in securityKeywords) {
            if (lower.contains(kw)) return ParseResult.Ignored("Ignored security / OTP alert (\$kw)")
        }

        if (!txnIdPattern.matcher(cleanText).find()) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) return ParseResult.Ignored("Ignored promotional message (\$kw)")
            }
            return ParseResult.Failed("Missing Upay TxnID in message", rawSnippet = cleanText)
        }

        val txnMatcher = txnIdPattern.matcher(cleanText)
        if (!txnMatcher.find()) return ParseResult.Failed("Unable to extract Upay TxnID", rawSnippet = cleanText)
        val rawTxnId = txnMatcher.group(1)?.trim()?.uppercase() ?: return ParseResult.Failed("Missing TxnID")

        val amountMatcher = amountPattern.matcher(cleanText)
        if (!amountMatcher.find()) return ParseResult.Failed("Could not parse Upay amount", rawSnippet = cleanText)
        val rawAmount = amountMatcher.group(1)?.trim() ?: ""
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount) ?: return ParseResult.Failed("Invalid amount: \$rawAmount")

        val feeMatcher = feePattern.matcher(cleanText)
        val feePoisha = if (feeMatcher.find()) CurrencyUtils.parseAmountToPoisha(feeMatcher.group(1) ?: "0") ?: 0L else 0L

        val balanceMatcher = balancePattern.matcher(cleanText)
        val balancePoisha = if (balanceMatcher.find()) CurrencyUtils.parseAmountToPoisha(balanceMatcher.group(1) ?: "") else null

        val senderMatcher = senderPattern.matcher(cleanText)
        val senderNumber = if (senderMatcher.find()) senderMatcher.group(1)?.trim() else null

        val type = when {
            lower.contains("cash in") -> "cash_in"
            lower.contains("received") -> "received"
            else -> "payment"
        }

        return ParseResult.Success(provider, rawTxnId, amountPoisha, "BDT", type, feePoisha, balancePoisha, senderNumber)
    }
}`,

  "android/database.rules.json": `{
  "rules": {
    "notificationTransactions": {
      ".read": "auth != null",
      "$recordId": {
        ".write": "auth != null && (!data.exists() || (data.child('deviceId').val() === auth.uid && data.child('verificationStatus').val() === 'unverified'))",
        ".validate": "newData.hasChildren(['recordId', 'paymentMethod', 'transactionId', 'amountPoisha', 'currency', 'verificationStatus', 'deviceId'])",
        "recordId": {
          ".validate": "newData.isString() && newData.val() === $recordId && newData.val().matches(/^(bkash|nagad|rocket|upay)_[A-Z0-9]+$/)"
        },
        "paymentMethod": {
          ".validate": "newData.isString() && (newData.val() === 'bkash' || newData.val() === 'nagad' || newData.val() === 'rocket' || newData.val() === 'upay')"
        },
        "transactionId": {
          ".validate": "newData.isString() && newData.val().length >= 6 && newData.val().length <= 32"
        },
        "amountPoisha": {
          ".validate": "newData.isNumber() && newData.val() > 0"
        },
        "currency": {
          ".validate": "newData.isString() && newData.val() === 'BDT'"
        },
        "verificationStatus": {
          ".validate": "newData.isString() && newData.val() === 'unverified'"
        },
        "deviceId": {
          ".validate": "newData.isString() && newData.val().length > 0"
        },
        "$other": {
          ".validate": "true"
        }
      }
    }
  }
}`
};
