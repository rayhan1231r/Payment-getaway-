package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider

interface NotificationParser {
    val provider: PaymentProvider

    /**
     * Quickly checks whether this parser is applicable for the notification sender, title, or body text.
     */
    fun canHandle(sender: String?, title: String?, text: String): Boolean

    /**
     * Parses the incoming notification text.
     * Returns:
     * - ParseResult.Success with extracted transaction details
     * - ParseResult.Ignored with explanation for promo, OTP, or non-transaction alerts
     * - ParseResult.Failed if transaction seems present but fields are missing or ambiguous
     */
    fun parse(sender: String?, title: String?, text: String): ParseResult
}
