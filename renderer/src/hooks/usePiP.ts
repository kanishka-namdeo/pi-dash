import { useState, useCallback } from 'react';
import type { Overlay, OverlaySize, PiPState, PiPActions } from '../types/pip';
import { SIZE_PRESETS } from '../types/pip';

export function usePiP(): { state: PiPState; actions: PiPActions } {
  const [state, setState] = useState<PiPState>({
    mainAgentId: null,
    overlays: [],
    nextZIndex: 10,
  });

  const setMainAgent = useCallback((agentId: string | null) => {
    setState(prev => ({ ...prev, mainAgentId: agentId }));
  }, []);

  const addOverlay = useCallback((agentId: string) => {
    setState(prev => {
      if (prev.mainAgentId === agentId) return prev;
      if (prev.overlays.some(o => o.agentId === agentId)) return prev;

      const preset = SIZE_PRESETS.M;
      const newOverlay: Overlay = {
        agentId,
        x: 100 + prev.overlays.length * 30,
        y: 100 + prev.overlays.length * 30,
        width: preset.width,
        height: preset.height,
        zIndex: prev.nextZIndex,
        size: 'M',
      };

      return {
        ...prev,
        overlays: [...prev.overlays, newOverlay],
        nextZIndex: prev.nextZIndex + 10,
      };
    });
  }, []);

  const removeOverlay = useCallback((agentId: string) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.filter(o => o.agentId !== agentId),
    }));
  }, []);

  const promoteToMain = useCallback((agentId: string) => {
    setState(prev => {
      const overlay = prev.overlays.find(o => o.agentId === agentId);
      if (!overlay) return prev;

      const oldMainId = prev.mainAgentId;
      const newOverlays = prev.overlays.filter(o => o.agentId !== agentId);

      if (oldMainId) {
        const preset = SIZE_PRESETS.M;
        const demotedOverlay: Overlay = {
          agentId: oldMainId,
          x: overlay.x,
          y: overlay.y,
          width: preset.width,
          height: preset.height,
          zIndex: prev.nextZIndex,
          size: 'M',
        };
        newOverlays.push(demotedOverlay);
      }

      return {
        mainAgentId: agentId,
        overlays: newOverlays,
        nextZIndex: prev.nextZIndex + 10,
      };
    });
  }, []);

  const updateOverlayPosition = useCallback((agentId: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, x, y } : o
      ),
    }));
  }, []);

  const updateOverlaySize = useCallback((agentId: string, width: number, height: number, size: OverlaySize) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, width, height, size } : o
      ),
    }));
  }, []);

  const bringOverlayToFront = useCallback((agentId: string) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, zIndex: prev.nextZIndex } : o
      ),
      nextZIndex: prev.nextZIndex + 10,
    }));
  }, []);

  const actions: PiPActions = {
    setMainAgent,
    addOverlay,
    removeOverlay,
    promoteToMain,
    updateOverlayPosition,
    updateOverlaySize,
    bringOverlayToFront,
  };

  return { state, actions };
}
