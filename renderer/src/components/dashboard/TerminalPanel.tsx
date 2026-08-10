import { X } from 'lucide-react';
import { useState } from 'react';
import { TerminalView } from '../terminal/TerminalView';
import { FilePreview } from './FilePreview';

type TerminalPanelProps = {
  agentId: string | null;
  agentName?: string;
  onClose?: () => void;
  previewFile?: { path: string; name: string } | null;
  onPreviewClose?: () => void;
};

export function TerminalPanel({ agentId, agentName, onClose, previewFile, onPreviewClose }: TerminalPanelProps) {
  // Handle empty state when no agent and no preview file
  if (!agentId && !previewFile) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)', border: `1px solid var(--border)` }}
      >
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            No agent selected
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Click an agent to view terminal
          </p>
        </div>
      </div>
    );
  }

  // Handle case when only preview file is set
  if (!agentId && previewFile) {
    return (
      <FilePreview 
        path={previewFile.path} 
        onClose={onPreviewClose || (() => {})} 
      />
    );
  }

  // Handle case when both agent and preview file are set - show tabs
  if (agentId && previewFile) {
    const [activeTab, setActiveTab] = useState<'terminal' | 'file'>('terminal');

    return (
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Tab Bar */}
        <div
          className="flex items-center px-4 h-10"
          style={{ backgroundColor: 'var(--card)', borderBottom: `1px solid var(--border)` }}
        >
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 text-sm rounded-t ${activeTab === 'terminal' ? 'bg-gray-700 text-white' : 'hover:bg-gray-600'}`}
              onClick={() => setActiveTab('terminal')}
              style={{
                backgroundColor: activeTab === 'terminal' ? 'var(--bg)' : 'transparent',
                color: activeTab === 'terminal' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'terminal' ? '2px solid var(--accent-blue)' : 'none',
              }}
            >
              Terminal
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-t flex items-center gap-2 ${activeTab === 'file' ? 'bg-gray-700 text-white' : 'hover:bg-gray-600'}`}
              onClick={() => setActiveTab('file')}
              style={{
                backgroundColor: activeTab === 'file' ? 'var(--bg)' : 'transparent',
                color: activeTab === 'file' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'file' ? '2px solid var(--accent-blue)' : 'none',
              }}
            >
              File: {previewFile.name}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewClose?.();
                }}
                className="p-0.5 rounded hover:bg-gray-500"
              >
                <X size={12} />
              </button>
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>● Running</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'terminal' && agentId && (
            <TerminalView agentId={agentId} />
          )}
          {activeTab === 'file' && (
            <FilePreview 
              path={previewFile.path} 
              onClose={onPreviewClose || (() => {})} 
            />
          )}
        </div>
      </div>
    );
  }

  // Handle case when only agent is set (original behavior)
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 h-10"
        style={{ backgroundColor: 'var(--card)', borderBottom: `1px solid var(--border)` }}
      >
        <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
          {agentName || agentId}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>● Running</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      </div>
      {agentId && <TerminalView agentId={agentId} />}
    </div>
  );
}
