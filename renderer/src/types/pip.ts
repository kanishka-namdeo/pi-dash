export type OverlaySize = 'S' | 'M' | 'L';

export type Overlay = {
  agentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  size: OverlaySize;
};

export type SizePreset = {
  width: number;
  height: number;
};

export type SizePresets = Record<OverlaySize, SizePreset>;

export const SIZE_PRESETS: SizePresets = {
  S: { width: 280, height: 180 },
  M: { width: 400, height: 260 },
  L: { width: 560, height: 360 },
};

export type OverlayContentMode = 'minimal' | 'preview' | 'rich';

export type PiPState = {
  mainAgentId: string | null;
  overlays: Overlay[];
  nextZIndex: number;
};

export type PiPActions = {
  setMainAgent: (agentId: string | null) => void;
  addOverlay: (agentId: string) => void;
  removeOverlay: (agentId: string) => void;
  promoteToMain: (agentId: string) => void;
  updateOverlayPosition: (agentId: string, x: number, y: number) => void;
  updateOverlaySize: (agentId: string, width: number, height: number, size: OverlaySize) => void;
  bringOverlayToFront: (agentId: string) => void;
};
