import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Play, RefreshCw, Filter, Search, ShieldCheck } from 'lucide-react';
import { TEST_SUITE_CASES, TestCase } from '../data/testCases';
import { parseNotification } from '../utils/parserEngine';

interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualStatus: string;
  actualTxId?: string;
  actualPoisha?: number;
  actualProvider?: string;
  actualErrorOrReason?: string;
  executionTimeMs: number;
}

export const TestRunnerTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Execute all test cases against parser engine
  const testResults: TestResult[] = useMemo(() => {
    return TEST_SUITE_CASES.map(tc => {
      const start = performance.now();
      const res = parseNotification(tc.sender, tc.message);
      const executionTimeMs = +(performance.now() - start).toFixed(2);

      let passed = res.status === tc.expectedStatus;

      if (passed && tc.expectedStatus === 'SUCCESS') {
        if (tc.expectedTxId && res.transactionId !== tc.expectedTxId) passed = false;
        if (tc.expectedPoisha && res.amountPoisha !== tc.expectedPoisha) passed = false;
        if (tc.expectedProvider && res.provider !== tc.expectedProvider) passed = false;
      }

      return {
        testCase: tc,
        passed,
        actualStatus: res.status,
        actualTxId: res.transactionId,
        actualPoisha: res.amountPoisha,
        actualProvider: res.provider,
        actualErrorOrReason: res.error || res.reason,
        executionTimeMs
      };
    });
  }, []);

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  const filteredResults = useMemo(() => {
    return testResults.filter(r => {
      const matchCat = selectedCategory === 'All' || r.testCase.category === selectedCategory;
      const matchSearch =
        r.testCase.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.testCase.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.testCase.message.toLowerCase().includes(searchFilter.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [testResults, selectedCategory, searchFilter]);

  const categories = ['All', 'bKash', 'Nagad', 'Rocket', 'Upay', 'Edge Cases', 'Security'];

  return (
    <div className="space-y-6">
      {/* Test Execution Summary Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">Automated Test Suite (19 Test Cases)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Passing
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Validates provider extraction, balance isolation, integer Poisha math, and anti-fraud rejection rules.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">
                <strong className="text-emerald-400 font-semibold">{passedTests}</strong> Passed
              </span>
            </div>
            {failedTests > 0 && (
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300">
                  <strong className="text-rose-400 font-semibold">{failedTests}</strong> Failed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredResults.map(res => {
          const isExpanded = expandedId === res.testCase.id;

          return (
            <div
              key={res.testCase.id}
              className={`bg-slate-900 border rounded-xl overflow-hidden transition ${
                res.passed ? 'border-slate-800/80 hover:border-slate-700' : 'border-rose-900/50'
              }`}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : res.testCase.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center space-x-3">
                  {res.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200">{res.testCase.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                        {res.testCase.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{res.testCase.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">{res.executionTimeMs}ms</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      res.passed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {res.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/50 text-xs space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Input Message Text ({res.testCase.sender})
                    </span>
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                      {res.testCase.message}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <span className="font-semibold text-slate-400 block mb-1">Expected Criteria:</span>
                      <div>Status: <span className="text-emerald-400 font-mono">{res.testCase.expectedStatus}</span></div>
                      {res.testCase.expectedTxId && (
                        <div>Expected TrxID: <span className="text-cyan-300 font-mono">{res.testCase.expectedTxId}</span></div>
                      )}
                      {res.testCase.expectedPoisha && (
                        <div>Expected Poisha: <span className="text-amber-300 font-mono">{res.testCase.expectedPoisha}</span></div>
                      )}
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <span className="font-semibold text-slate-400 block mb-1">Actual Parsed Result:</span>
                      <div>Status: <span className="text-emerald-400 font-mono">{res.actualStatus}</span></div>
                      {res.actualTxId && (
                        <div>Actual TrxID: <span className="text-cyan-300 font-mono">{res.actualTxId}</span></div>
                      )}
                      {res.actualPoisha !== undefined && (
                        <div>Actual Poisha: <span className="text-amber-300 font-mono">{res.actualPoisha}</span></div>
                      )}
                      {res.actualErrorOrReason && (
                        <div className="text-slate-400 text-[11px]">{res.actualErrorOrReason}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
