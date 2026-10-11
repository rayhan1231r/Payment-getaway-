import React, { useState } from 'react';
import { Download, ShieldCheck, Smartphone, Database, CheckCircle2, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { SOURCE_CODE_MAP } from '../data/sourceCodeMap';

export const Header: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadProjectZip = async () => {
    try {
      setDownloading(true);
      const zip = new JSZip();

      // Add all source code files to the zip
      for (const [filePath, content] of Object.entries(SOURCE_CODE_MAP)) {
        zip.file(filePath, content);
      }

      // Add extra configuration files
      zip.file('android/settings.gradle.kts', `rootProject.name = "PayNotifyReceiver"\ninclude(":app")\n`);
      zip.file('android/build.gradle.kts', `plugins {\n    id("com.android.application") version "8.5.2" apply false\n    id("org.jetbrains.kotlin.android") version "1.9.24" apply false\n    id("com.google.gms.google-services") version "4.4.2" apply false\n}\n`);
      zip.file('android/gradle.properties', `org.gradle.jvmargs=-Xmx2048m\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n`);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PayNotifyReceiver-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">PayNotify Receiver</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Android Native • Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                bKash, Nagad, Rocket, Upay Notification Ingestion Engine & Firebase Realtime DB
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Anti-Fraud: <strong className="text-amber-400">Strictly Unverified</strong></span>
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Firebase RTDB Sync</span>
            </div>

            <button
              onClick={handleDownloadProjectZip}
              disabled={downloading}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging Zip...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Android Project (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
