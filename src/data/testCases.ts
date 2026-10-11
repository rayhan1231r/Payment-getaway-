export interface TestCase {
  id: string;
  name: string;
  description: string;
  sender: string;
  message: string;
  expectedStatus: 'SUCCESS' | 'IGNORED' | 'FAILED';
  expectedTxId?: string;
  expectedPoisha?: number;
  expectedProvider?: string;
  category: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Edge Cases' | 'Security';
}

export const TEST_SUITE_CASES: TestCase[] = [
  {
    id: 'test-1',
    name: '1. Valid bKash transaction message',
    description: 'Received Tk 1,500.00 with fee, balance, and TrxID 9K7J8L1A9Z.',
    sender: 'bKash',
    message: 'You have received Tk 1,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,420.50. TrxID 9K7J8L1A9Z at 11/10/2026 14:30',
    expectedStatus: 'SUCCESS',
    expectedTxId: '9K7J8L1A9Z',
    expectedPoisha: 150000,
    expectedProvider: 'bkash',
    category: 'bKash'
  },
  {
    id: 'test-2',
    name: '2. Valid Nagad transaction message',
    description: 'Money Received: Amount Tk 2,500.00 with TxnID 72N8K19P.',
    sender: 'Nagad',
    message: 'Money Received: Amount: Tk 2,500.00, Sender: 01912345678, Fee: Tk 0.00, Balance: Tk 10,250.00, TxnID: 72N8K19P, Date: 11/10/2026 12:45',
    expectedStatus: 'SUCCESS',
    expectedTxId: '72N8K19P',
    expectedPoisha: 250000,
    expectedProvider: 'nagad',
    category: 'Nagad'
  },
  {
    id: 'test-3',
    name: '3. Valid Rocket transaction message',
    description: 'Tk. 3,000.00 received from 12-digit DBBL account with TxnId: 2605128912.',
    sender: '16216',
    message: 'Tk. 3,000.00 received from 017112233449. Fee Tk 0.00. Balance Tk 4,500.00. TxnId: 2605128912 on 11-OCT-26',
    expectedStatus: 'SUCCESS',
    expectedTxId: '2605128912',
    expectedPoisha: 300000,
    expectedProvider: 'rocket',
    category: 'Rocket'
  },
  {
    id: 'test-4',
    name: '4. Valid Upay transaction message',
    description: 'You have received Tk 850.00 with TxnID: UP2610118921.',
    sender: 'Upay',
    message: 'You have received Tk 850.00 from 01811223344. TxnID: UP2610118921. Available Balance: Tk 2,300.00. Date: 11/10/2026 10:15',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'UP2610118921',
    expectedPoisha: 85000,
    expectedProvider: 'upay',
    category: 'Upay'
  },
  {
    id: 'test-5',
    name: '5. Accurate extraction of TrxID and trimming',
    description: 'TrxID BL749A39JK surrounded by arbitrary spaces and punctuation.',
    sender: 'bKash',
    message: 'You have received deposit of Tk 120.50 from 01999999999. TrxID   BL749A39JK  ',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'BL749A39JK',
    expectedPoisha: 12050,
    expectedProvider: 'bkash',
    category: 'bKash'
  },
  {
    id: 'test-6',
    name: '6. Amount parsing with commas and decimals',
    description: 'Correct conversion of "1,500.00" to exactly 150000 integer poisha.',
    sender: 'bKash',
    message: 'You have received Tk 1,500.00 from 01799887766. Fee Tk 0.00. Balance Tk 25,000.00. TrxID 8A9B0C1D2E',
    expectedStatus: 'SUCCESS',
    expectedTxId: '8A9B0C1D2E',
    expectedPoisha: 150000,
    expectedProvider: 'bkash',
    category: 'Edge Cases'
  },
  {
    id: 'test-7',
    name: '7. Distinguish txn amount from available balance',
    description: 'Received Tk 150.00 while balance is Tk 1,250.00. Must extract 15000 poisha, not 125000.',
    sender: 'bKash',
    message: 'You have received Tk 150.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,250.00. TrxID 9K7J8L1A9Z',
    expectedStatus: 'SUCCESS',
    expectedTxId: '9K7J8L1A9Z',
    expectedPoisha: 15000,
    expectedProvider: 'bkash',
    category: 'Edge Cases'
  },
  {
    id: 'test-8',
    name: '8. Missing Transaction ID',
    description: 'Message contains an amount but no TrxID. Must reject record creation.',
    sender: 'bKash',
    message: 'You have received Tk 500.00 from 01700000000. Fee Tk 0.00. Balance Tk 1,000.00.',
    expectedStatus: 'FAILED',
    category: 'Edge Cases'
  },
  {
    id: 'test-9',
    name: '9. Missing Amount',
    description: 'Message contains TrxID but no recognizable financial amount.',
    sender: 'bKash',
    message: 'Payment successfully completed to Merchant. TrxID 9A8B7C6D5E',
    expectedStatus: 'FAILED',
    category: 'Edge Cases'
  },
  {
    id: 'test-10',
    name: '10. Conflicting amount candidates',
    description: 'Corrupted amount string rejects silently instead of guessing fake values.',
    sender: 'bKash',
    message: 'You have received Tk.Corrupted from 01700000000. TrxID 9K7J8L1A9Z',
    expectedStatus: 'FAILED',
    category: 'Edge Cases'
  },
  {
    id: 'test-11',
    name: '11. Promotional messages rejection',
    description: 'Recharges, internet bundles, and marketing SMS are promptly filtered.',
    sender: 'bKash',
    message: 'Recharge 50 Tk and get 1GB data free for 3 days! Offer ends midnight. Dial *247# now.',
    expectedStatus: 'IGNORED',
    category: 'Edge Cases'
  },
  {
    id: 'test-12',
    name: '12. OTP messages rejection',
    description: 'One-time verification codes and PIN alerts are filtered to protect user accounts.',
    sender: 'bKash',
    message: 'Your bKash verification code is 849201. Do not share your code or PIN with anyone.',
    expectedStatus: 'IGNORED',
    category: 'Security'
  },
  {
    id: 'test-13',
    name: '13. Spoofed sender names',
    description: 'Spoofed header cannot confer verification status; stays strictly "unverified".',
    sender: 'Fake_bKash',
    message: 'You have received Tk 5,000.00 from 01711223344. TrxID SP00F3D01',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'SP00F3D01',
    expectedPoisha: 500000,
    category: 'Security'
  },
  {
    id: 'test-14',
    name: '14. Duplicate Transaction IDs',
    description: 'Normalized deterministic keys (e.g. bkash_9K7J8L1A9Z) prevent duplicate writes.',
    sender: 'bKash',
    message: 'You have received Tk 1,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,420.50. TrxID 9k7j8l1a9z',
    expectedStatus: 'SUCCESS',
    expectedTxId: '9K7J8L1A9Z',
    expectedPoisha: 150000,
    category: 'Edge Cases'
  },
  {
    id: 'test-15',
    name: '15. Repeated notification callbacks',
    description: 'LruCache prevents duplicate ingestion when Android re-dispatches notification.',
    sender: 'Nagad',
    message: 'Money Received: Amount: Tk 1,000.00, Fee: Tk 0.00, TxnID: 99NN88KK, Date: 11/10/2026',
    expectedStatus: 'SUCCESS',
    expectedTxId: '99NN88KK',
    expectedPoisha: 100000,
    category: 'Edge Cases'
  },
  {
    id: 'test-16',
    name: '16. Firebase network failure resilience',
    description: 'Local Room database holds record with syncStatus="pending" for WorkManager.',
    sender: 'Rocket',
    message: 'Tk. 1,200.00 received from 01700112233. Fee Tk 0.00. Balance Tk 2,400.00. TxnId: 8819203112',
    expectedStatus: 'SUCCESS',
    expectedTxId: '8819203112',
    expectedPoisha: 120000,
    category: 'Edge Cases'
  },
  {
    id: 'test-17',
    name: '17. Firebase permission rejection',
    description: 'Rules block writing "verified" or modifying other devices records.',
    sender: 'Upay',
    message: 'You have received Tk 2,500.00 from 01800000000. TxnID: UP77889900. Available Balance: Tk 5,000.00',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'UP77889900',
    expectedPoisha: 250000,
    category: 'Security'
  },
  {
    id: 'test-18',
    name: '18. Retry after application restart',
    description: 'Deterministic recordId enables idempotent retries with no duplicate entries.',
    sender: 'Nagad',
    message: 'Cash In: Amount: Tk 5,000.00, TxnID: RESTART99, Date: 11/10/2026',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'RESTART99',
    expectedPoisha: 500000,
    category: 'Edge Cases'
  },
  {
    id: 'test-19',
    name: '19. Unauthorized attempts to modify verification status',
    description: 'Database schema rule: verificationStatus.val() === "unverified" enforced strictly.',
    sender: 'bKash',
    message: 'You have received Tk 350.00 from 01711223344. TrxID SEC998811',
    expectedStatus: 'SUCCESS',
    expectedTxId: 'SEC998811',
    expectedPoisha: 35000,
    category: 'Security'
  }
];
