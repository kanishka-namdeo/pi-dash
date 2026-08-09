import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentConfig, AgentValidation, DriftReport } from '../../../src/shared/types';

export interface UseAgentScannerOptions {
  mode: 'initial' | 'incremental' | 'revalidate' | 'background';
  existingAgents?: AgentConfig[];
  autoStart?: boolean;
  onComplete?: (result: ScanResult) => void;
  onError?: (error: Error) => void;
}

export interface ScanResult {
  agents: AgentConfig[];
  newAgents?: AgentConfig[];
  validations?: AgentValidation[];
  drift?: DriftReport;
  scanDuration: number;
  locationsScanned: number;
}

export function useAgentScanner(options: UseAgentScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const scan = useCallback(async () => {
    // Cancel any existing scan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsScanning(true);
    setError(null);

    try {
      const scanResponse = await window.api.scanAgents();

      // Check if scan was cancelled
      if (controller.signal.aborted) {
        return;
      }

      const agents = scanResponse.agents;

      let newAgents: AgentConfig[] | undefined;
      let validations: AgentValidation[] | undefined;
      let drift: DriftReport | undefined;

      if (options.mode === 'incremental' && options.existingAgents) {
        const existingIds = new Set(options.existingAgents.map(a => a.id));
        newAgents = agents.filter(a => !existingIds.has(a.id));
      }

      if (options.mode === 'revalidate' && options.existingAgents) {
        validations = await Promise.all(
          options.existingAgents.map(async (agent) => {
            const validation = await window.api.validateAgent(agent.path);
            if (validation.valid) {
              return { agent, status: 'valid' as const };
            }
            const found = await window.api.findAgentInPath(agent.name.toLowerCase());
            if (found.found && found.path) {
              return { agent, status: 'moved' as const, newPath: found.path };
            }
            return { agent, status: 'missing' as const };
          })
        );
      }

      if (controller.signal.aborted) return;

      if (options.mode === 'background' && options.existingAgents) {
        const existingIds = new Set(options.existingAgents.map(a => a.id));
        const scannedIds = new Set(agents.map(a => a.id));

        const newAgentsList = agents.filter(a => !existingIds.has(a.id));
        const missingAgentsList = options.existingAgents.filter(a => !scannedIds.has(a.id));

        const movedAgents: AgentValidation[] = [];
        const trulyMissing: AgentConfig[] = [];

        for (const agent of missingAgentsList) {
          const found = await window.api.findAgentInPath(agent.name.toLowerCase());
          if (found.found && found.path) {
            movedAgents.push({ agent, status: 'moved', newPath: found.path });
          } else {
            trulyMissing.push(agent);
          }
        }

        drift = {
          newAgents: newAgentsList,
          missingAgents: trulyMissing,
          movedAgents,
        };
      }

      if (controller.signal.aborted) return;

      const scanResult: ScanResult = {
        agents,
        newAgents,
        validations,
        drift,
        scanDuration: scanResponse.duration,
        locationsScanned: scanResponse.locationsScanned,
      };

      setResult(scanResult);
      options.onComplete?.(scanResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Scan failed');
      setError(error);
      options.onError?.(error);
    } finally {
      setIsScanning(false);
    }
  }, [options]);

  return { scan, isScanning, error, result };
}
