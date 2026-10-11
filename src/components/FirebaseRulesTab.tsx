import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Copy, Check, FileJson, AlertTriangle } from 'lucide-react';
import { SOURCE_CODE_MAP } from '../data/sourceCodeMap';

export const FirebaseRulesTab: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const rulesCode = SOURCE_CODE_MAP['android/database.rules.json'] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(rulesCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
            <Lock className="w-4 h-4" />
            <span>Enforced Client "Unverified"</span>
          </div>
          <p className="text-xs text-slate-400">
            The Android client is cryptographically forbidden from writing any status other than <code>"unverified"</code>. Only backend admin services can mark a transaction verified.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Overwrite Prevention</span>
          </div>
          <p className="text-xs text-slate-400">
            <code>!data.exists()</code> guarantees idempotency. Once a record ID like <code>bkash_9K7J8L1A9Z</code> is recorded, rogue retries or altered amounts are rejected.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Strict Data Minimization</span>
          </div>
          <p className="text-xs text-slate-400">
            Personal SMS bodies, chat messages, or extraneous metadata are blocked by <code>$other: false</code> rules. Only validated financial parameters are persisted.
          </p>
        </div>
      </div>

      {/* Rules Code Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileJson className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-slate-200">
              database.rules.json
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer border border-slate-700/60"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Security Rules'}</span>
          </button>
        </div>

        <pre className="p-5 font-mono text-[11px] leading-relaxed text-emerald-300 bg-slate-950 overflow-x-auto">
          <code>{rulesCode}</code>
        </pre>
      </div>

      {/* Deployment Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">How to Deploy These Rules to Firebase</h3>
        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2">
          <li>
            Open the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Firebase Console</a> and select your project.
          </li>
          <li>
            Navigate to <strong>Build &gt; Realtime Database &gt; Rules</strong> tab.
          </li>
          <li>
            Paste the JSON content above and click <strong>Publish</strong>.
          </li>
          <li>
            Navigate to <strong>Build &gt; Authentication &gt; Sign-in method</strong> and ensure <strong>Anonymous</strong> is enabled.
          </li>
        </ol>
      </div>
    </div>
  );
};
