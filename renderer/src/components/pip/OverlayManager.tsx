import { usePiPContext } from '../../context/PiPContext';
import { AgentOverlay } from './AgentOverlay';

export function OverlayManager() {
  const { state } = usePiPContext();

  if (state.overlays.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 40 }}
    >
      {state.overlays.map((overlay) => (
        <div key={overlay.agentId} className="pointer-events-auto">
          <AgentOverlay
            overlay={overlay}
            agentName={overlay.agentId}
          />
        </div>
      ))}
    </div>
  );
}
