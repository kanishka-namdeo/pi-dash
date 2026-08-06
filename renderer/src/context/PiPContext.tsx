import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePiP } from '../hooks/usePiP';
import type { PiPState, PiPActions } from '../types/pip';

type PiPContextValue = {
  state: PiPState;
  actions: PiPActions;
};

const PiPContext = createContext<PiPContextValue | null>(null);

export function PiPProvider({ children }: { children: ReactNode }) {
  const pip = usePiP();
  const value = useMemo(() => pip, [pip.state, pip.actions]);
  return <PiPContext.Provider value={value}>{children}</PiPContext.Provider>;
}

export function usePiPContext(): PiPContextValue {
  const context = useContext(PiPContext);
  if (!context) {
    throw new Error('usePiPContext must be used within PiPProvider');
  }
  return context;
}
