import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionState, CommandBlock } from '../types/session';
import { createMockPTY, type MockPTY } from '../lib/mockPTY';
import { saveSession, loadSession } from '../lib/sessionStore';
import type { AgentConfig } from '../types/session';

export type UseAgentSessionReturn = {
  state: SessionState;
  blocks: CommandBlock[];
  currentInput: string;
  
  submitCommand: (command: string) => void;
  pause: () => void;
  resume: () => void;
  kill: () => void;
  restart: () => void;
  clearHistory: () => void;
  setInput: (input: string) => void;
  
  toggleCollapse: (blockId: string) => void;
  
  historyBack: () => string | null;
  historyForward: () => string | null;
};

export function useAgentSession(agentId: string): UseAgentSessionReturn {
  const [state, setState] = useState<SessionState>('idle');
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  
  const ptyRef = useRef<MockPTY | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const historyIndexRef = useRef(-1);
  
  // Initialize PTY and restore session
  useEffect(() => {
    const config: AgentConfig = {
      id: agentId,
      name: agentId,
      icon: agentId,
      path: `/mock/${agentId}`,
      source: 'detected',
    };
    
    const pty = createMockPTY(agentId, config);
    ptyRef.current = pty;
    
    // Restore persisted session
    const saved = loadSession(agentId);
    if (saved) {
      setState(saved.state === 'working' ? 'waiting' : saved.state);
      setBlocks(saved.history.map(h => ({ ...h, isCollapsed: false })));
    }
    // Subscribe to PTY state changes
    pty.onStateChange((newState) => {
      setState(newState);
    });
    
    // Sync blocks from PTY history after data events
    let prevHistoryLen = pty.getHistory().length;
    
    pty.onData((_data) => {
      setTimeout(() => {
        const currentHistory = pty.getHistory();
        if (currentHistory.length > prevHistoryLen) {
          const newBlocks = currentHistory.slice(prevHistoryLen);
          setBlocks(prev => [
            ...prev,
            ...newBlocks.map(b => ({ ...b, isCollapsed: false })),
          ]);
          prevHistoryLen = currentHistory.length;
        }
      }, 0);
    });
    
    return () => {
      // Cleanup: flush pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [agentId]);
  
  // Debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      if (ptyRef.current) {
        const history = blocks.map(({ isCollapsed, ...rest }) => rest);
        saveSession(agentId, {
          state,
          history,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        });
      }
    }, 1000);
  }, [agentId, blocks, state]);
  
  // Save on state change
  useEffect(() => {
    scheduleSave();
  }, [state, scheduleSave]);
  
  const submitCommand = useCallback((command: string) => {
    if (ptyRef.current && (state === 'idle' || state === 'waiting')) {
      ptyRef.current.start();
      ptyRef.current.write(command);
      setCurrentInput('');
      historyIndexRef.current = -1;
    }
  }, [state]);
  
  const pause = useCallback(() => {
    ptyRef.current?.pause();
  }, []);
  
  const resume = useCallback(() => {
    ptyRef.current?.resume();
  }, []);
  
  const kill = useCallback(() => {
    ptyRef.current?.kill();
  }, []);
  
  const restart = useCallback(() => {
    ptyRef.current?.restart();
    setBlocks([]);
    setState('idle');
    historyIndexRef.current = -1;
  }, []);
  
  const clearHistory = useCallback(() => {
    ptyRef.current?.clearHistory();
    setBlocks([]);
  }, []);
  
  const setInput = useCallback((input: string) => {
    setCurrentInput(input);
  }, []);
  
  const toggleCollapse = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, isCollapsed: !b.isCollapsed } : b
    ));
  }, []);
  const historyBack = useCallback((): string | null => {
    const commands = blocks.map(b => b.command);
    if (commands.length === 0) return null;
    
    const newIndex = Math.min(historyIndexRef.current + 1, commands.length - 1);
    historyIndexRef.current = newIndex;
    return commands[commands.length - 1 - newIndex];
  }, [blocks]);
  
  const historyForward = useCallback((): string | null => {
    if (historyIndexRef.current <= 0) {
      historyIndexRef.current = -1;
      return '';
    }
    
    const commands = blocks.map(b => b.command);
    const newIndex = historyIndexRef.current - 1;
    historyIndexRef.current = newIndex;
    return commands[commands.length - 1 - newIndex];
  }, [blocks]);
  
  return {
    state,
    blocks,
    currentInput,
    submitCommand,
    pause,
    resume,
    kill,
    restart,
    clearHistory,
    setInput,
    toggleCollapse,
    historyBack,
    historyForward,
  };
}
