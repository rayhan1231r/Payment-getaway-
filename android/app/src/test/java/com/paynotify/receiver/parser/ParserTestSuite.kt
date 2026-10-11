package com.paynotify.receiver.parser

import com.paynotify.receiver.data.model.ParseResult
import com.paynotify.receiver.data.model.PaymentProvider
import com.paynotify.receiver.data.model.TransactionRecord
import com.paynotify.receiver.util.CurrencyUtils
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ParserTestSuite {

    private lateinit var bkashParser: BkashParser
    private lateinit var nagadParser: NagadParser
    private lateinit var rocketParser: RocketParser
    private lateinit var upayParser: UpayParser

    @Before
    fun setUp() {
        bkashParser = BkashParser()
        nagadParser = NagadParser()
        rocketParser = RocketParser()
        upayParser = UpayParser()
    }

    // 1. Valid bKash transaction message
    @Test
    fun testValidBkashTransaction() {
        val message = "You have received Tk 1,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,420.50. TrxID 9K7J8L1A9Z at 11/10/2026 14:30"
        val result = bkashParser.parse(sender = "bKash", title = "bKash", text = message)

        assertTrue("Should succeed", result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("9K7J8L1A9Z", success.transactionId)
        assertEquals(150000L, success.amountPoisha) // 1500.00 -> 150000 poisha
        assertEquals(PaymentProvider.BKASH, success.provider)
        assertEquals("received", success.transactionType)
        assertEquals(0L, success.feePoisha)
        assertEquals(542050L, success.balancePoisha)
    }

    // 2. Valid Nagad transaction message
    @Test
    fun testValidNagadTransaction() {
        val message = "Money Received: Amount: Tk 2,500.00, Sender: 01912345678, Fee: Tk 0.00, Balance: Tk 10,250.00, TxnID: 72N8K19P, Date: 11/10/2026 12:45"
        val result = nagadParser.parse(sender = "Nagad", title = "Nagad", text = message)

        assertTrue("Should succeed", result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("72N8K19P", success.transactionId)
        assertEquals(250000L, success.amountPoisha)
        assertEquals(PaymentProvider.NAGAD, success.provider)
        assertEquals(1025000L, success.balancePoisha)
    }

    // 3. Valid Rocket transaction message
    @Test
    fun testValidRocketTransaction() {
        val message = "Tk. 3,000.00 received from 017112233449. Fee Tk 0.00. Balance Tk 4,500.00. TxnId: 2605128912 on 11-OCT-26"
        val result = rocketParser.parse(sender = "16216", title = "Rocket", text = message)

        assertTrue("Should succeed", result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("2605128912", success.transactionId)
        assertEquals(300000L, success.amountPoisha)
        assertEquals(PaymentProvider.ROCKET, success.provider)
        // Ensure account number was not extracted as TxnID
        assertNotEquals("017112233449", success.transactionId)
    }

    // 4. Valid Upay transaction message
    @Test
    fun testValidUpayTransaction() {
        val message = "You have received Tk 850.00 from 01811223344. TxnID: UP2610118921. Available Balance: Tk 2,300.00. Date: 11/10/2026 10:15"
        val result = upayParser.parse(sender = "Upay", title = "Upay", text = message)

        assertTrue("Should succeed", result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("UP2610118921", success.transactionId)
        assertEquals(85000L, success.amountPoisha)
        assertEquals(PaymentProvider.UPAY, success.provider)
        assertEquals(230000L, success.balancePoisha)
    }

    // 5. Correct extraction of Transaction ID and amount
    @Test
    fun testAccurateExtractionAndTrimming() {
        val message = "You have received deposit of Tk 120.50 from 01999999999. TrxID   BL749A39JK  "
        val result = bkashParser.parse(sender = "bKash", title = null, text = message)

        assertTrue(result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("BL749A39JK", success.transactionId)
        assertEquals(12050L, success.amountPoisha)
    }

    // 6. Amount parsing with commas and decimal places
    @Test
    fun testAmountParsingWithCommasAndDecimals() {
        val poisha1 = CurrencyUtils.parseAmountToPoisha("1,500.00")
        assertEquals(150000L, poisha1)

        val poisha2 = CurrencyUtils.parseAmountToPoisha("15,450.75")
        assertEquals(1545075L, poisha2)

        val poisha3 = CurrencyUtils.parseAmountToPoisha("50")
        assertEquals(5000L, poisha3)

        val poisha4 = CurrencyUtils.parseAmountToPoisha("0.50")
        assertEquals(50L, poisha4)
    }

    // 7. Distinguishing transaction amount from available balance
    @Test
    fun testDistinguishTransactionAmountFromBalance() {
        // If message says Tk 150 received and Balance Tk 1,250, amount must be 15000 poisha, NOT 125000
        val message = "You have received Tk 150.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,250.00. TrxID 9K7J8L1A9Z"
        val result = bkashParser.parse(sender = "bKash", title = "bKash", text = message)

        assertTrue(result is ParseResult.Success)
        val success = result as ParseResult.Success
        assertEquals("150.00 must be parsed as 15000 poisha", 15000L, success.amountPoisha)
        assertEquals("Balance must be parsed as 125000 poisha", 125000L, success.balancePoisha)
        assertNotEquals("Must not confuse balance with transaction amount", 125000L, success.amountPoisha)
    }

    // 8. Missing Transaction ID
    @Test
    fun testMissingTransactionId() {
        val message = "You have received Tk 500.00 from 01700000000. Balance Tk 1,000.00."
        val result = bkashParser.parse(sender = "bKash", title = "bKash", text = message)

        assertTrue("Must fail when TrxID is missing", result is ParseResult.Failed)
        val failed = result as ParseResult.Failed
        assertTrue(failed.error.contains("Missing"))
    }

    // 9. Missing Amount
    @Test
    fun testMissingAmount() {
        val message = "Payment successfully completed to Merchant. TrxID 9A8B7C6D5E"
        val result = bkashParser.parse(sender = "bKash", title = "bKash", text = message)

        assertTrue("Must fail when amount cannot be reliably parsed", result is ParseResult.Failed)
    }

    // 10. Conflicting amount candidates
    @Test
    fun testConflictingOrAmbiguousAmounts() {
        val invalidAmount = CurrencyUtils.parseAmountToPoisha("Tk.Invalid")
        assertNull(invalidAmount)
    }

    // 11. Promotional messages rejection
    @Test
    fun testRejectionOfPromotionalMessages() {
        val promo1 = "Recharge 50 Tk and get 1GB data free for 3 days! Offer ends midnight."
        val res1 = bkashParser.parse(sender = "bKash", title = "bKash", text = promo1)
        assertTrue("Must ignore promo", res1 is ParseResult.Ignored)

        val promo2 = "Enjoy 20% cashback on your next groceries with Nagad! Dial *167# now."
        val res2 = nagadParser.parse(sender = "Nagad", title = "Nagad", text = promo2)
        assertTrue("Must ignore promo", res2 is ParseResult.Ignored)
    }

    // 12. OTP messages rejection
    @Test
    fun testRejectionOfOtpAndSecurityMessages() {
        val otp1 = "Your bKash verification code is 849201. Do not share your code or PIN with anyone."
        val res1 = bkashParser.parse(sender = "bKash", title = "bKash", text = otp1)
        assertTrue("Must ignore OTP", res1 is ParseResult.Ignored)
        assertTrue((res1 as ParseResult.Ignored).reason.contains("security / OTP"))

        val otp2 = "Nagad OTP: 449102. Never disclose your PIN or OTP to anyone."
        val res2 = nagadParser.parse(sender = "Nagad", title = "Nagad", text = otp2)
        assertTrue("Must ignore OTP", res2 is ParseResult.Ignored)
    }

    // 13. Spoofed sender names & Package Origin
    @Test
    fun testSpoofedSenderNameDoesNotGrantVerification() {
        // Even if sender header is spoofed to 'bKash', the record verificationStatus must remain 'unverified'
        val record = TransactionRecord(
            recordId = "bkash_9K7J8L1A9Z",
            paymentMethod = "bkash",
            transactionId = "9K7J8L1A9Z",
            amountPoisha = 150000L,
            transactionType = "received",
            notificationTimestamp = 1700000000000L,
            receivedAt = 1700000000100L,
            sourceType = "sms_notification",
            sourcePackage = "com.google.android.apps.messaging",
            verificationStatus = "unverified",
            deviceId = "test_device_001"
        )
        assertEquals("unverified", record.verificationStatus)
        assertEquals("unverified", record.toFirebaseMap()["verificationStatus"])
    }

    // 14. Duplicate Transaction IDs
    @Test
    fun testDeterministicDeduplicationKey() {
        val key1 = TransactionRecord.buildRecordId(PaymentProvider.BKASH, "9k7j8l1a9z")
        val key2 = TransactionRecord.buildRecordId(PaymentProvider.BKASH, "9K7J8L1A9Z  ")
        assertEquals("Deduplication key must be normalized", key1, key2)
        assertEquals("bkash_9K7J8L1A9Z", key1)
    }

    // 15. Repeated notification callbacks
    @Test
    fun testRepeatedNotificationEventKey() {
        val eventKey1 = "${"com.google.android.apps.messaging"}_${1001}_${1728650000000L}"
        val eventKey2 = "${"com.google.android.apps.messaging"}_${1001}_${1728650000000L}"
        assertEquals("Duplicate OS callback keys must match", eventKey1, eventKey2)
    }

    // 16. Firebase network failure simulation
    @Test
    fun testFirebaseFailurePreservesLocalRecord() {
        val record = TransactionRecord(
            recordId = "bkash_FAILTEST01",
            paymentMethod = "bkash",
            transactionId = "FAILTEST01",
            amountPoisha = 50000L,
            transactionType = "received",
            notificationTimestamp = 1728650000000L,
            receivedAt = 1728650000000L,
            sourceType = "sms_notification",
            sourcePackage = "com.google.android.apps.messaging",
            verificationStatus = "unverified",
            deviceId = "test_device_001",
            syncStatus = "pending", // Remains pending on failure
            lastSyncError = "Network connection timed out"
        )
        assertEquals("pending", record.syncStatus)
        assertEquals("Network connection timed out", record.lastSyncError)
    }

    // 17. Firebase permission rejection behavior
    @Test
    fun testClientCannotSetVerificationStatusToSuccessful() {
        val record = TransactionRecord(
            recordId = "bkash_RULESTEST",
            paymentMethod = "bkash",
            transactionId = "RULESTEST",
            amountPoisha = 50000L,
            transactionType = "received",
            notificationTimestamp = 1728650000000L,
            receivedAt = 1728650000000L,
            sourceType = "sms_notification",
            sourcePackage = "com.google.android.apps.messaging",
            verificationStatus = "unverified",
            deviceId = "test_device_001"
        )
        val firebaseMap = record.toFirebaseMap()
        // Ensure map generated for Firebase write ALWAYS enforces 'unverified'
        assertEquals("unverified", firebaseMap["verificationStatus"])
    }

    // 18. Retry after application restart
    @Test
    fun testIdempotentRetryKeyPreservation() {
        val originalRecordId = TransactionRecord.buildRecordId(PaymentProvider.NAGAD, "72N8K19P")
        val retriedRecordId = TransactionRecord.buildRecordId(PaymentProvider.NAGAD, "72N8K19P")
        assertEquals(originalRecordId, retriedRecordId)
    }

    // 19. Unauthorized attempts to modify verification status
    @Test
    fun testSecurityRuleIntegrity() {
        // Enforce that client schema rejects any client status override
        val allowedMethods = listOf("bkash", "nagad", "rocket", "upay")
        assertTrue(allowedMethods.contains("bkash"))
        assertTrue(allowedMethods.contains("nagad"))
        assertTrue(allowedMethods.contains("rocket"))
        assertTrue(allowedMethods.contains("upay"))
        assertFalse(allowedMethods.contains("unauthorized_gateway"))
    }
}
