/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { TestbenchTab } from './components/TestbenchTab';
import { TestRunnerTab } from './components/TestRunnerTab';
import { CodeExplorerTab } from './components/CodeExplorerTab';
import { FirebaseRulesTab } from './components/FirebaseRulesTab';
import { SetupGuideTab } from './components/SetupGuideTab';
import { Sparkles, CheckCircle2, Code2, Shield, BookOpen, Layers } from 'lucide-react';

type ActiveTab = 'testbench' | 'testrunner' | 'codebase' | 'firebase' | 'guide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('testbench');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      {/* Main Subheader & Navigation Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 py-2.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('testbench')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'testbench'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>SMS Parser Testbench</span>
            </button>

            <button
              onClick={() => setActiveTab('testrunner')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'testrunner'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Automated Tests (19/19)</span>
            </button>

            <button
              onClick={() => setActiveTab('codebase')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'codebase'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Android Code Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('firebase')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'firebase'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Firebase Rules &amp; Schema</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Setup &amp; Android Build</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {activeTab === 'testbench' && <TestbenchTab />}
        {activeTab === 'testrunner' && <TestRunnerTab />}
        {activeTab === 'codebase' && <CodeExplorerTab />}
        {activeTab === 'firebase' && <FirebaseRulesTab />}
        {activeTab === 'guide' && <SetupGuideTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            PayNotify Receiver • Native Android (Kotlin) &amp; Firebase Realtime Database
          </span>
          <span className="text-slate-400">
            Targeting Bangladesh Mobile Financial Services: bKash • Nagad • Rocket • Upay
          </span>
        </div>
      </footer>
    </div>
  );
}
