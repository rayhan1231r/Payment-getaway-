package com.paynotify.receiver.data.model

enum class PaymentProvider(
    val id: String,
    val displayName: String,
    val officialPackages: List<String>,
    val officialSenderNames: List<String>
) {
    BKASH(
        id = "bkash",
        displayName = "bKash",
        officialPackages = listOf("com.bKash.customerapp"),
        officialSenderNames = listOf("bKash", "16247")
    ),
    NAGAD(
        id = "nagad",
        displayName = "Nagad",
        officialPackages = listOf("com.konasl.nagad"),
        officialSenderNames = listOf("Nagad", "16167")
    ),
    ROCKET(
        id = "rocket",
        displayName = "Rocket",
        officialPackages = listOf("com.dbbl.mbs.apps.holder"),
        officialSenderNames = listOf("Rocket", "16216", "DBBL")
    ),
    UPAY(
        id = "upay",
        displayName = "Upay",
        officialPackages = listOf("bd.com.upay.customer"),
        officialSenderNames = listOf("Upay", "16268")
    );

    companion object {
        fun fromId(id: String): PaymentProvider? {
            return entries.firstOrNull { it.id.equals(id, ignoreCase = true) }
        }

        fun detectFromSenderOrText(sender: String?, text: String): PaymentProvider? {
            val s = sender?.lowercase() ?: ""
            val t = text.lowercase()

            return when {
                s.contains("bkash") || s == "16247" || t.contains("trxid") || t.contains("bkash") -> BKASH
                s.contains("nagad") || s == "16167" || t.contains("nagad") -> NAGAD
                s.contains("rocket") || s == "16216" || t.contains("rocket") || t.contains("dbbl") -> ROCKET
                s.contains("upay") || s == "16268" || t.contains("upay") -> UPAY
                else -> null
            }
        }
    }
}
