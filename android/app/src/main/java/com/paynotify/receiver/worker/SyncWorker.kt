package com.paynotify.receiver.worker

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.paynotify.receiver.data.local.AppDatabase
import com.paynotify.receiver.data.remote.FirebaseRepository
import java.util.concurrent.TimeUnit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = AppDatabase.getInstance(appContext)
    private val firebaseRepo = FirebaseRepository(appContext)

    override suspend fun doWork(): Result {
        val pendingList = db.transactionDao().getPendingUploads()
        if (pendingList.isEmpty()) {
            return Result.success()
        }

        var anyFailed = false

        for (record in pendingList) {
            val uploadResult = firebaseRepo.uploadTransaction(record)
            if (uploadResult.isSuccess) {
                db.transactionDao().updateSyncResult(
                    recordId = record.recordId,
                    status = "synced",
                    error = null
                )
            } else {
                anyFailed = true
                val errorMsg = uploadResult.exceptionOrNull()?.message ?: "Unknown sync error"
                db.transactionDao().updateSyncResult(
                    recordId = record.recordId,
                    status = "pending", // Keep pending so it retries
                    error = errorMsg
                )
            }
        }

        return if (anyFailed) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    companion object {
        private const val WORK_NAME = "PayNotifyPendingSync"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    15,
                    TimeUnit.SECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                syncRequest
            )
        }
    }
}
