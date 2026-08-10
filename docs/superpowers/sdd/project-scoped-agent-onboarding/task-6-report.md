# Task 6: Enhance ConfigureAgentsDialog

**Status:** DONE

**Commit:** `1aea8ef0`

**Files modified:**
- `renderer/src/components/dashboard/ConfigureAgentsDialog.tsx` (created)

**Changes:**
1. Created ConfigureAgentsDialog component with Dialog/Button/AgentRow UI
2. Imported `mergeAgents` from `../../utils/agentScope`
3. Computes `projectAgents` from `activeProject?.projectAgents || []` and `allAgents` via `mergeAgents(availableAgents, projectAgents)`
4. Renders two sections: "Global Agents" (with checkboxes) and "Project-Specific Agents" (with checkboxes + "Promote to Global" button)
5. `promoteToGlobal` function: fetches existing global agents, appends the project agent, saves, then removes from project's `projectAgents` via `updateProject`
6. Error handling with toast on promote failure

**Props interface (matches Dashboard.tsx usage):**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `activeProject: Project | null`
- `availableAgents: AgentConfig[]`
- `onSaved: (selectedAgents: string[]) => void`

**Concerns:** None.
