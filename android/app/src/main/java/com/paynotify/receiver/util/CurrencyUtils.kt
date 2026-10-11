package com.paynotify.receiver.util

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.util.Locale

object CurrencyUtils {

    private val numberFormat = DecimalFormat("#,##0.00")

    /**
     * Converts a raw monetary string (e.g. "1,500.50", "150", "Tk 25.00") to integer poisha.
     * Prevents floating point errors by using BigDecimal parsing.
     * Returns null if unparseable or negative.
     */
    fun parseAmountToPoisha(raw: String): Long? {
        return try {
            val sanitized = raw.replace(",", "").trim()
            val bd = BigDecimal(sanitized)
            if (bd < BigDecimal.ZERO) return null
            // Convert to poisha (BDT 1.00 = 100 poisha)
            val poisha = bd.multiply(BigDecimal("100")).setScale(0, RoundingMode.HALF_UP)
            poisha.toLong()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Formats integer poisha to human readable BDT display string.
     * Example: 15050L -> "৳150.50"
     */
    fun formatPoishaToBdt(poisha: Long): String {
        val bd = BigDecimal(poisha).divide(BigDecimal("100"), 2, RoundingMode.HALF_UP)
        return "৳" + numberFormat.format(bd)
    }

    /**
     * Formats poisha to decimal string (e.g. "150.50")
     */
    fun poishaToDecimal(poisha: Long): String {
        val bd = BigDecimal(poisha).divide(BigDecimal("100"), 2, RoundingMode.HALF_UP)
        return bd.toPlainString()
    }
}
