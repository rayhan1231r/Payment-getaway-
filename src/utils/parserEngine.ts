export interface ParseOutput {
  status: 'SUCCESS' | 'IGNORED' | 'FAILED';
  provider?: 'bkash' | 'nagad' | 'rocket' | 'upay';
  providerName?: string;
  transactionId?: string;
  amountPoisha?: number;
  amountBdt?: string;
  feePoisha?: number;
  balancePoisha?: number | null;
  balanceBdt?: string | null;
  senderNumber?: string | null;
  transactionType?: string;
  recordId?: string;
  reason?: string;
  error?: string;
  verificationStatus: string;
}

export function parseNotification(sender: string, text: string): ParseOutput {
  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();
  const sLower = sender.toLowerCase();

  // Detect provider
  let provider: 'bkash' | 'nagad' | 'rocket' | 'upay' | null = null;
  let providerName = '';

  if (sLower.includes('bkash') || sender === '16247' || lower.includes('bkash') || lower.includes('trxid')) {
    provider = 'bkash';
    providerName = 'bKash';
  } else if (sLower.includes('nagad') || sender === '16167' || lower.includes('nagad')) {
    provider = 'nagad';
    providerName = 'Nagad';
  } else if (sLower.includes('rocket') || sender === '16216' || sLower.includes('dbbl') || lower.includes('rocket') || lower.includes('dbbl')) {
    provider = 'rocket';
    providerName = 'Rocket';
  } else if (sLower.includes('upay') || sender === '16268' || lower.includes('upay')) {
    provider = 'upay';
    providerName = 'Upay';
  }

  if (!provider) {
    return {
      status: 'IGNORED',
      reason: 'No supported Bangladeshi mobile financial provider detected (bKash, Nagad, Rocket, Upay).',
      verificationStatus: 'unverified'
    };
  }

  // Security / OTP keyword checks
  const securityKeywords = ['verification code', 'security code', 'otp', 'pin', 'login detected', 'device change', 'password'];
  for (const kw of securityKeywords) {
    if (lower.includes(kw)) {
      return {
        status: 'IGNORED',
        provider,
        providerName,
        reason: `Ignored security/OTP alert containing "${kw}".`,
        verificationStatus: 'unverified'
      };
    }
  }

  // Pure promo keywords checks
  const promoKeywords = ['recharge', 'offer', 'cashback offer', 'discount', 'survey', 'internet pack', 'megapack', 'campaign', 'win'];
  const hasTrx = /(?:TrxID|Trx\s*ID|TxnID|Txn\s*ID|TxnId)\s*[:\s]\s*([A-Za-z0-9]{6,16})/i.test(cleanText);

  if (!hasTrx) {
    for (const kw of promoKeywords) {
      if (lower.includes(kw)) {
        return {
          status: 'IGNORED',
          provider,
          providerName,
          reason: `Ignored promotional broadcast containing "${kw}".`,
          verificationStatus: 'unverified'
        };
      }
    }
    return {
      status: 'FAILED',
      provider,
      providerName,
      error: 'Missing Transaction ID (TrxID/TxnID) in notification message.',
      verificationStatus: 'unverified'
    };
  }

  // Extract TxID
  const trxMatch = /(?:TrxID|Trx\s*ID|TxnID|Txn\s*ID|TxnId)\s*[:\s]\s*([A-Za-z0-9]{6,16})/i.exec(cleanText);
  if (!trxMatch) {
    return {
      status: 'FAILED',
      provider,
      providerName,
      error: 'Unable to extract valid alphanumeric Transaction ID.',
      verificationStatus: 'unverified'
    };
  }
  const transactionId = trxMatch[1].trim().toUpperCase();

  // Extract Amount based on provider
  let rawAmount: string | null = null;
  let rawFee: string | null = null;
  let rawBalance: string | null = null;
  let rawSender: string | null = null;
  let transactionType = 'received';

  if (provider === 'bkash') {
    const amtMatch = /(?:received(?:\s+deposit\s+of)?|Cash\s+In|Payment)\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (amtMatch) rawAmount = amtMatch[1];

    const feeMatch = /Fee\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (feeMatch) rawFee = feeMatch[1];

    const balMatch = /Balance\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (balMatch) rawBalance = balMatch[1];

    const sndMatch = /(?:from|to)\s+([0-9+]{11,14})/i.exec(cleanText);
    if (sndMatch) rawSender = sndMatch[1];

    if (lower.includes('cash in')) transactionType = 'cash_in';
    else if (lower.includes('deposit')) transactionType = 'deposit';
    else if (lower.includes('payment')) transactionType = 'payment';
  } else if (provider === 'nagad') {
    const amtMatch = /(?:Amount\s*:\s*(?:Tk|BDT|৳)?\.?\s*|Received\s+(?:Tk|BDT|৳)?\.?\s*|Cash\s+In\s*:\s*(?:Amount\s*:\s*)?(?:Tk|BDT|৳)?\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (amtMatch) rawAmount = amtMatch[1];

    const feeMatch = /Fee\s*:\s*(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (feeMatch) rawFee = feeMatch[1];

    const balMatch = /Balance\s*:\s*(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (balMatch) rawBalance = balMatch[1];

    const sndMatch = /(?:Sender|from)\s*:\s*([0-9+]{11,14})/i.exec(cleanText);
    if (sndMatch) rawSender = sndMatch[1];

    if (lower.includes('cash in')) transactionType = 'cash_in';
    else if (lower.includes('money received') || lower.includes('received')) transactionType = 'received';
    else transactionType = 'payment';
  } else if (provider === 'rocket') {
    const amtMatch = /(?:Tk\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:received|credited)|credited\s+with\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:Money\s+)?received.*?Tk\.?\s*([0-9,]+(?:\.[0-9]{1,2})?))/i.exec(cleanText);
    if (amtMatch) rawAmount = amtMatch[1] || amtMatch[2] || amtMatch[3];

    const feeMatch = /Fee\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (feeMatch) rawFee = feeMatch[1];

    const balMatch = /Balance\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (balMatch) rawBalance = balMatch[1];

    const sndMatch = /(?:from)\s+([0-9]{11,12})/i.exec(cleanText);
    if (sndMatch) rawSender = sndMatch[1];

    transactionType = lower.includes('credited') || lower.includes('received') ? 'received' : 'payment';
  } else if (provider === 'upay') {
    const amtMatch = /(?:(?:Money\s+)?received\s+(?:Tk|BDT|৳)?\.?\s*|Amount\s*:\s*(?:Tk|BDT|৳)?\.?\s*|Cash\s+In(?:\s*:\s*(?:Amount\s*:\s*)?)?(?:Tk|BDT|৳)?\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (amtMatch) rawAmount = amtMatch[1];

    const feeMatch = /Fee\s+(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (feeMatch) rawFee = feeMatch[1];

    const balMatch = /(?:Available\s+)?Balance\s*:\s*(?:Tk|BDT|৳)?\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i.exec(cleanText);
    if (balMatch) rawBalance = balMatch[1];

    const sndMatch = /(?:from)\s+([0-9+]{11,14})/i.exec(cleanText);
    if (sndMatch) rawSender = sndMatch[1];

    transactionType = lower.includes('cash in') ? 'cash_in' : (lower.includes('received') ? 'received' : 'payment');
  }

  if (!rawAmount) {
    return {
      status: 'FAILED',
      provider,
      providerName,
      error: `Could not parse transaction amount from ${providerName} message.`,
      verificationStatus: 'unverified'
    };
  }

  const cleanNum = parseFloat(rawAmount.replace(/,/g, ''));
  if (isNaN(cleanNum) || cleanNum <= 0) {
    return {
      status: 'FAILED',
      provider,
      providerName,
      error: `Invalid numeric amount parsed: ${rawAmount}`,
      verificationStatus: 'unverified'
    };
  }

  const amountPoisha = Math.round(cleanNum * 100);
  const amountBdt = `৳${cleanNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const feePoisha = rawFee ? Math.round(parseFloat(rawFee.replace(/,/g, '')) * 100) : 0;
  const balancePoisha = rawBalance ? Math.round(parseFloat(rawBalance.replace(/,/g, '')) * 100) : null;
  const balanceBdt = balancePoisha !== null ? `৳${(balancePoisha / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;

  const recordId = `${provider}_${transactionId}`;

  return {
    status: 'SUCCESS',
    provider,
    providerName,
    transactionId,
    amountPoisha,
    amountBdt,
    feePoisha,
    balancePoisha,
    balanceBdt,
    senderNumber: rawSender,
    transactionType,
    recordId,
    verificationStatus: 'unverified' // ALWAYS unverified
  };
}
