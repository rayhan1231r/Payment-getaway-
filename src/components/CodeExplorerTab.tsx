import React, { useState } from 'react';
import { FileCode, Copy, Check, Folder, ChevronRight, Download } from 'lucide-react';
import { ANDROID_PROJECT_FILES, AndroidProjectFile } from '../data/androidFiles';
import { SOURCE_CODE_MAP } from '../data/sourceCodeMap';

export const CodeExplorerTab: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(
    'android/app/src/main/java/com/paynotify/receiver/service/PayNotificationListenerService.kt'
  );
  const [copied, setCopied] = useState(false);

  const selectedFile = ANDROID_PROJECT_FILES.find(f => f.path === selectedFilePath);
  const sourceCode = SOURCE_CODE_MAP[selectedFilePath] || '// Source file content available in downloaded zip';

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = Array.from(new Set(ANDROID_PROJECT_FILES.map(f => f.category)));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Sidebar: File Tree */}
        <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span>Android Project Files</span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[540px] pr-1">
            {categories.map(category => {
              const files = ANDROID_PROJECT_FILES.filter(f => f.category === category);

              return (
                <div key={category} className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {files.map(file => {
                      const fileName = file.path.split('/').pop() || file.path;
                      const isSelected = selectedFilePath === file.path;

                      return (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFilePath(file.path)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="truncate">{fileName}</span>
                          </div>
                          {isSelected && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="md:col-span-8 flex flex-col bg-slate-950">
          {/* File Header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-slate-200">
                {selectedFilePath}
              </div>
              {selectedFile && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedFile.description}
                </p>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer border border-slate-700/60"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy File'}</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-4 overflow-x-auto flex-1 font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950 max-h-[540px]">
            <pre className="whitespace-pre">
              <code>{sourceCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
