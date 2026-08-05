export const PIP_STORAGE_KEY = 'pidash:pip-state';

export type PersistedPiPOverlay = {
  agentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PersistedPiPState = {
  mainAgentId: string;
  overlays: PersistedPiPOverlay[];
};

export function savePiPState(state: PersistedPiPState): void {
  localStorage.setItem(PIP_STORAGE_KEY, JSON.stringify(state));
}

export function loadPiPState(): PersistedPiPState | null {
  const data = localStorage.getItem(PIP_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as PersistedPiPState;
  } catch {
    return null;
  }
}

export function clearPiPState(): void {
  localStorage.removeItem(PIP_STORAGE_KEY);
}
