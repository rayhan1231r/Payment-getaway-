package com.paynotify.receiver.parser

import android.content.Context
import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider

class ProviderParserFactory(private val context: Context) {

    private val parsers = mapOf(
        PaymentProvider.BKASH to BkashParser(),
        PaymentProvider.NAGAD to NagadParser(),
        PaymentProvider.ROCKET to RocketParser(),
        PaymentProvider.UPAY to UpayParser()
    )

    private val prefs = context.getSharedPreferences("paynotify_provider_filters", Context.MODE_PRIVATE)

    fun isProviderEnabled(provider: PaymentProvider): Boolean {
        return prefs.getBoolean("filter_${provider.id}", true)
    }

    fun setProviderEnabled(provider: PaymentProvider, enabled: Boolean) {
        prefs.edit().putBoolean("filter_${provider.id}", enabled).apply()
    }

    fun findParser(sender: String?, title: String?, text: String): NotificationParser? {
        // First check explicit provider detection
        val detected = PaymentProvider.detectFromSenderOrText(sender, text)
        if (detected != null && isProviderEnabled(detected)) {
            val parser = parsers[detected]
            if (parser != null && parser.canHandle(sender, title, text)) {
                return parser
            }
        }

        // Fallback: check each enabled parser
        for ((provider, parser) in parsers) {
            if (isProviderEnabled(provider) && parser.canHandle(sender, title, text)) {
                return parser
            }
        }
        return null
    }

    fun parse(sender: String?, title: String?, text: String): ParseResult {
        val parser = findParser(sender, title, text)
            ?: return ParseResult.Ignored("No enabled provider matched notification text or sender ($sender)")

        return parser.parse(sender, title, text)
    }
}
