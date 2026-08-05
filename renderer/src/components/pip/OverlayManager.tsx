import { usePiPContext } from '../../context/PiPContext';
import { AgentOverlay } from './AgentOverlay';
import { useSessionState } from '../../hooks/useSessionState';

export function OverlayManager() {
  const { state } = usePiPContext();
  const { sessions } = useSessionState();

  if (state.overlays.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 40 }}
    >
      {state.overlays.map((overlay) => {
        const session = sessions.get(overlay.agentId);
        const agentStatus = session?.state || 'idle';

        return (
          <div key={overlay.agentId} className="pointer-events-auto">
            <AgentOverlay
              overlay={overlay}
              agentName={overlay.agentId}
              agentStatus={agentStatus}
            />
          </div>
        );
      })}
    </div>
  );
}
