package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.util.CurrencyUtils
import java.util.regex.Pattern

class BkashParser : NotificationParser {

    override val provider: PaymentProvider = PaymentProvider.BKASH

    private val promoKeywords = listOf(
        "offer", "cashback offer", "recharge", "bonus", "discount", "survey",
        "internet pack", "win", "campaign", "megapack", "bKash reward"
    )

    private val securityKeywords = listOf(
        "verification code", "security code", "otp", "pin", "login detected",
        "device change", "reset your pin", "do not share"
    )

    // TrxID regex: TrxID 9K7J8L1A9Z or TrxID: 9K7J8L1A9Z
    private val trxIdPattern = Pattern.compile(
        "(?:TrxID|Trx\\s*ID|trxid|TRXID)\\s*[:\\s]\\s*([A-Za-z0-9]{6,16})",
        Pattern.CASE_INSENSITIVE
    )

    // Transaction Amount regex - matches "received Tk 1,500.00", "received deposit of Tk 500", "Cash In Tk 2,000", "Payment Tk 150"
    private val receivedAmountPattern = Pattern.compile(
        "(?:received(?:\\s+deposit\\s+of)?|Cash\\s+In|Payment)\\s+(?:Tk|BDT|৳)?\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
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
        "(?:from|to)\\s+([0-9+]{11,14})",
        Pattern.CASE_INSENSITIVE
    )

    override fun canHandle(sender: String?, title: String?, text: String): Boolean {
        val s = (sender ?: "").lowercase()
        val t = (title ?: "").lowercase()
        val body = text.lowercase()
        return s.contains("bkash") || s == "16247" || t.contains("bkash") || body.contains("trxid") || body.contains("bkash")
    }

    override fun parse(sender: String?, title: String?, text: String): ParseResult {
        val cleanText = text.trim()
        val lower = cleanText.lowercase()

        // 1. Filter out OTP & security notifications
        for (kw in securityKeywords) {
            if (lower.contains(kw)) {
                return ParseResult.Ignored("Ignored security / OTP alert ($kw)")
            }
        }

        // 2. Filter out pure promotional notifications (unless an explicit TrxID is present)
        val hasTrxId = trxIdPattern.matcher(cleanText).find()
        if (!hasTrxId) {
            for (kw in promoKeywords) {
                if (lower.contains(kw)) {
                    return ParseResult.Ignored("Ignored promotional message ($kw)")
                }
            }
            return ParseResult.Failed("Missing bKash TrxID in notification message", rawSnippet = cleanText)
        }

        // 3. Extract TrxID
        val trxMatcher = trxIdPattern.matcher(cleanText)
        if (!trxMatcher.find()) {
            return ParseResult.Failed("Unable to extract valid bKash TrxID", rawSnippet = cleanText)
        }
        val rawTrxId = trxMatcher.group(1)?.trim()?.uppercase()
        if (rawTrxId.isNullOrEmpty() || rawTrxId.length < 6) {
            return ParseResult.Failed("Malformed or suspicious bKash TrxID ($rawTrxId)", rawSnippet = cleanText)
        }

        // 4. Extract Transaction Amount (distinguishing from Fee and Balance)
        val amountMatcher = receivedAmountPattern.matcher(cleanText)
        if (!amountMatcher.find()) {
            return ParseResult.Failed("Transaction amount could not be reliably parsed from bKash message", rawSnippet = cleanText)
        }
        val rawAmount = amountMatcher.group(1)?.trim() ?: ""
        val amountPoisha = CurrencyUtils.parseAmountToPoisha(rawAmount)
            ?: return ParseResult.Failed("Invalid numeric amount for bKash: $rawAmount", rawSnippet = cleanText)

        // 5. Extract optional Fee & Balance
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

        // Determine transaction type
        val type = when {
            lower.contains("cash in") -> "cash_in"
            lower.contains("deposit") -> "deposit"
            lower.contains("payment") -> "payment"
            else -> "received"
        }

        return ParseResult.Success(
            provider = provider,
            transactionId = rawTrxId,
            amountPoisha = amountPoisha,
            currency = "BDT",
            transactionType = type,
            feePoisha = feePoisha,
            balancePoisha = balancePoisha,
            senderNumber = senderNumber
        )
    }
}
