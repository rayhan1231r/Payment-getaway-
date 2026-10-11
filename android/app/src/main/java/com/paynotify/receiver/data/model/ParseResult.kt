package com.paynotify.receiver.data.model

sealed class ParseResult {
    data class Success(
        val provider: PaymentProvider,
        val transactionId: String,
        val amountPoisha: Long,
        val currency: String = "BDT",
        val transactionType: String,
        val feePoisha: Long = 0L,
        val balancePoisha: Long? = null,
        val senderNumber: String? = null
    ) : ParseResult()

    data class Ignored(
        val reason: String
    ) : ParseResult()

    data class Failed(
        val error: String,
        val candidateAmounts: List<String> = emptyList(),
        val rawSnippet: String = ""
    ) : ParseResult()
}
