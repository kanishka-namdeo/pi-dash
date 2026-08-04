import { useState, useRef, useCallback, useEffect } from 'react';
import type { ScreenName, AgentConfig, ValidationResult, IdentificationResult } from '../../types';
import { PiLogo } from '../ui/PiLogo';

const DEBOUNCE_MS = 500;

// ponytail: reuse same gradient registry from ResultsScreen — no need to duplicate
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
};

function AgentIcon({ iconKey }: { iconKey: string }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
        <span className="text-slate-400 text-lg">?</span>
      </div>
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}
    >
      <span className="text-white font-bold text-lg">{entry.symbol}</span>
    </div>
  );
}

const CONFIDENCE_COLORS = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-red-400',
} as const;

interface ManualAddScreenProps {
  onNavigate: (screen: ScreenName) => void;
  addAgent: (agent: AgentConfig) => void;
}

export function ManualAddScreen({ onNavigate, addAgent }: ManualAddScreenProps) {
  const [path, setPath] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlePathChange = useCallback((value: string) => {
    setPath(value);
    setValidationResult(null);
    setIdentificationResult(null);

    clearTimeout(timerRef.current);

    if (!value.trim()) return;

    timerRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const result: ValidationResult = await window.api.validateAgent(value.trim());
        setValidationResult(result);

        if (result.valid) {
          setIsIdentifying(true);
          try {
            const idResult: IdentificationResult = await window.api.identifyAgent(value.trim());
            setIdentificationResult(idResult);
          } catch {
            setIdentificationResult(null);
          } finally {
            setIsIdentifying(false);
          }
        }
      } catch {
        setValidationResult({ valid: false, error: 'Validation failed', executable: false, isDirectory: false });
      } finally {
        setValidating(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  const isValid = validationResult?.valid ?? false;
  const canAdd = isValid;

  const handleAdd = useCallback(() => {
    if (!canAdd) return;

    const agent: AgentConfig = {
      id: `manual-${Date.now()}`,
      name: identificationResult?.suggestedName ?? path.split(/[/\\]/).pop() ?? path,
      icon: identificationResult?.suggestedIcon ?? 'unknown',
      path: path.trim(),
      source: 'manual',
    };

    addAgent(agent);
    onNavigate('ready');
  }, [canAdd, addAgent, onNavigate, identificationResult, path]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <PiLogo size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white">Add Agent Manually</h1>
          <p className="text-slate-400">
            Enter the path to your agent's executable
          </p>
        </div>

        {/* Path Input */}
        <div className="space-y-2">
          <label
            htmlFor="agent-path"
            className="block text-sm font-medium text-slate-300"
          >
            Agent Path
          </label>
          <input
            id="agent-path"
            type="text"
            value={path}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="e.g. /usr/local/bin/claude or C:\Program Files\Agent\agent.exe"
            className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              validationResult && !validationResult.valid
                ? 'border-red-500'
                : validationResult?.valid
                  ? 'border-green-500'
                  : 'border-slate-600'
            }`}
            aria-describedby={validationResult?.error ? 'validation-error' : undefined}
            aria-invalid={validationResult ? !validationResult.valid : undefined}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Validating indicator */}
          {validating && (
            <p className="text-sm text-slate-400" role="status">
              Validating path…
            </p>
          )}

          {/* Validation error */}
          {validationResult && !validationResult.valid && validationResult.error && (
            <p
              id="validation-error"
              className="text-sm text-red-400"
              role="alert"
            >
              {validationResult.error}
            </p>
          )}
        </div>

        {/* Identification result */}
        {identificationResult && (
          <div
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
            role="region"
            aria-label="Detected agent information"
          >
            <div className="flex items-center gap-3">
              <AgentIcon iconKey={identificationResult.suggestedIcon} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white truncate">
                  {identificationResult.suggestedName}
                </div>
                <span
                  className={`text-xs font-medium ${CONFIDENCE_COLORS[identificationResult.confidence]}`}
                >
                  Confidence: {identificationResult.confidence}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Identifying indicator */}
        {isIdentifying && (
          <p className="text-sm text-slate-400" role="status">
            Identifying agent…
          </p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add this agent to your dashboard"
          >
            Add to Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('results')}
            onKeyDown={(e) => handleKeyDown(e, () => onNavigate('results'))}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Go back to results"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
