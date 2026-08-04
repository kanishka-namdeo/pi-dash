import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agent/:agentId" element={<AgentDetailView />} />
        <Route path="/worktrees" element={<WorktreeView />} />
        <Route path="/completed/:agentId" element={<CompletedWorkView />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
