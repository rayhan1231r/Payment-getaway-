package com.paynotify.receiver.data.remote

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.DatabaseReference
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ServerValue
import com.paynotify.receiver.data.model.TransactionRecord
import kotlinx.coroutines.tasks.await

class FirebaseRepository(private val context: Context) {

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val database: FirebaseDatabase by lazy {
        FirebaseDatabase.getInstance().apply {
            // Enable offline disk persistence for reliable background syncing
            try {
                setPersistenceEnabled(true)
            } catch (e: Exception) {
                // Persistence can only be enabled before any database reference is created
            }
        }
    }

    private val rootRef: DatabaseReference by lazy {
        database.getReference("notificationTransactions")
    }

    /**
     * Ensure the receiving Android device is signed in anonymously or via device credentials.
     * This establishes the auth context required by Firebase Realtime Database Security Rules.
     */
    suspend fun ensureAuthenticated(): Boolean {
        return try {
            if (auth.currentUser == null) {
                auth.signInAnonymously().await()
            }
            auth.currentUser != null
        } catch (e: Exception) {
            false
        }
    }

    fun isConnected(): Boolean {
        return auth.currentUser != null
    }

    /**
     * Upload a transaction record atomically to `notificationTransactions/{recordId}`.
     * The record ID is deterministic: "${paymentMethod}_${transactionId}".
     * Uses `.setValue()` with strict security rules checking that record does not exist
     * or is being inserted with "unverified" verification status.
     */
    suspend fun uploadTransaction(record: TransactionRecord): Result<Unit> {
        return try {
            ensureAuthenticated()

            val recordRef = rootRef.child(record.recordId)

            val payload = record.toFirebaseMap().toMutableMap()
            // Server-authoritative ingestion timestamp
            payload["serverReceivedAt"] = ServerValue.TIMESTAMP

            recordRef.setValue(payload).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
