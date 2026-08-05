import { createContext, useContext, type ReactNode } from 'react';
import { usePiP } from '../hooks/usePiP';
import type { PiPState, PiPActions } from '../types/pip';

type PiPContextValue = {
  state: PiPState;
  actions: PiPActions;
};

const PiPContext = createContext<PiPContextValue | null>(null);

export function PiPProvider({ children }: { children: ReactNode }) {
  const pip = usePiP();
  return <PiPContext.Provider value={pip}>{children}</PiPContext.Provider>;
}

export function usePiPContext(): PiPContextValue {
  const context = useContext(PiPContext);
  if (!context) {
    throw new Error('usePiPContext must be used within PiPProvider');
  }
  return context;
}
