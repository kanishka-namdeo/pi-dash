import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SectionCard } from './SectionCard';
import { Button } from '../ui/button';
import { ResetAction } from './ResetAction';

export function ResetRecoverySettings() {
  const [agentCount, setAgentCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    window.api.getAgents().then(agents => setAgentCount(agents.length));
    window.api.getProjects().then(projects => setProjectCount(projects.length));
  }, []);

  const handleExport = async () => {
    try {
      const result = await window.api.exportConfig();
      if (result.success) {
        toast.success('Configuration exported');
      }
    } catch {
      toast.error('Failed to export configuration. Check disk space.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.importConfig();
      if (result.success) {
        toast.success('Configuration imported. Please restart the app.');
      }
    } catch (err) {
      if (err instanceof Error) {
        switch (err.message) {
          case 'INCOMPATIBLE_VERSION':
            toast.error('Incompatible backup file format.');
            break;
          case 'INVALID_JSON':
            toast.error('Invalid JSON in backup file.');
            break;
          case 'INVALID_AGENTS':
          case 'INVALID_PROJECTS':
          case 'INVALID_ONBOARDING':
            toast.error('Backup file is corrupted or incomplete.');
            break;
          default:
            toast.error('Failed to import configuration. Check disk space.');
        }
      } else {
        toast.error('Failed to import configuration. Check disk space.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Export Configuration">
        <p className="text-sm text-muted-foreground mb-3">
          Backup agents and projects to a JSON file.
        </p>
        <Button onClick={handleExport}>Export...</Button>
      </SectionCard>

      <SectionCard title="Import Configuration">
        <p className="text-sm text-muted-foreground mb-3">
          Restore from a backup file. This will overwrite current config.
        </p>
        <Button onClick={handleImport}>Import...</Button>
      </SectionCard>

      <SectionCard title="Danger Zone">
        <ResetAction
          title="Reset Agents"
          description={`Remove all ${agentCount} agents. Projects will be kept.`}
          impact={`${agentCount} agents`}
          onConfirm={async () => {
            await window.api.resetAgents();
            toast.success('Agents reset.');
            setAgentCount(0);
          }}
        />
        <ResetAction
          title="Reset Projects"
          description={`Remove all ${projectCount} projects. Agents will be kept.`}
          impact={`${projectCount} projects`}
          onConfirm={async () => {
            await window.api.resetProjects();
            toast.success('Projects reset.');
            setProjectCount(0);
          }}
        />
        <ResetAction
          title="Full Reset"
          description={`Remove all ${agentCount} agents and ${projectCount} projects. Onboarding will restart.`}
          impact={`${agentCount} agents and ${projectCount} projects`}
          onConfirm={async () => {
            await window.api.fullReset();
            toast.success('Full reset complete. Restarting...');
          }}
          requireText="RESET"
        />
      </SectionCard>
    </div>
  );
}
