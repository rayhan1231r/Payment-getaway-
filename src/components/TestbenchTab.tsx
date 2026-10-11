import React, { useState, useMemo } from 'react';
import { Play, CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldAlert, Sparkles, Copy, Check } from 'lucide-react';
import { parseNotification, ParseOutput } from '../utils/parserEngine';

interface SamplePreset {
  label: string;
  provider: string;
  sender: string;
  text: string;
  tag: 'Valid' | 'OTP' | 'Promo' | 'Balance Trap';
}

const PRESET_SAMPLES: SamplePreset[] = [
  {
    label: 'bKash Received Tk 1,500',
    provider: 'bKash',
    sender: 'bKash',
    text: 'You have received Tk 1,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,420.50. TrxID 9K7J8L1A9Z at 11/10/2026 14:30',
    tag: 'Valid'
  },
  {
    label: 'Nagad Money Received Tk 2,500',
    provider: 'Nagad',
    sender: 'Nagad',
    text: 'Money Received: Amount: Tk 2,500.00, Sender: 01912345678, Fee: Tk 0.00, Balance: Tk 10,250.00, TxnID: 72N8K19P, Date: 11/10/2026 12:45',
    tag: 'Valid'
  },
  {
    label: 'Rocket Tk. 3,000 Received',
    provider: 'Rocket',
    sender: '16216',
    text: 'Tk. 3,000.00 received from 017112233449. Fee Tk 0.00. Balance Tk 4,500.00. TxnId: 2605128912 on 11-OCT-26',
    tag: 'Valid'
  },
  {
    label: 'Upay Received Tk 850',
    provider: 'Upay',
    sender: 'Upay',
    text: 'You have received Tk 850.00 from 01811223344. TxnID: UP2610118921. Available Balance: Tk 2,300.00. Date: 11/10/2026 10:15',
    tag: 'Valid'
  },
  {
    label: 'bKash Balance Confusion Trap',
    provider: 'bKash',
    sender: 'bKash',
    text: 'You have received Tk 150.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,250.00. TrxID 9K7J8L1A9Z',
    tag: 'Balance Trap'
  },
  {
    label: 'bKash OTP Verification Attack',
    provider: 'bKash',
    sender: 'bKash',
    text: 'Your bKash verification code is 849201. Do not share your code or PIN with anyone.',
    tag: 'OTP'
  },
  {
    label: 'Marketing / Promo Spam',
    provider: 'bKash',
    sender: 'bKash',
    text: 'Recharge 50 Tk and get 1GB data free for 3 days! Offer ends midnight. Dial *247# now.',
    tag: 'Promo'
  }
];

export const TestbenchTab: React.FC = () => {
  const [sender, setSender] = useState<string>('bKash');
  const [messageText, setMessageText] = useState<string>(
    'You have received Tk 1,500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,420.50. TrxID 9K7J8L1A9Z at 11/10/2026 14:30'
  );
  const [copied, setCopied] = useState(false);
  const [ingestionHistory, setIngestionHistory] = useState<any[]>([]);

  const parseResult: ParseOutput = useMemo(() => {
    return parseNotification(sender, messageText);
  }, [sender, messageText]);

  const handleApplyPreset = (preset: SamplePreset) => {
    setSender(preset.sender);
    setMessageText(preset.text);
  };

  const handleSimulateFirebaseWrite = () => {
    if (parseResult.status !== 'SUCCESS') return;

    const record = {
      recordId: parseResult.recordId,
      paymentMethod: parseResult.provider,
      transactionId: parseResult.transactionId,
      amountPoisha: parseResult.amountPoisha,
      currency: 'BDT',
      transactionType: parseResult.transactionType,
      notificationTimestamp: Date.now(),
      receivedAt: Date.now(),
      sourceType: 'sms_notification',
      sourcePackage: 'com.google.android.apps.messaging',
      verificationStatus: 'unverified',
      deviceId: 'android_emulator_bd_01',
      syncStatus: 'synced',
      amountBdt: parseResult.amountBdt
    };

    setIngestionHistory(prev => {
      const isDuplicate = prev.some(item => item.recordId === record.recordId);
      if (isDuplicate) {
        return [{ ...record, isDuplicate: true, timestamp: Date.now() }, ...prev];
      }
      return [{ ...record, isDuplicate: false, timestamp: Date.now() }, ...prev];
    });
  };

  const handleCopyPayload = () => {
    if (parseResult.status !== 'SUCCESS') return;
    const payload = JSON.stringify(
      {
        recordId: parseResult.recordId,
        paymentMethod: parseResult.provider,
        transactionId: parseResult.transactionId,
        amountPoisha: parseResult.amountPoisha,
        currency: 'BDT',
        transactionType: parseResult.transactionType,
        verificationStatus: 'unverified',
        deviceId: 'android_0ca7426d'
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Load Authentic Bangladeshi SMS Samples</span>
          </div>
          <span className="text-xs text-slate-400">Click any preset to test regex parser</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_SAMPLES.map((preset, idx) => {
            const badgeBg =
              preset.tag === 'Valid'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : preset.tag === 'Balance Trap'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : preset.tag === 'OTP'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

            return (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition flex items-center space-x-2 cursor-pointer"
              >
                <span>{preset.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${badgeBg}`}>
                  {preset.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Simulated Notification / SMS Input</span>
              <span className="text-xs font-normal text-slate-400">NotificationListenerService Mock</span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                SMS Sender / Notification Title
              </label>
              <input
                type="text"
                value={sender}
                onChange={e => setSender(e.target.value)}
                placeholder="e.g. bKash, Nagad, 16216, Upay"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Official headers: bKash (16247), Nagad (16167), Rocket (16216), Upay (16268)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Notification Body / SMS Text
              </label>
              <textarea
                rows={4}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Paste original notification or SMS content here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Input length: <strong className="text-slate-300">{messageText.length}</strong> chars
              </span>
              <button
                onClick={handleSimulateFirebaseWrite}
                disabled={parseResult.status !== 'SUCCESS'}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-900/20"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Ingest to Firebase</span>
              </button>
            </div>
          </div>

          {/* Security & Anti-Fraud Notice */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 text-xs text-amber-200/90 space-y-1.5">
            <div className="flex items-center space-x-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Zero-Trust Verification Policy</span>
            </div>
            <p>
              Notifications and SMS sender headers can be altered or spoofed. In PayNotify Receiver, notifications serve only as an <strong>early ingestion signal</strong>. Records are permanently stored with <code>verificationStatus: "unverified"</code> until verified against official provider merchant APIs.
            </p>
          </div>
        </div>

        {/* Right Column: Live Parse Engine Result */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200">Kotlin Engine Extraction Result</h2>
              <div>
                {parseResult.status === 'SUCCESS' && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Eligible Payment Record</span>
                  </span>
                )}
                {parseResult.status === 'IGNORED' && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Safely Filtered Out</span>
                  </span>
                )}
                {parseResult.status === 'FAILED' && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Parse Rejected</span>
                  </span>
                )}
              </div>
            </div>

            {parseResult.status === 'SUCCESS' ? (
              <div className="space-y-4">
                {/* Highlight Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Parsed Amount (Poisha)
                    </span>
                    <span className="text-xl font-bold text-emerald-400">
                      {parseResult.amountBdt}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      = <strong>{parseResult.amountPoisha?.toLocaleString()}</strong> Poisha (integer)
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Transaction ID (TrxID)
                    </span>
                    <span className="text-xl font-bold text-cyan-300 font-mono">
                      {parseResult.transactionId}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Provider: <strong className="text-slate-300">{parseResult.providerName}</strong>
                    </span>
                  </div>
                </div>

                {/* Detailed Extraction Fields */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Deduplication Key (Record ID):</span>
                    <span className="font-mono text-amber-300 font-semibold">{parseResult.recordId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Transaction Type:</span>
                    <span className="text-slate-200 capitalize">{parseResult.transactionType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Transaction Fee:</span>
                    <span className="text-slate-300">{parseResult.feePoisha ? `৳${parseResult.feePoisha / 100}` : '৳0.00'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Available Balance:</span>
                    <span className="text-slate-300">{parseResult.balanceBdt || 'Not mentioned'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Sender Phone / Account:</span>
                    <span className="text-slate-300 font-mono">{parseResult.senderNumber || 'Extracted from SMS title'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Verification Status:</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold text-[10px]">
                      {parseResult.verificationStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Firebase Payload Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-400">Firebase Realtime DB Payload:</span>
                    <button
                      onClick={handleCopyPayload}
                      className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto">
{JSON.stringify(
  {
    recordId: parseResult.recordId,
    paymentMethod: parseResult.provider,
    transactionId: parseResult.transactionId,
    amountPoisha: parseResult.amountPoisha,
    currency: 'BDT',
    transactionType: parseResult.transactionType,
    notificationTimestamp: 1728650000000,
    receivedAt: 1728650000100,
    sourceType: 'sms_notification',
    sourcePackage: 'com.google.android.apps.messaging',
    verificationStatus: 'unverified',
    deviceId: 'android_emulator_bd_01',
    syncStatus: 'synced'
  },
  null,
  2
)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300">
                  {parseResult.status === 'IGNORED' ? 'Notification Filtered Out' : 'Parsing Rejected'}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {parseResult.reason || parseResult.error}
                </p>
              </div>
            )}
          </div>

          {/* Simulated Ingestion Stream */}
          {ingestionHistory.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Simulated Ingestion History ({ingestionHistory.length})</span>
                <button
                  onClick={() => setIngestionHistory([])}
                  className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Clear History
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {ingestionHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded text-xs border ${
                      item.isDuplicate
                        ? 'bg-purple-950/20 border-purple-900/40 text-purple-300'
                        : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold">{item.recordId}</span>
                      <span>({item.amountBdt})</span>
                    </div>
                    <div>
                      {item.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          DUPLICATE BLOCKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          STORED IN FIREBASE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
