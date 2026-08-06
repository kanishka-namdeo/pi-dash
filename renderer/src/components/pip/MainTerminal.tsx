import { useEffect } from 'react';
import { usePiPContext } from '../../context/PiPContext';
import { useSessionContext } from '../../context/SessionContext';
import { TerminalView } from '../terminal/TerminalView';
import { Dashboard } from '../dashboard/Dashboard';
export function MainTerminal() {
  const { state, actions } = usePiPContext();
  const ctx = useSessionContext();

  useEffect(() => {
    if (!state.mainAgentId) return;
    const session = ctx.getSession(state.mainAgentId);
    if (!session || session.state !== 'running') {
      actions.setMainAgent(null);
    }
  }, [state.mainAgentId, ctx, actions]);

  if (!state.mainAgentId) {
    return <Dashboard />;
  }

  if (state.viewMode === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <div className="w-full h-full">
      <TerminalView agentId={state.mainAgentId} />
    </div>
  );
}
