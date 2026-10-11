package com.paynotify.receiver.util

import android.content.Context
import android.provider.Settings
import java.util.UUID

object DeviceIdProvider {

    private const val PREFS_NAME = "paynotify_device_prefs"
    private const val KEY_DEVICE_ID = "registered_device_id"

    @Synchronized
    fun getOrCreateDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var id = prefs.getString(KEY_DEVICE_ID, null)

        if (id.isNullOrBlank()) {
            val androidId = try {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            } catch (e: Exception) {
                null
            }

            id = if (!androidId.isNullOrBlank() && androidId != "9774d56d682e549c") {
                "android_$androidId"
            } else {
                "dev_" + UUID.randomUUID().toString().replace("-", "").take(16)
            }

            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        }

        return id
    }
}
