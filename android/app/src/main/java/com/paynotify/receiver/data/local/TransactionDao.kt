package com.paynotify.receiver.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.paynotify.receiver.data.model.TransactionRecord
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(record: TransactionRecord): Long

    @Update
    suspend fun update(record: TransactionRecord)

    @Query("SELECT EXISTS(SELECT 1 FROM transaction_records WHERE recordId = :recordId)")
    suspend fun exists(recordId: String): Boolean

    @Query("SELECT EXISTS(SELECT 1 FROM transaction_records WHERE paymentMethod = :provider AND transactionId = :txId)")
    suspend fun existsByProviderAndTxId(provider: String, txId: String): Boolean

    @Query("SELECT * FROM transaction_records ORDER BY receivedAt DESC")
    fun getAllTransactions(): Flow<List<TransactionRecord>>

    @Query("SELECT * FROM transaction_records WHERE syncStatus = 'pending' ORDER BY receivedAt ASC LIMIT 50")
    suspend fun getPendingUploads(): List<TransactionRecord>

    @Query("UPDATE transaction_records SET syncStatus = :status, lastSyncError = :error, syncAttempts = syncAttempts + 1 WHERE recordId = :recordId")
    suspend fun updateSyncResult(recordId: String, status: String, error: String?)

    @Query("SELECT COUNT(*) FROM transaction_records")
    fun countTotal(): Flow<Int>

    @Query("SELECT COUNT(*) FROM transaction_records WHERE syncStatus = 'synced'")
    fun countSynced(): Flow<Int>

    @Query("SELECT COUNT(*) FROM transaction_records WHERE syncStatus = 'pending'")
    fun countPending(): Flow<Int>

    @Query("SELECT * FROM transaction_records WHERE transactionId LIKE '%' || :query || '%' OR paymentMethod LIKE '%' || :query || '%' ORDER BY receivedAt DESC")
    fun searchTransactions(query: String): Flow<List<TransactionRecord>>
}
