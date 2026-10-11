package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class RocketParser : NotificationParser {

    override val provider: PaymentProvider = PaymentProvider.ROCKET

    private val promoKeywords = listOf(
        "offer", "cashback", "discount", "recharge", "bonus", "reward", "win"
    )

    private val securityKeywords = listOf(
        "security code", "otp", "pin", "verification", "password"
    )

    // Rocket TxnId regex: "TxnId: 2605128912" or "TxnId 2605128912"
    private val txnIdPattern = Pattern.compile(
        "(?:TxnId|TxnID|Txn\\s*ID|TrxId|TrxID)\\s*[:\\s]\\s*([0-9A-Za-z]{6,16})",
        Pattern.CASE_INSENSITIVE
    )

    // Match Rocket transaction amounts
    // "Tk. 3,000.00 received" or "credited with Tk 1,200.00" or "received from ... Tk 500.00"
    private val amountPattern = Pattern.compile(
        "(?:Tk\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*(?:received|credited)|credited\\s+with\\s+(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)|(?:Money\\s+)?received.*?Tk\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?))",
        Pattern.CASE_INSENSITIVE
    )

    private val feePattern = Pattern.compile(
        "Fee\\s+(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    private val balancePattern = Pattern.compile(
        "Balance\\s+(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    private val senderPattern = Pattern.compile(
        "(?:from)\\s+([0-9]{11,12})",
        Pattern.CASE_INSENSITIVE
    )

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        val t = (title ?: "").lowercase()
        val body = text.lowercase()
        return s.contains("rocket") || s == "16216" || s.contains("dbbl") || t.contains("rocket") || body.contains("rocket") || body.contains("dbbl")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        // 1. Filter out OTP & security
        for (kw in securityKeywords) {
            if (lower.contains(kw)) {
                return ParseResult.Ignored("Ignored security / OTP alert ($kw)")
            }
        }

        // 2. Filter out pure promotional notifications without TxnId
        val hasTxnId = txnIdPattern.matcher(cleanText).find()
        if (!hasTxnId) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) {
                    return ParseResult.Ignored("Ignored promotional message ($kw)")
                }
            }
            return ParseResult.Failed("Missing Rocket TxnId in message", rawSnippet = cleanText)
        }

        // 3. Extract TxnId
        val txnMatcher = txnIdPattern.matcher(cleanText)
        if (!txnMatcher.find()) {
            return ParseResult.Failed("Unable to extract valid Rocket TxnId", rawSnippet = cleanText)
        }
        val rawTxnId = txnMatcher.group(1)?.trim()?.uppercase()
        if (rawTxnId.isNullOrEmpty() || rawTxnId.length < 6) {
            return ParseResult.Failed("Malformed Rocket TxnId ($rawTxnId)", rawSnippet = cleanText)
        }

        // 4. Extract Amount
        val amountMatcher = amountPattern.matcher(cleanText)
        var rawAmount: String? = null
        if (amountMatcher.find()) {
            rawAmount = amountMatcher.group(1) ?: amountMatcher.group(2) ?: amountMatcher.group(3)
        }

        if (rawAmount.isNullOrEmpty()) {
            return ParseResult.Failed("Transaction amount could not be parsed from Rocket message", rawSnippet = cleanText)
        }

        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount)
            ?: return ParseResult.Failed("Invalid numeric amount for Rocket: $rawAmount", rawSnippet = cleanText)

        // 5. Extract Fee & Balance
        val feeMatcher = feePattern.matcher(cleanText)
        val feePoisha = if (feeMatcher.find()) {
            CurrencyUtils.parseAmountToPoisha(feeMatcher.group(1) ?: "0") ?: 0L
        } else 0L

        val balanceMatcher = balancePattern.matcher(cleanText)
        val balancePoisha = if (balanceMatcher.find()) {
            CurrencyUtils.parseAmountToPoisha(balanceMatcher.group(1) ?: "")
        } else null

        // 6. Extract Sender
        val senderMatcher = senderPattern.matcher(cleanText)
        val senderNumber = if (senderMatcher.find()) senderMatcher.group(1)?.trim() else null

        val type = when {
            lower.contains("credited") || lower.contains("received") -> "received"
            else -> "payment"
        }

        return ParseResult.Success(
            provider = provider,
            transactionId = rawTxnId,
            amountPoisha = amountPoisha,
            currency = "BDT",
            transactionType = type,
            feePoisha = feePoisha,
            balancePoisha = balancePoisha,
            senderNumber = senderNumber
        )
    }
}
