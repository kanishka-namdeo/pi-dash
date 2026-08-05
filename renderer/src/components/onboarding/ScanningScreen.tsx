import { useEffect, useState, useRef } from 'react';
import type { ScreenName, AgentConfig, ScanResult } from '../../types';
import { PiLogo } from '../ui/PiLogo';

interface ScanningScreenProps {
  onNavigate: (screen: ScreenName) => void;
  setAgents: (agents: AgentConfig[]) => void;
}

export function ScanningScreen({ onNavigate, setAgents }: ScanningScreenProps) {
  const [status, setStatus] = useState<'scanning' | 'complete' | 'error'>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const navigateCalledRef = useRef(false);
  const onNavigateRef = useRef(onNavigate);
  const setAgentsRef = useRef(setAgents);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
    setAgentsRef.current = setAgents;
  }, [onNavigate, setAgents]);

  useEffect(() => {
    const timeoutMs = 15_000;
    const controller = new AbortController();

    const scan = async () => {
      try {
        const timeoutPromise = new Promise<ScanResult>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('scan-timeout')), timeoutMs);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve(undefined as never);
          });
        });

        const result = await Promise.race<ScanResult>([
          window.api.scanAgents(),
          timeoutPromise,
        ]);

        if (controller.signal.aborted) return;

        setResult(result);
        setAgentsRef.current(result.agents);
        setStatus('complete');

        // Auto-navigate after 1.5s
        setTimeout(() => {
          if (!navigateCalledRef.current) {
            navigateCalledRef.current = true;
            onNavigateRef.current(result.agents.length > 0 ? 'results' : 'no-agents');
          }
        }, 1500);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error && err.message === 'scan-timeout'
          ? 'Scan timed out after 15 seconds'
          : 'Scan failed';
        setError(message);
        setStatus('error');
      }
    };

    scan();

    return () => {
      controller.abort();
    };
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <PiLogo size={60} />
          </div>
          <h2 className="text-2xl font-bold text-white">Scan Failed</h2>
          <p className="text-slate-400">{error}</p>
          <p className="text-sm text-slate-500">
            Don't worry — you can still add agents manually.
          </p>
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add agents manually"
          >
            Add Agents Manually
          </button>
          <button
            onClick={() => onNavigate('no-agents')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Skip to dashboard without agents"
          >
            Skip for Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <PiLogo size={60} />
        </div>

        {status === 'scanning' ? (
          <>
            {/* Spinner */}
            <div className="flex justify-center" role="status" aria-label="Scanning for agents">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Scanning for agents</h2>
            <p className="text-slate-400">
              Looking for installed AI coding assistants...
            </p>
          </>
        ) : (
          <>
            {/* Complete state */}
            <div className="flex justify-center" aria-hidden="true">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Scan Complete</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Agents found</span>
                <span className="text-white font-medium">{result?.agents.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Duration</span>
                <span className="text-white font-medium">{result ? `${(result.duration / 1000).toFixed(1)}s` : '—'}</span>
              </div>
              {result?.warnings && result.warnings.length > 0 && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-sm text-amber-400 font-medium mb-1">Warnings</p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 animate-pulse">
              Navigating automatically...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
