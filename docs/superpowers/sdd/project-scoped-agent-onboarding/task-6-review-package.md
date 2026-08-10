# Sub-project B Task 6 Review Package

## Commits
```
1aea8ef0 feat: show project-scoped agents with promote button in ConfigureAgentsDialog
```

## Diff Stat
```
 renderer/src/components/dashboard/ConfigureAgentsDialog.tsx | ~80 lines changed
 1 file modified
```

## Summary
Task 6 enhances ConfigureAgentsDialog to show project-scoped agents and allow promoting them to global config.

## Changes Made
- Imported mergeAgents utility from Task 2
- Get projectAgents from activeProject
- Compute allAgents by merging global and project agents
- Added "Project-Specific Agents" section with promote button
- Added promoteToGlobal function that:
  - Fetches current global agents
  - Saves project agent to global config
  - Removes agent from project.projectAgents
  - Shows success toast
  - Calls onSaved to refresh

## Features
- Shows both global and project-scoped agents
- Project-scoped agents have "Promote to Global" button
- Promote uses two IPC calls (saveAgents + updateProject) — not atomic but acceptable
- Error handling with toast notifications

## Files Modified
- `renderer/src/components/dashboard/ConfigureAgentsDialog.tsx` (~80 lines changed)
