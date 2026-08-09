import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentScanner } from './useAgentScanner';
import type { AgentConfig } from '../../../src/shared/types';

describe('useAgentScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        scanAgents: vi.fn(),
        validateAgent: vi.fn(),
        findAgentInPath: vi.fn(),
      },
      writable: true,
    });
  });

  describe('initial mode', () => {
    it('returns all scanned agents', async () => {
      const mockAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: mockAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() => useAgentScanner({ mode: 'initial' }));

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.agents).toEqual(mockAgents);
      expect(result.current.result?.scanDuration).toBe(100);
      expect(result.current.result?.locationsScanned).toBe(5);
    });

    it('sets isScanning correctly during scan', async () => {
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 0,
        duration: 50,
      });

      const { result } = renderHook(() => useAgentScanner({ mode: 'initial' }));

      expect(result.current.isScanning).toBe(false);

      let scanPromise: Promise<void>;
      act(() => {
        scanPromise = result.current.scan();
      });

      expect(result.current.isScanning).toBe(true);

      await act(async () => {
        await scanPromise;
      });

      expect(result.current.isScanning).toBe(false);
    });

    it('handles scan errors', async () => {
      const testError = new Error('Scan failed');
      window.api.scanAgents = vi.fn().mockRejectedValue(testError);

      const onError = vi.fn();
      const { result } = renderHook(() => useAgentScanner({ mode: 'initial', onError }));

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.error).toBe(testError);
      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('calls onComplete callback', async () => {
      const mockAgents: AgentConfig[] = [
        { id: 'test', name: 'Test', path: '/test', icon: 'test', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: mockAgents,
        warnings: [],
        locationsScanned: 3,
        duration: 75,
      });

      const onComplete = vi.fn();
      const { result } = renderHook(() => useAgentScanner({ mode: 'initial', onComplete }));

      await act(async () => {
        await result.current.scan();
      });

      expect(onComplete).toHaveBeenCalledWith(result.current.result);
    });
  });

  describe('incremental mode', () => {
    it('computes correct diff of new agents', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      const scannedAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
        { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: scannedAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'incremental', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.newAgents).toHaveLength(1);
      expect(result.current.result?.newAgents?.[0].id).toBe('aider');
    });

    it('returns empty newAgents when no new agents found', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: existingAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'incremental', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.newAgents).toHaveLength(0);
    });

    it('returns undefined newAgents when existingAgents is not provided', async () => {
      const scannedAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: scannedAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'incremental' })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.newAgents).toBeUndefined();
    });

    it('returns all scanned agents as new when existingAgents is empty', async () => {
      const scannedAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
        { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: scannedAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'incremental', existingAgents: [] })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.newAgents).toHaveLength(2);
      expect(result.current.result?.newAgents?.map(a => a.id)).toEqual(['omp', 'aider']);
    });

    it('returns empty newAgents when scan finds no agents', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'incremental', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.newAgents).toHaveLength(0);
    });
  });

  describe('revalidate mode', () => {
    it('validates all existing agents', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
        { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 0,
        duration: 50,
      });
      window.api.validateAgent = vi.fn()
        .mockResolvedValueOnce({ valid: true })
        .mockResolvedValueOnce({ valid: false });
      window.api.findAgentInPath = vi.fn().mockResolvedValue({ found: false });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'revalidate', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.validations).toHaveLength(2);
      expect(result.current.result?.validations?.[0].status).toBe('valid');
      expect(result.current.result?.validations?.[1].status).toBe('missing');
    });

    it('detects moved agents', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/old/path/omp', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 0,
        duration: 50,
      });
      window.api.validateAgent = vi.fn().mockResolvedValue({ valid: false });
      window.api.findAgentInPath = vi.fn().mockResolvedValue({
        found: true,
        path: '/new/path/omp',
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'revalidate', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.validations?.[0].status).toBe('moved');
      expect(result.current.result?.validations?.[0].newPath).toBe('/new/path/omp');
    });
  });

  describe('background mode', () => {
    it('detects drift: new, missing, and moved agents', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
        { id: 'old-agent', name: 'Old Agent', path: '/old/path', icon: 'old', cwd: '/', source: 'detected' },
      ];
      const scannedAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '/', source: 'detected' },
        { id: 'new-agent', name: 'New Agent', path: '/new/path', icon: 'new', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: scannedAgents,
        warnings: [],
        locationsScanned: 5,
        duration: 100,
      });
      window.api.findAgentInPath = vi.fn().mockResolvedValue({ found: false });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'background', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.drift?.newAgents).toHaveLength(1);
      expect(result.current.result?.drift?.newAgents?.[0].id).toBe('new-agent');
      expect(result.current.result?.drift?.missingAgents).toHaveLength(1);
      expect(result.current.result?.drift?.missingAgents?.[0].id).toBe('old-agent');
      expect(result.current.result?.drift?.movedAgents).toHaveLength(0);
    });

    it('detects moved agents in background mode', async () => {
      const existingAgents: AgentConfig[] = [
        { id: 'omp', name: 'OMP', path: '/old/path', icon: 'omp', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 0,
        duration: 50,
      });
      window.api.findAgentInPath = vi.fn().mockResolvedValue({
        found: true,
        path: '/new/path',
      });

      const { result } = renderHook(() =>
        useAgentScanner({ mode: 'background', existingAgents })
      );

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.result?.drift?.movedAgents).toHaveLength(1);
      expect(result.current.result?.drift?.movedAgents?.[0].status).toBe('moved');
      expect(result.current.result?.drift?.movedAgents?.[0].newPath).toBe('/new/path');
      expect(result.current.result?.drift?.missingAgents).toHaveLength(0);
    });
  });

  describe('abort handling', () => {
    it('cancels previous scan when new one starts', async () => {
      const { promise: firstPromise, resolve: resolveFirst } = Promise.withResolvers<{
        agents: AgentConfig[];
        warnings: string[];
        locationsScanned: number;
        duration: number;
      }>();

      window.api.scanAgents = vi.fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce({
          agents: [{ id: 'second', name: 'Second', path: '/second', icon: 's', cwd: '/', source: 'detected' }],
          warnings: [],
          locationsScanned: 1,
          duration: 50,
        });

      const { result } = renderHook(() => useAgentScanner({ mode: 'initial' }));

      // Start first scan
      act(() => {
        result.current.scan();
      });

      // Start second scan before first completes
      await act(async () => {
        const secondScan = result.current.scan();
        resolveFirst({
          agents: [{ id: 'first', name: 'First', path: '/first', icon: 'f', cwd: '/', source: 'detected' }],
          warnings: [],
          locationsScanned: 1,
          duration: 100,
        });
        await secondScan;
      });

      // Should have result from second scan, not first
      expect(result.current.result?.agents[0].id).toBe('second');
    });
  });

  describe('autoStart', () => {
    it('automatically calls scan on mount when autoStart is true', async () => {
      const mockAgents: AgentConfig[] = [
        { id: 'auto', name: 'Auto', path: '/auto', icon: 'auto', cwd: '/', source: 'detected' },
      ];
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: mockAgents,
        warnings: [],
        locationsScanned: 2,
        duration: 50,
      });

      const { result } = renderHook(() => useAgentScanner({ mode: 'initial', autoStart: true }));

      await waitFor(() => {
        expect(result.current.result?.agents).toEqual(mockAgents);
      });

      expect(window.api.scanAgents).toHaveBeenCalledTimes(1);
    });

    it('does not auto-scan when autoStart is false', async () => {
      window.api.scanAgents = vi.fn().mockResolvedValue({
        agents: [],
        warnings: [],
        locationsScanned: 0,
        duration: 0,
      });

      renderHook(() => useAgentScanner({ mode: 'initial', autoStart: false }));

      // Give a tick for any potential auto-start to fire
      await act(async () => {});

      expect(window.api.scanAgents).not.toHaveBeenCalled();
    });
  });
});
