import type { SessionState, CommandBlock } from '../types/session';
import type { AgentConfig } from '../types/session';
import { getMockResponse } from './mockResponses';

export type MockPTY = {
  agentId: string;
  state: SessionState;
  
  write(input: string): void;
  onData(callback: (data: string) => void): void;
  onStateChange(callback: (state: SessionState) => void): void;
  
  start(): void;
  pause(): void;
  resume(): void;
  kill(): void;
  restart(): void;
  
  getHistory(): CommandBlock[];
  clearHistory(): void;
};

export function createMockPTY(agentId: string, config: AgentConfig): MockPTY {
  let state: SessionState = 'idle';
  let pendingTimer: number | undefined;
  const history: CommandBlock[] = [];
  const dataCallbacks: ((data: string) => void)[] = [];
  const stateCallbacks: ((state: SessionState) => void)[] = [];
  
  function setState(newState: SessionState) {
    state = newState;
    stateCallbacks.forEach(cb => cb(newState));
  }
  
  function emitData(data: string) {
    dataCallbacks.forEach(cb => cb(data));
  }
  
  return {
    agentId,
    get state() {
      return state;
    },
    
    write(input: string) {
      if (state !== 'waiting' && state !== 'idle') {
        return; // Can't write in other states
      }
      
      setState('working');
      emitData(`$ ${input}\n`);
      
      const { response, delay } = getMockResponse(agentId, input);
      const delayMs = delay.min + Math.random() * (delay.max - delay.min);
      
      pendingTimer = setTimeout(() => {
        emitData(response + '\n');
        
        const block: CommandBlock = {
          id: crypto.randomUUID(),
          command: input,
          timestamp: Date.now(),
          output: response,
          isMultiLine: response.includes('\n'),
          isCollapsed: false,
        };
        
        pendingTimer = undefined;
        history.push(block);
      }, delayMs);
    },
    
    onData(callback: (data: string) => void) {
      dataCallbacks.push(callback);
    },
    
    onStateChange(callback: (state: SessionState) => void) {
      stateCallbacks.push(callback);
    },
    
    start() {
      setState('waiting');
    },
    
    pause() {
      if (state === 'working' || state === 'waiting') {
        setState('paused');
      }
    },
    
    resume() {
      if (state === 'paused') {
        setState('waiting');
      }
    },
    
    kill() {
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer);
        pendingTimer = undefined;
      }
      setState('killed');
    },
    
    restart() {
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer);
        pendingTimer = undefined;
      }
      history.length = 0;
      setState('idle');
    },
    
    getHistory() {
      return [...history];
    },
    
    clearHistory() {
      history.length = 0;
    },
  };
}
