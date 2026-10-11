import React from 'react';
import { Smartphone, BatteryCharging, Terminal, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export const SetupGuideTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Build and Install Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Building the Native Android APK</span>
        </div>

        <p className="text-xs text-slate-300">
          The generated project is a standard native Android Gradle project using Jetpack Compose and Room Database. Because this cloud sandbox does not include the Android SDK and Java 17 toolchain, compile on your local machine using Android Studio or the CLI:
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300 space-y-1">
          <div><span className="text-slate-500"># 1. Unzip the downloaded project archive</span></div>
          <div>cd android</div>
          <div className="pt-1"><span className="text-slate-500"># 2. Run the 19 automated JUnit tests</span></div>
          <div>./gradlew test</div>
          <div className="pt-1"><span className="text-slate-500"># 3. Compile the debug APK</span></div>
          <div>./gradlew assembleDebug</div>
          <div className="pt-1"><span className="text-slate-500"># Output APK location:</span></div>
          <div className="text-slate-400">app/build/outputs/apk/debug/app-debug.apk</div>
        </div>
      </div>

      {/* Granting Notification Access */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Granting Android Notification Access</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
            <div className="font-semibold text-slate-200">Step 1: In-App Prompt</div>
            <p className="text-slate-400">
              Launch PayNotify Receiver on your phone. If notification permission is missing, a red banner will request access. Tap <strong>Grant</strong>.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
            <div className="font-semibold text-slate-200">Step 2: System Settings</div>
            <p className="text-slate-400">
              Android opens <em>Special app access &gt; Notification access</em>. Locate <strong>PayNotify Receiver</strong> in the list.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
            <div className="font-semibold text-slate-200">Step 3: Confirm Listener</div>
            <p className="text-slate-400">
              Toggle to <strong>Allow</strong>. The app's service starts running immediately and monitors SMS notifications in the background.
            </p>
          </div>
        </div>
      </div>

      {/* OEM Battery Optimizations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <BatteryCharging className="w-4 h-4 text-amber-400" />
          <span>Manufacturer Battery Optimization Exemption</span>
        </div>

        <p className="text-xs text-slate-300">
          Aggressive OEM skins (Xiaomi, Samsung, Oppo, Vivo) kill background services after a few hours of screen-off time. Apply these device-specific settings:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
            <span className="font-bold text-emerald-400 block">Samsung (One UI)</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>Settings &gt; Apps &gt; PayNotify Receiver &gt; Battery &gt; Set to <strong>Unrestricted</strong>.</li>
              <li>Device Care &gt; Battery &gt; Background usage limits &gt; Remove from "Sleeping apps".</li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
            <span className="font-bold text-cyan-400 block">Xiaomi (MIUI / HyperOS)</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>App Info &gt; Autostart &gt; Toggle <strong>Enable</strong>.</li>
              <li>Battery Saver &gt; Set to <strong>No restrictions</strong>.</li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
            <span className="font-bold text-purple-400 block">Oppo &amp; Realme (ColorOS)</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>App Management &gt; Auto-launch &gt; Allow background activity.</li>
              <li>Battery &gt; More battery settings &gt; Optimize battery use &gt; Don't optimize.</li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
            <span className="font-bold text-amber-400 block">Vivo &amp; iQOO (Funtouch OS)</span>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>Battery &gt; High background power consumption &gt; Allow PayNotify.</li>
              <li>Permission Management &gt; Autostart &gt; Allowed.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Limitations & Verification Boundary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Known Platform Limitations</span>
        </div>

        <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
          <li>
            <strong>Silent / Filtered SMS</strong>: If a messaging app marks an incoming SMS as spam or silences notifications without posting a system notification, <code>NotificationListenerService</code> will not be triggered.
          </li>
          <li>
            <strong>SMS Sender Spoofing</strong>: Alphanumeric SMS headers (e.g., "bKash") can be forged using cellular SS7 exploits or illicit GSM gateways. Notification capture is NOT legal proof of settlement.
          </li>
          <li>
            <strong>Server Ingestion Verification</strong>: The webhook or merchant backend listening to Firebase Realtime Database at <code>/notificationTransactions/{'{recordId}'}</code> should cross-reference incoming TrxIDs with official bKash/Nagad Merchant APIs before releasing orders or credits.
          </li>
        </ul>
      </div>
    </div>
  );
};
