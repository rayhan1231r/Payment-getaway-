package com.paynotify.receiver.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "transaction_records",
    indices = [
        Index(value = ["recordId"], unique = true),
        Index(value = ["paymentMethod", "transactionId"], unique = true),
        Index(value = ["syncStatus"])
    ]
)
data class TransactionRecord(
    @PrimaryKey
    val recordId: String, // Deterministic: "${paymentMethod}_${normalizedTransactionId}"
    val paymentMethod: String, // bkash, nagad, rocket, upay
    val transactionId: String, // Normalized uppercase ID
    val amountPoisha: Long, // Integer poisha (BDT 150.00 -> 15000)
    val currency: String = "BDT",
    val transactionType: String, // received, cash_in, payment
    val notificationTimestamp: Long, // Timestamp of original SMS/Notification
    val receivedAt: Long, // Client ingestion timestamp
    val sourceType: String, // sms_notification or app_notification
    val sourcePackage: String, // Package name of notification generator
    val verificationStatus: String = "unverified", // ALWAYS "unverified" on ingestion
    val deviceId: String, // Authenticated/Registered device identifier
    val syncStatus: String = "pending", // pending, synced, failed
    val syncAttempts: Int = 0,
    val lastSyncError: String? = null,
    val sender: String? = null,
    val feePoisha: Long = 0L,
    val balancePoisha: Long? = null
) {
    companion object {
        fun buildRecordId(provider: PaymentProvider, rawTxId: String): String {
            val cleanId = rawTxId.trim().uppercase()
            return "${provider.id}_$cleanId"
        }
    }

    /**
     * Map to Firebase Realtime Database schema conforming to security rules.
     * Note: Full SMS content is intentionally NOT stored to protect privacy.
     */
    fun toFirebaseMap(): Map<String, Any?> {
        return mapOf(
            "recordId" to recordId,
            "paymentMethod" to paymentMethod,
            "transactionId" to transactionId,
            "amountPoisha" to amountPoisha,
            "currency" to currency,
            "transactionType" to transactionType,
            "notificationTimestamp" to notificationTimestamp,
            "receivedAt" to receivedAt,
            "sourceType" to sourceType,
            "sourcePackage" to sourcePackage,
            "verificationStatus" to "unverified", // Strictly unverified
            "deviceId" to deviceId,
            "syncStatus" to "synced"
        )
    }
}
