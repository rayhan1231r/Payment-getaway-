package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class NagadParser : NotificationParser {

    override val provider: PaymentProvider = PaymentProvider.NAGAD

    private val promoKeywords = listOf(
        "cashback", "offer", "discount", "recharge", "bonus", "reward", "campaign", "win"
    )

    private val securityKeywords = listOf(
        "otp", "pin", "verification", "security code", "login", "password"
    )

    // TxnID pattern: TxnID: 72N8K19P or TxnID 72N8K19P
    private val txnIdPattern = Pattern.compile(
        "(?:TxnID|Txn\\s*ID|TrxID|Trx\\s*ID)\\s*[:\\s]\\s*([A-Za-z0-9]{6,16})",
        Pattern.CASE_INSENSITIVE
    )

    // Nagad received format: "Money Received: Amount: Tk 2,500.00" or "Received Tk 500.00" or "Cash In: Amount: Tk 1,000.00"
    private val amountPattern = Pattern.compile(
        "(?:Amount\\s*:\\s*(?:Tk|BDT|৳)?\\.?\\s*|Received\\s+(?:Tk|BDT|৳)?\\.?\\s*|Cash\\s+In\\s*:\\s*(?:Amount\\s*:\\s*)?(?:Tk|BDT|৳)?\\.?\\s*)([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    private val feePattern = Pattern.compile(
        "Fee\\s*:\\s*(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    private val balancePattern = Pattern.compile(
        "Balance\\s*:\\s*(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    )

    private val senderPattern = Pattern.compile(
        "(?:Sender|from)\\s*:\\s*([0-9+]{11,14})",
        Pattern.CASE_INSENSITIVE
    )

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        val t = (title ?: "").lowercase()
        val body = text.lowercase()
        return s.contains("nagad") || s == "16167" || t.contains("nagad") || body.contains("nagad")
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

        // 2. Filter out pure promotional notifications without TxnID
        val hasTxnId = txnIdPattern.matcher(cleanText).find()
        if (!hasTxnId) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) {
                    return ParseResult.Ignored("Ignored promotional message ($kw)")
                }
            }
            return ParseResult.Failed("Missing Nagad TxnID in message", rawSnippet = cleanText)
        }

        // 3. Extract TxnID
        val txnMatcher = txnIdPattern.matcher(cleanText)
        if (!txnMatcher.find()) {
            return ParseResult.Failed("Unable to extract valid Nagad TxnID", rawSnippet = cleanText)
        }
        val rawTxnId = txnMatcher.group(1)?.trim()?.uppercase()
        if (rawTxnId.isNullOrEmpty() || rawTxnId.length < 6) {
            return ParseResult.Failed("Malformed Nagad TxnID ($rawTxnId)", rawSnippet = cleanText)
        }

        // 4. Extract Amount
        val amountMatcher = amountPattern.matcher(cleanText)
        if (!amountMatcher.find()) {
            return ParseResult.Failed("Transaction amount could not be parsed from Nagad message", rawSnippet = cleanText)
        }
        val rawAmount = amountMatcher.group(1)?.trim() ?: ""
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount)
            ?: return ParseResult.Failed("Invalid numeric amount for Nagad: $rawAmount", rawSnippet = cleanText)

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
            lower.contains("cash in") -> "cash_in"
            lower.contains("money received") || lower.contains("received") -> "received"
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
