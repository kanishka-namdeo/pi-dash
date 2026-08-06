import { usePiPContext } from '../../context/PiPContext';
import { TerminalView } from '../terminal/TerminalView';
import { Dashboard } from '../dashboard/Dashboard';

export function MainTerminal() {
  const { state } = usePiPContext();

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
